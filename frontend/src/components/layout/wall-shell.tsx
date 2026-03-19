'use client';

import { useMemo, Suspense, lazy } from 'react';
import { StatusBar }         from '@/components/status-bar/status-bar';
import { ErrorBoundary }     from '@/components/layout/Error-Boundary';
import { MapSkeleton }       from '@/components/layout/Skeletons';

const GoogleWallMap = lazy(() =>
    import('@/components/map/GoogleWallMap').then(m => ({ default: m.GoogleWallMap }))
);

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
import { useAlerts }         from '@/hooks/use-alerts';
import { useSystemHealth }   from '@/hooks/use-system-health';
import { usePredictive }     from '@/hooks/use-predictive';
import {
    SEVERITY_COLORS,
    SEVERITY_BG,
    SEVERITY_BORDER,
    TIMELINE_LABELS,
    formatRelativeTime,
    formatPercent,
} from '@/lib/utils';
import type { Alert, PredictiveSnapshot } from '@/types';


// Wall uses same map but read-only (no click handlers, no controls)

// ── Wall alert card ───────────────────────
function WallAlertCard({ alert, index }: { alert: Alert; index: number }) {
    const color  = SEVERITY_COLORS[alert.severity];
    const bg     = SEVERITY_BG[alert.severity];
    const border = SEVERITY_BORDER[alert.severity];

    return (
        <div style={{
            padding:    '12px 14px',
            background: bg,
            border:     `1px solid ${border}`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 8,
            animation:  `slide-in-up ${200 + index * 80}ms ease both`,
            flexShrink: 0,
        }}>
            <div style={{
                display:        'flex',
                alignItems:     'flex-start',
                justifyContent: 'space-between',
                gap:            8,
                marginBottom:   4,
            }}>
        <span style={{
            fontFamily:  'var(--font-display)',
            fontSize:    'clamp(0.7rem, 1.2vw, 0.85rem)',
            fontWeight:  600,
            color:       'var(--text-primary)',
            lineHeight:  1.3,
            flex:        1,
            minWidth:    0,
        }}>
          {alert.title}
        </span>
                <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.6rem',
                    color,
                    letterSpacing: '0.08em',
                    flexShrink:    0,
                }}>
          {alert.confidence}%
        </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.6rem',
            color:         'var(--text-muted)',
            letterSpacing: '0.05em',
            overflow:      'hidden',
            whiteSpace:    'nowrap',
            textOverflow:  'ellipsis',
            flex:          1,
        }}>
          📍 {alert.location.label}
        </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '0.58rem',
                    color:      'var(--text-disabled)',
                    flexShrink: 0,
                }}>
          {formatRelativeTime(alert.detectedAt)}
        </span>
            </div>
        </div>
    );
}

// ── Predictive strip (live data) ──────────
function WallPredictiveStrip({ snapshots }: { snapshots: PredictiveSnapshot[] }) {
    return (
        <div style={{
            display:    'flex',
            alignItems: 'center',
            height:     '100%',
            padding:    '0 24px',
            gap:        0,
        }}>
      <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      'clamp(0.55rem, 0.8vw, 0.65rem)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         'var(--text-muted)',
          marginRight:   24,
          flexShrink:    0,
      }}>
        Projection
      </span>

            <div style={{
                flex:                1,
                display:             'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                height:              '100%',
                gap:                 1,
            }}>
                {snapshots.map((snap, i) => {
                    const maxSeverity = snap.hotspots[0]?.severity;
                    const dotColor    = maxSeverity ? SEVERITY_COLORS[maxSeverity] : 'var(--text-disabled)';
                    const isNow       = snap.slot === 'now';

                    return (
                        <div key={snap.slot} style={{
                            display:        'flex',
                            flexDirection:  'column',
                            alignItems:     'center',
                            justifyContent: 'center',
                            gap:            4,
                            borderLeft:     i > 0 ? '1px solid var(--border-subtle)' : 'none',
                            padding:        '8px 12px',
                            background:     isNow ? 'rgba(59,158,255,0.04)' : 'transparent',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                {isNow && (
                                    <div style={{
                                        width:        5,
                                        height:       5,
                                        borderRadius: '50%',
                                        background:   'var(--status-online)',
                                        animation:    'pulse-dot 2s ease infinite',
                                        flexShrink:   0,
                                    }} />
                                )}
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      'clamp(0.55rem, 0.8vw, 0.7rem)',
                                    letterSpacing: '0.1em',
                                    color:         isNow ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                }}>
                  {TIMELINE_LABELS[snap.slot]}
                </span>
                            </div>

                            {/* Hotspot dots */}
                            <div style={{ display: 'flex', gap: 3 }}>
                                {snap.hotspots.slice(0, 5).map((h, j) => (
                                    <div key={j} style={{
                                        width:        8,
                                        height:       8,
                                        borderRadius: '50%',
                                        background:   SEVERITY_COLORS[h.severity],
                                        opacity:      0.9,
                                        boxShadow:    `0 0 4px ${SEVERITY_COLORS[h.severity]}`,
                                    }} />
                                ))}
                                {snap.hotspots.length === 0 && (
                                    <div style={{
                                        width:        8,
                                        height:       8,
                                        borderRadius: '50%',
                                        background:   'var(--status-online)',
                                        opacity:      0.7,
                                    }} />
                                )}
                            </div>

                            <span style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '0.52rem',
                                color:         snap.hotspots.length === 0 ? 'var(--status-online)' : dotColor,
                                letterSpacing: '0.06em',
                            }}>
                {snap.hotspots.length === 0
                    ? 'Clear'
                    : `${snap.hotspots.length} hotspot${snap.hotspots.length !== 1 ? 's' : ''}`
                }
              </span>

                            {snap.eventImpact && (
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '0.48rem',
                                    color:         'var(--severity-medium)',
                                    textAlign:     'center',
                                    maxWidth:      80,
                                    overflow:      'hidden',
                                    whiteSpace:    'nowrap',
                                    textOverflow:  'ellipsis',
                                }}>
                  🏟 Event
                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── System health ─────────────────────────
function WallSystemHealth() {
    const health = useSystemHealth();

    const metrics = [
        {
            label:    'IoT Network',
            value:    health.iotNetworkPercent,
            display:  formatPercent(health.iotNetworkPercent, 1),
            warn:     health.iotNetworkPercent < 90,
            sublabel: `${Math.round(health.iotNetworkPercent * 4.2)} / 420 sensors`,
        },
        {
            label:    'AI Confidence',
            value:    health.aiConfidence,
            display:  formatPercent(health.aiConfidence),
            warn:     health.aiConfidence < 70,
            sublabel: health.aiConfidence >= 80 ? 'High reliability' : 'Reduced reliability',
        },
        {
            label:    'Uptime',
            value:    health.uptimePercent,
            display:  formatPercent(health.uptimePercent, 2),
            warn:     false,
            sublabel: `${health.activeOperators} operators online`,
        },
    ];

    return (
        <div style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           10,
            padding:       '12px 14px',
        }}>
      <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      'clamp(0.55rem, 0.8vw, 0.65rem)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         'var(--text-muted)',
      }}>
        System Health
      </span>

            {metrics.map(m => (
                <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      'clamp(0.58rem, 0.9vw, 0.68rem)',
                color:         'var(--text-muted)',
                letterSpacing: '0.05em',
            }}>
              {m.label}
            </span>
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.85rem, 1.4vw, 1.1rem)',
                            fontWeight: 500,
                            color:      m.warn ? 'var(--severity-medium)' : 'var(--text-primary)',
                        }}>
              {m.display}
            </span>
                    </div>
                    <div style={{
                        height:       3,
                        background:   'var(--bg-elevated)',
                        borderRadius: 2,
                        overflow:     'hidden',
                    }}>
                        <div style={{
                            height:       '100%',
                            width:        `${m.value}%`,
                            background:   m.warn ? 'var(--severity-medium)' : 'var(--status-online)',
                            borderRadius: 2,
                            transition:   'width 1s ease',
                        }} />
                    </div>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.52rem',
                        color:         'var(--text-disabled)',
                        letterSpacing: '0.06em',
                    }}>
            {m.sublabel}
          </span>
                </div>
            ))}
        </div>
    );
}

// ── Wall Shell ────────────────────────────
export function WallShell() {
    const { alertsBySeverity } = useAlerts();
    const { allSnapshots }     = usePredictive();

    const criticalAndHigh = useMemo(() => [
        ...(alertsBySeverity.critical ?? []),
        ...(alertsBySeverity.high     ?? []),
    ].slice(0, 5), [alertsBySeverity]);

    return (
        <div
            // Wall is strictly read-only — no interaction
            style={{
                display:             'grid',
                gridTemplateRows:    'var(--status-bar-h) 1fr 100px',
                gridTemplateColumns: '1fr 280px',
                height:              '100dvh',
                overflow:            'hidden',
                background:          'var(--bg-void)',
                gap:                 1,
                pointerEvents:       'none', // entire wall is display-only
                userSelect:          'none',
            }}
        >

            {/* ── Status Bar ── */}
            <div style={{ gridColumn: '1 / -1', pointerEvents: 'none' }}>
                <StatusBar variant="wall" />
            </div>

            {/* ── Map ── */}
            <div style={{ overflow: 'hidden', position: 'relative' }}>
                <ErrorBoundary label="Situation Map" fallback={<MapSkeleton />}>
                    <Suspense fallback={<MapSkeleton />}>
                        <GoogleWallMap
                            alerts={criticalAndHigh}
                            apiKey={MAPS_API_KEY}
                        />
                    </Suspense>
                </ErrorBoundary>

                {/* Wall watermark */}
                <div style={{
                    position:       'absolute',
                    bottom:         16,
                    left:           '50%',
                    transform:      'translateX(-50%)',
                    display:        'flex',
                    alignItems:     'center',
                    gap:            6,
                    padding:        '4px 14px',
                    background:     'rgba(8,11,15,0.75)',
                    borderRadius:   20,
                    backdropFilter: 'blur(8px)',
                    border:         '1px solid var(--border-subtle)',
                }}>
                    <div style={{
                        width:        5,
                        height:       5,
                        borderRadius: '50%',
                        background:   'var(--status-online)',
                        boxShadow:    '0 0 5px var(--status-online)',
                        animation:    'pulse-dot 2s ease infinite',
                    }} />
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.58rem',
                        letterSpacing: '0.1em',
                        color:         'var(--text-muted)',
                    }}>
            SITUATION WALL — NAIROBI METRO
          </span>
                </div>
            </div>

            {/* ── Right rail ── */}
            <div style={{
                background:    'var(--bg-raised)',
                borderLeft:    '1px solid var(--border-default)',
                display:       'flex',
                flexDirection: 'column',
                overflow:      'hidden',
            }}>
                {/* Critical events header */}
                <div style={{
                    padding:       '10px 14px',
                    borderBottom:  '1px solid var(--border-subtle)',
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'space-between',
                    flexShrink:    0,
                    background:    'var(--bg-elevated)',
                }}>
          <span style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      'clamp(0.55rem, 0.8vw, 0.65rem)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         criticalAndHigh.length > 0
                  ? 'var(--severity-critical)'
                  : 'var(--text-muted)',
          }}>
            Critical Events
          </span>
                    {criticalAndHigh.length > 0 && (
                        <div style={{
                            display:      'flex',
                            alignItems:   'center',
                            gap:          4,
                            padding:      '2px 7px',
                            background:   'rgba(255,59,59,0.12)',
                            border:       '1px solid rgba(255,59,59,0.3)',
                            borderRadius: 4,
                        }}>
                            <div style={{
                                width:        5,
                                height:       5,
                                borderRadius: '50%',
                                background:   'var(--severity-critical)',
                                animation:    'pulse-dot 1s ease infinite',
                            }} />
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   '0.65rem',
                                fontWeight: 600,
                                color:      'var(--severity-critical)',
                            }}>
                {criticalAndHigh.length}
              </span>
                        </div>
                    )}
                </div>

                {/* Alert cards */}
                <div style={{
                    flex:          1,
                    overflow:      'hidden',
                    padding:       '10px 12px',
                    display:       'flex',
                    flexDirection: 'column',
                    gap:           8,
                }}>
                    {criticalAndHigh.length === 0 ? (
                        <div style={{
                            flex:           1,
                            display:        'flex',
                            flexDirection:  'column',
                            alignItems:     'center',
                            justifyContent: 'center',
                            gap:            6,
                        }}>
                            <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>✓</span>
                            <span style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '0.62rem',
                                color:         'var(--text-disabled)',
                                letterSpacing: '0.08em',
                            }}>
                NO CRITICAL EVENTS
              </span>
                        </div>
                    ) : (
                        criticalAndHigh.map((alert, i) => (
                            <WallAlertCard key={alert.id} alert={alert} index={i} />
                        ))
                    )}
                </div>

                {/* System health */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                    <WallSystemHealth />
                </div>
            </div>

            {/* ── Predictive strip ── */}
            <div style={{
                gridColumn: '1 / -1',
                background: 'var(--bg-raised)',
                borderTop:  '1px solid var(--border-default)',
            }}>
                <WallPredictiveStrip snapshots={allSnapshots} />
            </div>
        </div>
    );
}