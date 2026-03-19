export default function WallLoading() {
    return (
        <div style={{
            width:      '100vw',
            height:     '100dvh',
            background: 'var(--bg-void)',
            display:    'grid',
            gridTemplateRows:    '64px 1fr 100px',
            gridTemplateColumns: '1fr 340px',
            overflow:   'hidden',
        }}>

            {/* Header skeleton */}
            <div style={{
                gridColumn:   '1 / -1',
                background:   'var(--bg-base)',
                borderBottom: '1px solid var(--border-default)',
                display:      'flex',
                alignItems:   'center',
                padding:      '0 24px',
                gap:          20,
            }}>
                <Skel width={160} height={16} />
                <div style={{ flex: 1 }} />
                <Skel width={80}  height={12} />
                <Skel width={80}  height={12} />
                <Skel width={80}  height={12} />
                <Skel width={10}  height={10} radius={5} />
                <Skel width={60}  height={12} />
            </div>

            {/* Map skeleton — full height */}
            <div style={{
                gridColumn: 1, gridRow: '2 / 4',
                background: 'var(--bg-base)',
                position:   'relative',
                overflow:   'hidden',
            }}>
                <ShimmerOverlay />
                <div style={{
                    position:   'absolute', inset: 0,
                    background: 'radial-gradient(ellipse 70% 70% at 48% 52%, rgba(59,158,255,0.05) 0%, transparent 100%)',
                }} />
                {/* Grid lines */}
                {[15, 30, 45, 60, 75, 90].map(pct => (
                    <div key={`h${pct}`} style={{
                        position: 'absolute', top: `${pct}%`,
                        left: 0, right: 0, height: 1,
                        background: 'rgba(59,158,255,0.04)',
                    }} />
                ))}
                {[15, 30, 45, 60, 75, 90].map(pct => (
                    <div key={`v${pct}`} style={{
                        position: 'absolute', left: `${pct}%`,
                        top: 0, bottom: 0, width: 1,
                        background: 'rgba(59,158,255,0.04)',
                    }} />
                ))}
                {/* Mode label */}
                <div style={{
                    position:   'absolute', top: 16, left: '50%',
                    transform:  'translateX(-50%)',
                    padding:    '5px 16px',
                    background: 'rgba(59,158,255,0.07)',
                    border:     '1px solid rgba(59,158,255,0.15)',
                    borderRadius: 20,
                }}>
                    <Skel width={80} height={10} />
                </div>
                {/* Loading label */}
                <div style={{
                    position:      'absolute',
                    bottom:        24, left: '50%',
                    transform:     'translateX(-50%)',
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.55rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color:         'var(--text-disabled)',
                    animation:     'fade-in 600ms ease both',
                    whiteSpace:    'nowrap',
                }}>
                    Connecting to live feed…
                </div>
            </div>

            {/* Alert panel skeleton */}
            <div style={{
                gridColumn:   2, gridRow: 2,
                background:   'var(--bg-base)',
                borderLeft:   '1px solid var(--border-default)',
                padding:      '16px 14px',
                display:      'flex',
                flexDirection:'column',
                gap:          10,
                overflow:     'hidden',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Skel width={90}  height={12} />
                    <Skel width={24}  height={20} radius={10} />
                </div>
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} style={{
                        background:   'var(--bg-raised)',
                        borderRadius: 8,
                        padding:      '10px 12px',
                        borderLeft:   '3px solid var(--border-strong)',
                        display:      'flex',
                        flexDirection:'column',
                        gap:          5,
                    }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Skel width={8}   height={8}  radius={4} />
                            <Skel width={140} height={10} />
                        </div>
                        <Skel width="70%" height={8} />
                    </div>
                ))}
            </div>

            {/* Bottom strip skeleton */}
            <div style={{
                gridColumn:   2, gridRow: 3,
                background:   'var(--bg-base)',
                borderTop:    '1px solid var(--border-default)',
                borderLeft:   '1px solid var(--border-default)',
                padding:      '12px 14px',
                display:      'flex',
                flexDirection:'column',
                gap:          8,
            }}>
                <Skel width={100} height={10} />
                <div style={{ display: 'flex', gap: 8 }}>
                    {[1,2,3].map(i => (
                        <div key={i} style={{
                            flex:1, background: 'var(--bg-raised)',
                            borderRadius: 6, padding: 8,
                            display: 'flex', flexDirection: 'column', gap: 4,
                        }}>
                            <Skel width="70%" height={8} />
                            <Skel width="50%" height={14} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Skel({
                  width, height, radius = 4, style,
              }: {
    width:    number | string;
    height:   number;
    radius?:  number;
    style?:   React.CSSProperties;
}) {
    return (
        <div style={{
            width, height,
            borderRadius: radius,
            background:   'var(--bg-elevated)',
            overflow:     'hidden',
            flexShrink:   0,
            position:     'relative',
            ...style,
        }}>
            <ShimmerOverlay />
        </div>
    );
}

function ShimmerOverlay() {
    return (
        <div style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
            animation:  'shimmer 1.6s ease infinite',
        }} />
    );
}

import type React from 'react';