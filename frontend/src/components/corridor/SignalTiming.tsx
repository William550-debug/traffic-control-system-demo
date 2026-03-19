'use client';

import { useState, useCallback } from 'react';
import type { SignalTiming } from '@/types';

interface SignalTimingDiagramProps {
    timing:    SignalTiming;
    onChange:  (timing: SignalTiming) => void;
    readonly?: boolean;
}

// ── Arc segment ───────────────────────────
function ArcSegment({
                        cx, cy, r,
                        startAngle, endAngle,
                        color, opacity = 1,
                    }: {
    cx: number; cy: number; r: number;
    startAngle: number; endAngle: number;
    color: string; opacity?: number;
}) {
    const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;

    return (
        <path
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
            fill={color}
            opacity={opacity}
        />
    );
}

// ── Timing slider row ──────────────────────
function TimingRow({
                       label, value, color, min, max,
                       onChange, readonly,
                   }: {
    label: string; value: number; color: string;
    min: number; max: number;
    onChange: (v: number) => void; readonly?: boolean;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   color,
                flexShrink:   0,
                boxShadow:    `0 0 5px ${color}60`,
            }} />
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.6rem',
                color:         'var(--text-muted)',
                width:         52,
                flexShrink:    0,
            }}>
        {label}
      </span>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                disabled={readonly}
                onChange={e => onChange(Number(e.target.value))}
                style={{
                    flex:   1,
                    cursor: readonly ? 'not-allowed' : 'pointer',
                    accentColor: color,
                }}
            />
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.68rem',
                fontWeight:    600,
                color:         'var(--text-primary)',
                width:         30,
                textAlign:     'right',
                flexShrink:    0,
            }}>
        {value}s
      </span>
        </div>
    );
}

// ── Main diagram ──────────────────────────
export function SignalTimingDiagram({
                                        timing,
                                        onChange,
                                        readonly = false,
                                    }: SignalTimingDiagramProps) {
    const total  = timing.greenSeconds + timing.yellowSeconds + timing.redSeconds;
    const green  = (timing.greenSeconds  / total) * 360;
    const yellow = (timing.yellowSeconds / total) * 360;
    // red fills remainder

    const greenEnd  = green;
    const yellowEnd = green + yellow;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* SVG dial */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <svg width={80} height={80} viewBox="0 0 80 80">
                    {/* Background ring */}
                    <circle cx={40} cy={40} r={34} fill="var(--bg-elevated)" />

                    {/* Red (full circle base) */}
                    <circle cx={40} cy={40} r={34} fill="#ff3b3b" opacity={0.7} />

                    {/* Green segment */}
                    <ArcSegment cx={40} cy={40} r={34}
                                startAngle={0} endAngle={greenEnd}
                                color="#22c55e" opacity={0.85} />

                    {/* Yellow segment */}
                    <ArcSegment cx={40} cy={40} r={34}
                                startAngle={greenEnd} endAngle={yellowEnd}
                                color="#f5c518" opacity={0.85} />

                    {/* Inner cutout */}
                    <circle cx={40} cy={40} r={20} fill="var(--bg-raised)" />

                    {/* Total label */}
                    <text x={40} y={38} textAnchor="middle"
                          style={{ fontFamily: 'monospace', fontSize: 10 }}
                          fill="var(--text-primary)">
                        {total}s
                    </text>
                    <text x={40} y={50} textAnchor="middle"
                          style={{ fontFamily: 'monospace', fontSize: 7 }}
                          fill="var(--text-muted)">
                        CYCLE
                    </text>
                </svg>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                        { label: 'Green',  color: '#22c55e', value: timing.greenSeconds  },
                        { label: 'Yellow', color: '#f5c518', value: timing.yellowSeconds },
                        { label: 'Red',    color: '#ff3b3b', value: timing.redSeconds    },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                width:        6,
                                height:       6,
                                borderRadius: '50%',
                                background:   item.color,
                                flexShrink:   0,
                            }} />
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   '0.58rem',
                                color:      'var(--text-muted)',
                                width:      40,
                            }}>
                {item.label}
              </span>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   '0.65rem',
                                fontWeight: 600,
                                color:      item.color,
                            }}>
                {item.value}s
              </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sliders */}
            {!readonly && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <TimingRow
                        label="Green" color="#22c55e"
                        value={timing.greenSeconds} min={10} max={120}
                        onChange={v => onChange({ ...timing, greenSeconds: v })}
                    />
                    <TimingRow
                        label="Yellow" color="#f5c518"
                        value={timing.yellowSeconds} min={3} max={10}
                        onChange={v => onChange({ ...timing, yellowSeconds: v })}
                    />
                    <TimingRow
                        label="Red" color="#ff3b3b"
                        value={timing.redSeconds} min={10} max={120}
                        onChange={v => onChange({ ...timing, redSeconds: v })}
                    />
                </div>
            )}

            {/* Adaptive toggle */}
            <div style={{
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'space-between',
                padding:      '7px 10px',
                background:   timing.adaptive
                    ? 'rgba(59,158,255,0.08)'
                    : 'var(--bg-elevated)',
                border:       `1px solid ${timing.adaptive
                    ? 'rgba(59,158,255,0.25)'
                    : 'var(--border-subtle)'
                }`,
                borderRadius: 6,
            }}>
                <div>
                    <div style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.62rem',
                        color:         timing.adaptive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight:    600,
                    }}>
                        Adaptive Control
                    </div>
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '0.55rem',
                        color:      'var(--text-muted)',
                        marginTop:  1,
                    }}>
                        {timing.adaptive ? 'AI adjusting in real-time' : 'Manual timing active'}
                    </div>
                </div>
                {!readonly && (
                    <button
                        onClick={() => onChange({ ...timing, adaptive: !timing.adaptive })}
                        style={{
                            width:        36,
                            height:       20,
                            borderRadius: 10,
                            background:   timing.adaptive ? 'var(--accent-primary)' : 'var(--bg-overlay)',
                            border:       '1px solid var(--border-default)',
                            cursor:       'pointer',
                            position:     'relative',
                            transition:   'background 200ms ease',
                            outline:      'none',
                            flexShrink:   0,
                        }}
                    >
                        <div style={{
                            position:     'absolute',
                            top:          2,
                            left:         timing.adaptive ? 18 : 2,
                            width:        14,
                            height:       14,
                            borderRadius: '50%',
                            background:   '#fff',
                            transition:   'left 200ms ease',
                            boxShadow:    '0 1px 3px rgba(0,0,0,0.4)',
                        }} />
                    </button>
                )}
            </div>
        </div>
    );
}