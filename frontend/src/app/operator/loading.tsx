export default function OperatorLoading() {
    return (
        <div style={{
            width:      '100vw',
            height:     '100dvh',
            background: 'var(--bg-void)',
            display:    'grid',
            gridTemplateRows:    'var(--status-bar-h) 1fr 140px',
            gridTemplateColumns: '1fr 300px',
            overflow:   'hidden',
        }}>

            {/* Status bar skeleton */}
            <div style={{
                gridColumn:  '1 / -1',
                background:  'var(--bg-base)',
                borderBottom:'1px solid var(--border-default)',
                display:     'flex',
                alignItems:  'center',
                padding:     '0 16px',
                gap:         16,
            }}>
                <Skel width={120} height={14} />
                <Skel width={80}  height={14} />
                <div style={{ flex: 1 }} />
                <Skel width={60}  height={22} radius={11} />
                <Skel width={60}  height={22} radius={11} />
                <Skel width={60}  height={22} radius={11} />
                <Skel width={28}  height={28} radius={14} />
            </div>

            {/* Map skeleton */}
            <div style={{ gridColumn: 1, gridRow: 2, background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>
                <ShimmerOverlay />
                <div style={{
                    position:   'absolute', inset: 0,
                    background: 'radial-gradient(ellipse 60% 60% at 50% 55%, rgba(59,158,255,0.04) 0%, transparent 100%)',
                }} />
                {/* Fake map grid lines */}
                {[20, 40, 60, 80].map(pct => (
                    <div key={pct} style={{
                        position:   'absolute',
                        top:        `${pct}%`, left: 0, right: 0,
                        height:     1,
                        background: 'rgba(59,158,255,0.05)',
                    }} />
                ))}
                {[20, 40, 60, 80].map(pct => (
                    <div key={pct} style={{
                        position:   'absolute',
                        left:       `${pct}%`, top: 0, bottom: 0,
                        width:      1,
                        background: 'rgba(59,158,255,0.05)',
                    }} />
                ))}
                {/* Map controls skeleton */}
                <div style={{
                    position:   'absolute', top: 12, left: 12,
                    display:    'flex', gap: 6,
                }}>
                    <Skel width={48} height={28} />
                    <Skel width={48} height={28} />
                    <Skel width={48} height={28} />
                </div>
                {/* Loading label */}
                <div style={{
                    position:   'absolute', bottom: 16, left: '50%',
                    transform:  'translateX(-50%)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'var(--text-disabled)', animation: 'fade-in 600ms ease both',
                }}>
                    Loading map…
                </div>
            </div>

            {/* Alert panel skeleton */}
            <div style={{
                gridColumn:   2, gridRow: 2,
                background:   'var(--bg-base)',
                borderLeft:   '1px solid var(--border-default)',
                padding:      12,
                display:      'flex',
                flexDirection:'column',
                gap:          8,
                overflow:     'hidden',
            }}>
                <Skel width={100} height={12} style={{ marginBottom: 4 }} />
                {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                        background:   'var(--bg-raised)',
                        borderRadius: 8,
                        padding:      12,
                        display:      'flex',
                        flexDirection:'column',
                        gap:          6,
                        borderLeft:   '3px solid var(--border-strong)',
                    }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Skel width={8}  height={8}  radius={4} />
                            <Skel width={130} height={11} />
                            <div style={{ flex: 1 }} />
                            <Skel width={36} height={10} />
                        </div>
                        <Skel width="90%" height={9} />
                        <Skel width="60%" height={9} />
                    </div>
                ))}
            </div>

            {/* Predictive strip skeleton */}
            <div style={{
                gridColumn:  1, gridRow: 3,
                background:  'var(--bg-base)',
                borderTop:   '1px solid var(--border-default)',
                padding:     '10px 16px',
                display:     'flex',
                gap:         16,
                alignItems:  'center',
                overflow:    'hidden',
            }}>
                {[1,2,3,4].map(i => (
                    <div key={i} style={{
                        flex:         1, background: 'var(--bg-raised)',
                        borderRadius: 8, padding:    10,
                        display:      'flex', flexDirection: 'column', gap: 6,
                    }}>
                        <Skel width="60%" height={10} />
                        <Skel width="80%" height={18} />
                        <Skel width="40%" height={9}  />
                    </div>
                ))}
            </div>

            {/* Activity feed skeleton */}
            <div style={{
                gridColumn:   2, gridRow: 3,
                background:   'var(--bg-base)',
                borderTop:    '1px solid var(--border-default)',
                borderLeft:   '1px solid var(--border-default)',
                padding:      '10px 12px',
                display:      'flex',
                flexDirection:'column',
                gap:          6,
                overflow:     'hidden',
            }}>
                <Skel width={80} height={10} style={{ marginBottom: 4 }} />
                {[1,2,3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Skel width={6} height={6} radius={3} style={{ marginTop: 3, flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <Skel width="80%" height={9} />
                            <Skel width="50%" height={8} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Tiny skeleton building block ─────────────────────────────
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

// React import needed for CSSProperties
import type React from 'react';