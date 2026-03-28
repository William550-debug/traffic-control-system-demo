'use client';

import type { MapState, MapOverlay } from '@/types';

interface MapControlsProps {
    mapState:      MapState;
    onViewMode:    (mode: MapState['viewMode']) => void;
    onToggleOverlay: (overlay: MapOverlay) => void;
    onZoomIn:      () => void;
    onZoomOut:     () => void;
    onReset:       () => void;
}

// ── Overlay config ────────────────────────
const OVERLAYS: { key: MapOverlay; label: string; icon: string }[] = [
    { key: 'heatmap',     label: 'Heat',      icon: '🌡' },
    { key: 'cameras',     label: 'Cameras',   icon: '📷' },
    { key: 'signals',     label: 'Signals',   icon: '🚦' },
    { key: 'incidents',   label: 'Incidents', icon: '⚠️' },
    { key: 'parking',     label: 'parking',   icon: '🅿️' },
    { key: 'transport',   label: 'Transit',   icon: '🚌' },
    { key: 'weather',     label: 'Weather',   icon: '🌧' },
    { key: 'predictions', label: 'Predict',   icon: '🔮' },
];

const VIEW_MODES: { key: MapState['viewMode']; label: string }[] = [
    { key: 'live',       label: 'LIVE' },
    { key: 'forecast',   label: 'FCST' },
    { key: 'historical', label: 'HIST' },
];

// ── Button primitives ─────────────────────
function CtrlBtn({
                     active,
                     onClick,
                     title,
                     children,
                     danger,
                 }: {
    active?:   boolean;
    onClick:   () => void;
    title:     string;
    children:  React.ReactNode;
    danger?:   boolean;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                width:           32,
                height:          32,
                background:      active
                    ? (danger ? 'rgba(255,59,59,0.2)' : 'rgba(59,158,255,0.18)')
                    : 'rgba(12,17,23,0.85)',
                border:          `1px solid ${
                    active
                        ? (danger ? 'rgba(255,59,59,0.5)' : 'rgba(59,158,255,0.5)')
                        : 'rgba(255,255,255,0.1)'
                }`,
                borderRadius:    6,
                cursor:          'pointer',
                transition:      'all 150ms ease',
                outline:         'none',
                flexShrink:      0,
            }}
        >
            {children}
        </button>
    );
}

function Divider() {
    return (
        <div style={{
            width:      '100%',
            height:     1,
            background: 'rgba(255,255,255,0.07)',
            margin:     '2px 0',
        }} />
    );
}

// ── Main component ────────────────────────
export function MapControls({
                                mapState,
                                onViewMode,
                                onToggleOverlay,
                                onZoomIn,
                                onZoomOut,
                                onReset,
                            }: MapControlsProps) {
    return (
        <div style={{
            position:       'absolute',
            top:            12,
            right:          12,
            zIndex:         35,    // within map stage isolation context; above overlay (30) but below emergency tint (40)
            display:        'flex',
            flexDirection:  'column',
            gap:            4,
            alignItems:     'center',
        }}>

            {/* View mode: LIVE / FCST / HIST */}
            <div style={{
                background:   'rgba(12,17,23,0.92)',
                border:       '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding:      4,
                display:      'flex',
                flexDirection: 'column',
                gap:          2,
                backdropFilter: 'blur(12px)',
            }}>
                {VIEW_MODES.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => onViewMode(key)}
                        title={`${key} view`}
                        style={{
                            padding:        '3px 8px',
                            background:     mapState.viewMode === key
                                ? 'var(--accent-primary)'
                                : 'transparent',
                            border:         'none',
                            borderRadius:   5,
                            cursor:         'pointer',
                            fontFamily:     'var(--font-mono)',
                            fontSize:       '0.6rem',
                            fontWeight:     600,
                            letterSpacing:  '0.1em',
                            color:          mapState.viewMode === key
                                ? '#000'
                                : 'var(--text-muted)',
                            transition:     'all 150ms ease',
                            outline:        'none',
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Zoom controls */}
            <div style={{
                background:     'rgba(12,17,23,0.92)',
                border:         '1px solid rgba(255,255,255,0.1)',
                borderRadius:   8,
                padding:        4,
                display:        'flex',
                flexDirection:  'column',
                gap:            2,
                backdropFilter: 'blur(12px)',
            }}>
                <CtrlBtn onClick={onZoomIn} title="Zoom in">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1 }}>+</span>
                </CtrlBtn>
                <Divider />
                <CtrlBtn onClick={onZoomOut} title="Zoom out">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1 }}>−</span>
                </CtrlBtn>
            </div>

            {/* Reset */}
            <div style={{
                background:     'rgba(12,17,23,0.92)',
                border:         '1px solid rgba(255,255,255,0.1)',
                borderRadius:   8,
                padding:        4,
                backdropFilter: 'blur(12px)',
            }}>
                <CtrlBtn onClick={onReset} title="Reset to city view">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5.5" stroke="var(--text-muted)" strokeWidth="1.2"/>
                        <circle cx="7" cy="7" r="1.5" fill="var(--text-muted)"/>
                        <line x1="7" y1="1" x2="7" y2="3.5" stroke="var(--text-muted)" strokeWidth="1.2"/>
                        <line x1="7" y1="10.5" x2="7" y2="13" stroke="var(--text-muted)" strokeWidth="1.2"/>
                        <line x1="1" y1="7" x2="3.5" y2="7" stroke="var(--text-muted)" strokeWidth="1.2"/>
                        <line x1="10.5" y1="7" x2="13" y2="7" stroke="var(--text-muted)" strokeWidth="1.2"/>
                    </svg>
                </CtrlBtn>
            </div>

            {/* Overlay toggles */}
            <div style={{
                background:     'rgba(12,17,23,0.92)',
                border:         '1px solid rgba(255,255,255,0.1)',
                borderRadius:   8,
                padding:        4,
                display:        'flex',
                flexDirection:  'column',
                gap:            2,
                backdropFilter: 'blur(12px)',
            }}>
                {OVERLAYS.map(({ key, label, icon }) => {
                    const isActive = mapState.activeOverlays.includes(key);
                    return (
                        <button
                            key={key}
                            onClick={() => onToggleOverlay(key)}
                            title={`Toggle ${label}`}
                            style={{
                                display:        'flex',
                                alignItems:     'center',
                                gap:            5,
                                padding:        '3px 6px',
                                background:     isActive ? 'rgba(59,158,255,0.1)' : 'transparent',
                                border:         `1px solid ${isActive ? 'rgba(59,158,255,0.25)' : 'transparent'}`,
                                borderRadius:   5,
                                cursor:         'pointer',
                                transition:     'all 150ms ease',
                                outline:        'none',
                                width:          '100%',
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>{icon}</span>
                            <span style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '0.55rem',
                                letterSpacing: '0.06em',
                                color:         isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                                transition:    'color 150ms ease',
                            }}>
                {label}
              </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}