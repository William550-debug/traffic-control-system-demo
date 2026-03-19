'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Car, Bus, AlertTriangle, Clock, TrendingUp, Activity,
    X, ChevronRight, MapPin, Gauge, Zap, Navigation,
    Eye, EyeOff, Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
    VehiclePosition, FlaggedVehicle, CongestedRoad, MapStats,
} from '@/hooks/use-map-intelligence';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapIntelligenceOverlayProps {
    vehicles:        VehiclePosition[];
    flaggedVehicles: FlaggedVehicle[];
    newFlag:         FlaggedVehicle | null;
    dismissFlag:     (plate: string) => void;
    congestedRoads:  CongestedRoad[];
    mapStats:        MapStats;
    // Map viewport — needed to convert lat/lng → pixel coords
    mapBounds?:      { minLat: number; maxLat: number; minLng: number; maxLng: number };
    containerWidth:  number;
    containerHeight: number;
}

// ─── Default CBD viewport bounds for coordinate projection ───────────────────

const DEFAULT_BOUNDS = {
    minLat: -1.312,
    maxLat: -1.265,
    minLng: 36.795,
    maxLng: 36.855,
};

// ─── Coord → pixel projection ─────────────────────────────────────────────────

function project(
    lat: number, lng: number,
    bounds: typeof DEFAULT_BOUNDS,
    w: number, h: number,
): [number, number] {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * w;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * h;
    return [x, y];
}

// ─── Congestion color ─────────────────────────────────────────────────────────

function congestionColor(level: number): string {
    if (level >= 80) return '#ff3b3b';
    if (level >= 60) return '#ff8800';
    if (level >= 40) return '#f5c518';
    return '#50c878';
}

function congestionOpacity(level: number): number {
    return 0.35 + (level / 100) * 0.5;
}

// ─── Vehicle icon by type ─────────────────────────────────────────────────────

function VehicleIcon({
                         type, color, status, heading, size = 14,
                     }: {
    type:    VehiclePosition['type'];
    color:   string;
    status:  VehiclePosition['status'];
    heading: number;
    size?:   number;
}) {
    const pulseColor = status === 'stopped' ? '#ff3b3b' : status === 'slow' ? '#f5c518' : color;

    return (
        <g>
            {/* Glow ring for congested/slow vehicles */}
            {status !== 'moving' && (
                <circle r={size * 0.85} fill="none" stroke={pulseColor} strokeWidth="1.5" opacity="0.4">
                    <animate attributeName="r" values={`${size * 0.85};${size * 1.4};${size * 0.85}`} dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
                </circle>
            )}

            {/* Vehicle body */}
            {type === 'bus' || type === 'matatu' ? (
                // Bus/matatu: rounded rect
                <rect
                    x={-size * 0.45}
                    y={-size * 0.7}
                    width={size * 0.9}
                    height={size * 1.4}
                    rx={size * 0.2}
                    fill={color}
                    fillOpacity={0.92}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="0.8"
                />
            ) : type === 'truck' ? (
                // Truck: wider rectangle
                <rect
                    x={-size * 0.55}
                    y={-size * 0.65}
                    width={size * 1.1}
                    height={size * 1.3}
                    rx={size * 0.15}
                    fill={color}
                    fillOpacity={0.92}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="0.8"
                />
            ) : (
                // Car: sleek teardrop shape pointing up
                <path
                    d={`M0,${-size * 0.72} C${size * 0.4},${-size * 0.72} ${size * 0.48},${-size * 0.1} ${size * 0.48},${size * 0.3} L${size * 0.32},${size * 0.72} L${-size * 0.32},${size * 0.72} L${-size * 0.48},${size * 0.3} C${-size * 0.48},${-size * 0.1} ${-size * 0.4},${-size * 0.72} 0,${-size * 0.72}Z`}
                    fill={color}
                    fillOpacity={0.92}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="0.8"
                />
            )}

            {/* Direction chevron on roof */}
            <path
                d={`M0,${-size * 0.35} L${size * 0.22},${size * 0.05} L0,${-size * 0.05} L${-size * 0.22},${size * 0.05}Z`}
                fill="rgba(255,255,255,0.6)"
            />
        </g>
    );
}

// ─── Animated direction arrow along a road ────────────────────────────────────

function DirectionArrow({
                            x1, y1, x2, y2,
                            color, delay = 0,
                        }: {
    x1: number; y1: number; x2: number; y2: number;
    color: string; delay?: number;
}) {
    const dx     = x2 - x1;
    const dy     = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 10) return null;

    const dashLen  = 12;
    const gapLen   = 20;
    const duration = 1.6;

    return (
        <g>
            <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={color}
                strokeWidth="2"
                strokeOpacity="0.55"
                strokeDasharray={`${dashLen} ${gapLen}`}
                strokeLinecap="round"
            >
                <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to={`-${dashLen + gapLen}`}
                    dur={`${duration}s`}
                    begin={`${delay}s`}
                    repeatCount="indefinite"
                />
            </line>
        </g>
    );
}

// ─── Individual vehicle on map ────────────────────────────────────────────────

function VehicleMarker({
                           vehicle, x, y, onHover, onLeave, isHovered,
                       }: {
    vehicle:   VehiclePosition;
    x:         number;
    y:         number;
    onHover:   (v: VehiclePosition) => void;
    onLeave:   () => void;
    isHovered: boolean;
}) {
    return (
        <g
            transform={`translate(${x}, ${y}) rotate(${vehicle.heading})`}
            style={{ cursor: 'pointer', transition: 'opacity 0.3s ease' }}
            onMouseEnter={() => onHover(vehicle)}
            onMouseLeave={onLeave}
            opacity={isHovered ? 1 : 0.88}
        >
            <VehicleIcon
                type={vehicle.type}
                color={vehicle.color}
                status={vehicle.status}
                heading={vehicle.heading}
                size={vehicle.type === 'bus' || vehicle.type === 'truck' ? 9 : 7}
            />
        </g>
    );
}

// ─── Vehicle tooltip ──────────────────────────────────────────────────────────

function VehicleTooltip({
                            vehicle, x, y,
                            containerWidth, containerHeight,
                        }: {
    vehicle:         VehiclePosition;
    x:               number;
    y:               number;
    containerWidth:  number;
    containerHeight: number;
}) {
    const flipX = x > containerWidth  * 0.7;
    const flipY = y > containerHeight * 0.7;

    const dwellMins = Math.floor((Date.now() - vehicle.entryTime.getTime()) / 60000);
    const dwellHrs  = Math.floor(dwellMins / 60);
    const dwellRem  = dwellMins % 60;
    const isFlagged = dwellMins >= 180;

    return (
        <foreignObject
            x={flipX ? x - 160 : x + 16}
            y={flipY ? y - 130 : y + 16}
            width="154"
            height="126"
            style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
            <div
                style={{
                    background:   'var(--bg-overlay)',
                    border:       `1px solid ${isFlagged ? 'rgba(255,136,0,0.4)' : 'var(--border-strong)'}`,
                    borderRadius: 10,
                    padding:      '10px 12px',
                    boxShadow:    '0 8px 32px rgba(0,0,0,0.55)',
                    animation:    'slide-in-up 150ms ease',
                    width:        154,
                }}
            >
                {/* Plate + type */}
                <div className="flex items-center gap-1.5 mb-2">
                    <span
                        className="text-[0.58rem] font-bold tracking-wide"
                        style={{ color: vehicle.color, fontFamily: 'var(--font-mono)' }}
                    >
                        {vehicle.plate}
                    </span>
                    <span
                        className="text-[0.44rem] uppercase tracking-widest px-1 py-px rounded-sm"
                        style={{
                            background: `${vehicle.color}18`,
                            border:     `1px solid ${vehicle.color}30`,
                            color:      vehicle.color,
                            fontFamily: 'var(--font-mono)',
                        }}
                    >
                        {vehicle.type}
                    </span>
                    {isFlagged && (
                        <AlertTriangle size={10} style={{ color: '#ff8800', marginLeft: 'auto' }} />
                    )}
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-1">
                    {[
                        { label: 'Speed',  value: `${vehicle.speed} km/h`,      color: vehicle.status === 'stopped' ? '#ff3b3b' : vehicle.status === 'slow' ? '#f5c518' : 'var(--status-online)' },
                        { label: 'Status', value: vehicle.status.toUpperCase(), color: vehicle.status === 'stopped' ? '#ff3b3b' : vehicle.status === 'slow' ? '#f5c518' : 'var(--text-primary)' },
                        { label: 'In CBD', value: dwellHrs > 0 ? `${dwellHrs}h ${dwellRem}m` : `${dwellMins}m`, color: isFlagged ? '#ff8800' : 'var(--text-secondary)' },
                    ].map(row => (
                        <div key={row.label} className="flex items-center justify-between">
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-disabled)' }}>
                                {row.label}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', fontWeight: 700, color: row.color }}>
                                {row.value}
                            </span>
                        </div>
                    ))}
                </div>

                {isFlagged && (
                    <div
                        className="mt-2 flex items-center gap-1 px-2 py-1 rounded-md"
                        style={{
                            background: 'rgba(255,136,0,0.08)',
                            border:     '1px solid rgba(255,136,0,0.25)',
                        }}
                    >
                        <AlertTriangle size={9} style={{ color: '#ff8800', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: '#ff8800', lineHeight: 1.3 }}>
                            CBD dwell &gt;3h — flagged
                        </span>
                    </div>
                )}
            </div>
        </foreignObject>
    );
}

// ─── CBD Dwell Panel ──────────────────────────────────────────────────────────

function CBDDwellPanel({
                           flaggedVehicles,
                           dismissFlag,
                           cbdCount,
                           collapsed,
                           onToggle,
                       }: {
    flaggedVehicles: FlaggedVehicle[];
    dismissFlag:     (plate: string) => void;
    cbdCount:        number;
    collapsed:       boolean;
    onToggle:        () => void;
}) {
    return (
        <div
            style={{
                position:       'absolute',
                bottom:         20,
                left:           20,
                zIndex:         30,
                display:        'flex',
                flexDirection:  'column',
                overflow:       'hidden',
                borderRadius:   16,
                width:          collapsed ? 'auto' : 220,
                background:     'rgba(12,14,20,0.92)',
                border:         `1px solid ${flaggedVehicles.length > 0 ? 'rgba(255,136,0,0.35)' : 'rgba(255,255,255,0.1)'}`,
                boxShadow:      flaggedVehicles.length > 0
                    ? '0 8px 32px rgba(255,136,0,0.12), 0 2px 8px rgba(0,0,0,0.5)'
                    : '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(12px)',
                transition:     'all 300ms ease',
                pointerEvents:  'all',
            }}
        >
            {/* Header */}
            <button
                onClick={onToggle}
                className="flex items-center gap-2 px-3 py-2.5 w-full text-left"
                style={{ background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer' }}
            >
                <div
                    className="flex items-center justify-center rounded-lg shrink-0"
                    style={{
                        width:      26,
                        height:     26,
                        background: flaggedVehicles.length > 0
                            ? 'rgba(255,136,0,0.15)'
                            : 'rgba(59,158,255,0.1)',
                        border: `1px solid ${flaggedVehicles.length > 0 ? 'rgba(255,136,0,0.3)' : 'rgba(59,158,255,0.25)'}`,
                    }}
                >
                    <Car size={12} style={{ color: flaggedVehicles.length > 0 ? '#ff8800' : 'var(--accent-primary)' }} />
                </div>

                {!collapsed && (
                    <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', lineHeight: 1 }}>
                            CBD Dwell Monitor
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text-disabled)', lineHeight: 1 }}>
                            {cbdCount} in zone · {flaggedVehicles.length} flagged
                        </span>
                    </div>
                )}

                {flaggedVehicles.length > 0 && !collapsed && (
                    <div
                        className="shrink-0 flex items-center justify-center rounded-full text-[0.44rem] font-bold tabular-nums"
                        style={{
                            width:      18,
                            height:     18,
                            background: 'rgba(255,136,0,0.2)',
                            border:     '1px solid rgba(255,136,0,0.4)',
                            color:      '#ff8800',
                            fontFamily: 'var(--font-mono)',
                            animation:  'pulse-dot 1.8s ease infinite',
                        }}
                    >
                        {flaggedVehicles.length}
                    </div>
                )}

                <ChevronRight
                    size={11}
                    style={{
                        color:    'var(--text-disabled)',
                        transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                        transition: 'transform 250ms ease',
                        flexShrink: 0,
                    }}
                />
            </button>

            {/* Flagged list */}
            {!collapsed && (
                <div
                    className="flex flex-col"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)', maxHeight: 240, overflowY: 'auto' }}
                >
                    {flaggedVehicles.length === 0 ? (
                        <div className="px-3 py-3 text-center">
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-disabled)' }}>
                                No vehicles exceeding 3h dwell
                            </span>
                        </div>
                    ) : (
                        flaggedVehicles.map(v => {
                            const hrs = Math.floor(v.duration / 60);
                            const mins = v.duration % 60;
                            return (
                                <div
                                    key={v.plate}
                                    className="flex items-center gap-2 px-3 py-2 transition-colors"
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        background: 'rgba(255,136,0,0.03)',
                                    }}
                                >
                                    <div className="flex flex-col gap-[3px] flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', fontWeight: 700, color: '#ff8800', lineHeight: 1 }}>
                                                {v.plate}
                                            </span>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--text-disabled)', textTransform: 'uppercase' }}>
                                                {v.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={8} style={{ color: 'var(--text-disabled)' }} />
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#f5c518', fontWeight: 600 }}>
                                                {hrs}h {mins}m in CBD
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => dismissFlag(v.plate)}
                                        className="flex items-center justify-center rounded-md shrink-0 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                                        style={{ width: 20, height: 20, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer' }}
                                    >
                                        <X size={9} style={{ color: 'var(--text-muted)' }} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

// ─── New flag toast notification ──────────────────────────────────────────────

function FlagToast({ flag, onDismiss }: { flag: FlaggedVehicle; onDismiss: () => void }) {
    const hrs  = Math.floor(flag.duration / 60);
    const mins = flag.duration % 60;

    return (
        <div
            style={{
                position:       'absolute',
                bottom:         20,
                left:           '50%',
                transform:      'translateX(-50%)',
                zIndex:         40,
                display:        'flex',
                alignItems:     'center',
                gap:            12,
                padding:        '12px 16px',
                borderRadius:   16,
                background:     'rgba(12,14,20,0.95)',
                border:         '1px solid rgba(255,136,0,0.45)',
                boxShadow:      '0 8px 32px rgba(255,136,0,0.2), 0 2px 8px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(12px)',
                animation:      'slide-in-up 250ms ease',
                minWidth:       260,
                maxWidth:       320,
                pointerEvents:  'all',
            }}
        >
            <div
                className="flex items-center justify-center shrink-0 rounded-xl"
                style={{ width: 32, height: 32, background: 'rgba(255,136,0,0.15)', border: '1px solid rgba(255,136,0,0.35)' }}
            >
                <AlertTriangle size={15} style={{ color: '#ff8800' }} />
            </div>
            <div className="flex flex-col gap-[4px] flex-1 min-w-0">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, color: '#ff8800', lineHeight: 1 }}>
                    Vehicle Dwell Alert
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{flag.plate}</strong>{' '}
                    ({flag.type}) has been in CBD for{' '}
                    <strong style={{ color: '#f5c518' }}>{hrs}h {mins}m</strong>
                </span>
            </div>
            <button
                onClick={onDismiss}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
            >
                <X size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
        </div>
    );
}

// ─── Live stats HUD ───────────────────────────────────────────────────────────

function StatsHUD({ stats, showLayers, onToggleLayers }: {
    stats:          MapStats;
    showLayers:     boolean;
    onToggleLayers: () => void;
}) {
    const congestionPct = Math.round((stats.congestedSegments / 6) * 100);

    return (
        <div
            style={{
                position:      'absolute',
                top:           16,
                left:          16,      // ← top-LEFT, away from MapControls (top-right)
                zIndex:        30,
                display:       'flex',
                flexDirection: 'column',
                gap:           8,
                minWidth:      168,
                maxWidth:      192,
                pointerEvents: 'all',
            }}
        >
            {/* Stat cards row */}
            <div
                className="flex flex-col gap-1.5 p-3 rounded-2xl"
                style={{
                    background:     'rgba(12,14,20,0.9)',
                    border:         '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                    boxShadow:      '0 8px 32px rgba(0,0,0,0.4)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: 'var(--status-online)', boxShadow: '0 0 4px var(--status-online)', animation: 'pulse-dot 1.5s ease infinite' }}
                        />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>
                            Map Intelligence
                        </span>
                    </div>
                    <button
                        onClick={onToggleLayers}
                        className="flex items-center justify-center rounded-md transition-colors"
                        style={{
                            width:      20,
                            height:     20,
                            background: showLayers ? 'rgba(59,158,255,0.15)' : 'transparent',
                            border:     `1px solid ${showLayers ? 'rgba(59,158,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            cursor:     'pointer',
                        }}
                        title={showLayers ? 'Hide layers' : 'Show layers'}
                    >
                        <Layers size={10} style={{ color: showLayers ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                    </button>
                </div>

                {/* Stats */}
                {[
                    { label: 'Vehicles',   value: stats.totalVehicles,      color: 'var(--accent-primary)',   icon: Car     },
                    { label: 'Avg Speed',  value: `${stats.avgSpeed} km/h`, color: 'var(--status-online)',    icon: Gauge   },
                    { label: 'Congested',  value: `${stats.congestedSegments} roads`, color: stats.congestedSegments >= 4 ? '#ff3b3b' : '#ff8800', icon: Activity },
                    { label: 'In CBD',     value: stats.cbdVehicles,        color: '#f5c518',                 icon: MapPin  },
                ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                            <Icon size={9} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                                {label}
                            </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700, color, tabularNums: true } as React.CSSProperties}>
                            {String(value)}
                        </span>
                    </div>
                ))}

                {/* Congestion mini-bar */}
                <div className="mt-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text-disabled)' }}>
                            Network congestion
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: congestionPct >= 60 ? '#ff3b3b' : '#f5c518', fontWeight: 700 }}>
                            {congestionPct}%
                        </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                                width:      `${congestionPct}%`,
                                background: `linear-gradient(90deg, #50c878, #f5c518, #ff3b3b)`,
                                backgroundSize: '300% 100%',
                                backgroundPosition: `${congestionPct}% 50%`,
                            }}
                        />
                    </div>
                </div>

                {/* Flagged count */}
                {stats.flaggedCount > 0 && (
                    <div
                        className="mt-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                        style={{ background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.22)' }}
                    >
                        <AlertTriangle size={9} style={{ color: '#ff8800', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#ff8800', fontWeight: 600 }}>
                            {stats.flaggedCount} vehicle{stats.flaggedCount !== 1 ? 's' : ''} flagged &gt;3h
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Congestion legend ────────────────────────────────────────────────────────

function CongestionLegend() {
    return (
        <div
            style={{
                position:       'absolute',
                bottom:         20,
                right:          16,
                zIndex:         30,
                display:        'flex',
                flexDirection:  'column',
                gap:            6,
                padding:        '10px 12px',
                borderRadius:   12,
                background:     'rgba(12,14,20,0.88)',
                border:         '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                pointerEvents:  'none',
            }}
        >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)', marginBottom: 2 }}>
                Road status
            </span>
            {[
                { color: '#ff3b3b', label: 'Heavy (>80%)'   },
                { color: '#ff8800', label: 'Slow (60–80%)'  },
                { color: '#f5c518', label: 'Moderate (40%)' },
                { color: '#50c878', label: 'Free flow'      },
            ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                    <div
                        className="rounded-full shrink-0"
                        style={{ width: 20, height: 4, background: item.color, opacity: 0.85 }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-muted)' }}>
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Main overlay ─────────────────────────────────────────────────────────────

export function MapIntelligenceOverlay({
                                           vehicles,
                                           flaggedVehicles,
                                           newFlag,
                                           dismissFlag,
                                           congestedRoads,
                                           mapStats,
                                           mapBounds = DEFAULT_BOUNDS,
                                           containerWidth,
                                           containerHeight,
                                       }: MapIntelligenceOverlayProps) {
    const [hoveredVehicle, setHoveredVehicle] = useState<VehiclePosition | null>(null);
    const [dwellCollapsed, setDwellCollapsed] = useState(false);
    const [showLayers,     setShowLayers]     = useState(true);
    const [localFlag,      setLocalFlag]      = useState<FlaggedVehicle | null>(null);

    // Sync newFlag prop into local state for dismissal
    useEffect(() => {
        if (newFlag) setLocalFlag(newFlag);
    }, [newFlag]);

    const proj = useCallback(
        (lat: number, lng: number): [number, number] =>
            project(lat, lng, mapBounds, containerWidth, containerHeight),
        [mapBounds, containerWidth, containerHeight],
    );

    // Only render SVG when we have real dimensions
    if (containerWidth < 10 || containerHeight < 10) return null;

    return (
        /*
         * Overlay root
         * ────────────
         * Uses explicit top/left/width/height — NOT "inset: 0" — so the
         * containing block is unambiguously the map stage div (position:relative).
         * z-index: 20 keeps this above the tile map (typically z:0) and below
         * the StatusBar (z:10 on the grid row outside this stacking context).
         * overflow: hidden clips HUD panels at the map stage edge.
         */
        <div
            style={{
                position:   'absolute',
                top:        0,
                left:       0,
                width:      '100%',
                height:     '100%',
                zIndex:     20,
                pointerEvents: 'none',
                overflow:   'hidden',
            }}
        >
            {/* ── SVG layer — vehicles + roads + arrows ── */}
            <svg
                width={containerWidth}
                height={containerHeight}
                style={{
                    position: 'absolute',
                    top:      0,
                    left:     0,
                    // overflow: hidden prevents SVG content (vehicle glows,
                    // tooltips) from rendering outside the map stage bounds
                    overflow: 'hidden',
                }}
            >
                <defs>
                    {/* Arrow marker for direction hints */}
                    <marker id="mi-arrow" viewBox="0 0 10 10" refX="8" refY="5"
                            markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                        <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke"
                              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </marker>
                </defs>

                {/* Congested road lines */}
                {showLayers && congestedRoads.map(road => {
                    const [x1, y1] = proj(road.from[0], road.from[1]);
                    const [x2, y2] = proj(road.to[0],   road.to[1]);
                    const color    = congestionColor(road.level);
                    const opacity  = congestionOpacity(road.level);
                    const weight   = 2 + (road.level / 100) * 5;

                    return (
                        <g key={road.id}>
                            {/* Glow/halo */}
                            <line
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={color}
                                strokeWidth={weight + 6}
                                strokeOpacity={opacity * 0.18}
                                strokeLinecap="round"
                            />
                            {/* Main road line */}
                            <line
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={color}
                                strokeWidth={weight}
                                strokeOpacity={opacity}
                                strokeLinecap="round"
                            />
                            {/* Animated direction arrow along the road */}
                            <DirectionArrow
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                color={color}
                                delay={congestedRoads.indexOf(road) * 0.25}
                            />
                        </g>
                    );
                })}

                {/* Vehicles */}
                {showLayers && vehicles.map(v => {
                    const [x, y] = proj(v.lat, v.lng);
                    const isHovered = hoveredVehicle?.plate === v.plate;
                    return (
                        <g key={v.plate} style={{ pointerEvents: 'all' }}>
                            <VehicleMarker
                                vehicle={v}
                                x={x} y={y}
                                onHover={setHoveredVehicle}
                                onLeave={() => setHoveredVehicle(null)}
                                isHovered={isHovered}
                            />
                        </g>
                    );
                })}

                {/* Hover tooltip */}
                {hoveredVehicle && showLayers && (() => {
                    const [x, y] = proj(hoveredVehicle.lat, hoveredVehicle.lng);
                    return (
                        <g style={{ pointerEvents: 'none' }}>
                            <VehicleTooltip
                                vehicle={hoveredVehicle}
                                x={x} y={y}
                                containerWidth={containerWidth}
                                containerHeight={containerHeight}
                            />
                        </g>
                    );
                })()}
            </svg>

            {/* ── HTML UI panels — all use position:absolute relative to overlay root ── */}

            {/* Stats HUD (top-right) — pointerEvents:all set on StatsHUD itself */}
            <StatsHUD
                stats={mapStats}
                showLayers={showLayers}
                onToggleLayers={() => setShowLayers(v => !v)}
            />

            {/* CBD Dwell Panel (bottom-left) — pointerEvents:all set on CBDDwellPanel itself */}
            <CBDDwellPanel
                flaggedVehicles={flaggedVehicles}
                dismissFlag={dismissFlag}
                cbdCount={mapStats.cbdVehicles}
                collapsed={dwellCollapsed}
                onToggle={() => setDwellCollapsed(v => !v)}
            />

            {/* Congestion legend (bottom-right) */}
            {showLayers && <CongestionLegend />}

            {/* Flag toast — bottom-center */}
            {localFlag && (
                <FlagToast
                    flag={localFlag}
                    onDismiss={() => setLocalFlag(null)}
                />
            )}
        </div>
    );
}