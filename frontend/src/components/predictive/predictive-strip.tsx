'use client';

import { MOCK_PREDICTIVE }  from '@/lib/mock-data';
import { usePredictive }    from '@/hooks/use-predictive';
import { TIMELINE_SLOTS, TIMELINE_LABELS, SEVERITY_COLORS } from '@/lib/utils';
import type { TimelineSlot, PredictiveSnapshot } from '@/types';

// ── Demand badge ──────────────────────────────────────────────────────────────
function DemandBadge({ label, level }: { label: string; level: 'low' | 'moderate' | 'high' }) {
    const color = level === 'high'     ? 'var(--severity-high)'
                : level === 'moderate' ? 'var(--severity-medium)'
                :                        'var(--status-online)';
    return (
        <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        6,
            padding:    '3px 9px',
            background: `${color}12`,
            border:     `1px solid ${color}30`,
            borderRadius: 5,
            flexShrink: 0,
        }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
            <span style={{
                fontFamily:    'var(--font-mono)',
                /*
                 * clamp ensures demand badge text stays legible on large-format
                 * displays without overflowing on compact operator screens.
                 */
                fontSize:      'clamp(0.6rem, 0.78vw, 0.7rem)',
                letterSpacing: '0.07em',
                color,
            }}>
                {label}
            </span>
        </div>
    );
}

// ── Timeline slot button ───────────────────────────────────────────────────────
function SlotButton({
    slot, active, hotspotCount, maxSeverity, onClick,
}: {
    slot: TimelineSlot; active: boolean;
    hotspotCount: number; maxSeverity: string | null;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            5,
                // Increased horizontal padding so slot labels have breathing room
                padding:        '6px 18px',
                background:     active ? 'rgba(59,158,255,0.1)' : 'transparent',
                border:         `1px solid ${active ? 'rgba(59,158,255,0.35)' : 'transparent'}`,
                borderRadius:   7,
                cursor:         'pointer',
                outline:        'none',
                transition:     'all 180ms ease',
                flexShrink:     0,
                position:       'relative',
            }}
        >
            {/* Active underline accent */}
            {active && (
                <div style={{
                    position:     'absolute',
                    bottom:       -1,
                    left:         '20%',
                    right:        '20%',
                    height:       2,
                    background:   'var(--accent-primary)',
                    borderRadius: 1,
                }} />
            )}

            {/* Slot label — NOW / +30 / +60 / +120 */}
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      'clamp(0.65rem, 0.82vw, 0.75rem)',
                fontWeight:    active ? 700 : 400,
                letterSpacing: '0.09em',
                color:         active ? 'var(--accent-primary)' : 'var(--text-muted)',
                textTransform: 'uppercase',
            }}>
                {TIMELINE_LABELS[slot]}
            </span>

            {/* Hotspot severity dots */}
            <div style={{ display: 'flex', gap: 3, alignItems: 'center', minHeight: 9 }}>
                {hotspotCount === 0 ? (
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   'clamp(0.56rem, 0.7vw, 0.64rem)',
                        color:      'var(--text-disabled)',
                    }}>
                        clear
                    </span>
                ) : (
                    <>
                        {Array.from({ length: Math.min(hotspotCount, 4) }).map((_, i) => (
                            <div key={i} style={{
                                width:        6,
                                height:       6,
                                borderRadius: '50%',
                                background:   i === 0 && maxSeverity
                                    ? SEVERITY_COLORS[maxSeverity as keyof typeof SEVERITY_COLORS] ?? 'var(--text-muted)'
                                    : 'var(--text-muted)',
                                opacity: i === 0 ? 1 : 0.45,
                            }} />
                        ))}
                        {hotspotCount > 4 && (
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.54rem, 0.68vw, 0.62rem)',
                                color:      'var(--text-muted)',
                            }}>
                                +{hotspotCount - 4}
                            </span>
                        )}
                    </>
                )}
            </div>
        </button>
    );
}

// ── Main strip ─────────────────────────────────────────────────────────────────
export function PredictiveStrip() {
    const { activeSlot, snapshot, setSlot } = usePredictive();

    const slotMeta = TIMELINE_SLOTS.map(slot => {
        const s         = MOCK_PREDICTIVE.find((p: PredictiveSnapshot) => p.slot === slot);
        const hotspots  = s?.hotspots ?? [];
        return {
            slot,
            hotspotCount: hotspots.length,
            maxSeverity:  hotspots.length > 0 ? hotspots[0].severity : null,
        };
    });

    return (
        <div style={{
            height:     '100%',
            background: 'var(--bg-raised)',
            borderTop:  '1px solid var(--border-default)',
            display:    'flex',
            alignItems: 'center',
            overflow:   'hidden',
        }}>

            {/* Label column — "PREDICT" identifier with live accent dot */}
            <div style={{
                padding:        '0 16px',
                flexShrink:     0,
                borderRight:    '1px solid var(--border-subtle)',
                height:         '100%',
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            5,
                minWidth:       88,
            }}>
                <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      'clamp(0.56rem, 0.72vw, 0.66rem)',
                    letterSpacing: '0.14em',
                    color:         'var(--text-muted)',
                    textTransform: 'uppercase',
                }}>
                    Predict
                </span>
                <div style={{
                    width:      7,
                    height:     7,
                    borderRadius: '50%',
                    background:   'var(--accent-secondary)',
                    boxShadow:    '0 0 7px var(--accent-secondary)',
                }} />
            </div>

            {/* Slot picker — time-horizon selector buttons */}
            <div style={{
                display:     'flex',
                alignItems:  'center',
                gap:         3,
                padding:     '0 10px',
                flexShrink:  0,
                borderRight: '1px solid var(--border-subtle)',
                height:      '100%',
            }}>
                {slotMeta.map(m => (
                    <SlotButton
                        key={m.slot}
                        {...m}
                        active={m.slot === activeSlot}
                        onClick={() => setSlot(m.slot)}
                    />
                ))}
            </div>

            {/* Snapshot details — hotspots + demand badges + events */}
            <div style={{
                flex:       1,
                display:    'flex',
                alignItems: 'center',
                gap:        10,
                padding:    '0 14px',
                overflow:   'hidden',
                height:     '100%',
            }}>

                {/* Hotspot severity dots */}
                {snapshot.hotspots.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      'clamp(0.58rem, 0.72vw, 0.68rem)',
                            color:         'var(--text-muted)',
                            letterSpacing: '0.07em',
                            marginRight:   2,
                        }}>
                            HOTSPOTS
                        </span>
                        {snapshot.hotspots.slice(0, 4).map((h, i) => (
                            <div key={i} style={{
                                width:      8,
                                height:     8,
                                borderRadius: '50%',
                                background: SEVERITY_COLORS[h.severity as keyof typeof SEVERITY_COLORS],
                                boxShadow:  h.severity === 'critical'
                                    ? `0 0 5px ${SEVERITY_COLORS.critical}` : 'none',
                            }} />
                        ))}
                        {snapshot.hotspots.length > 4 && (
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.56rem, 0.7vw, 0.64rem)',
                                color:      'var(--text-muted)',
                            }}>
                                +{snapshot.hotspots.length - 4}
                            </span>
                        )}
                    </div>
                ) : (
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'clamp(0.62rem, 0.8vw, 0.72rem)',
                        color:         'var(--status-online)',
                        letterSpacing: '0.07em',
                        flexShrink:    0,
                    }}>
                        ✓ No hotspots predicted
                    </span>
                )}

                {/* Vertical divider */}
                <div style={{ width: 1, height: 22, background: 'var(--border-subtle)', flexShrink: 0 }} />

                <DemandBadge label={`Parking · ${snapshot.parkingDemand}`} level={snapshot.parkingDemand} />
                <DemandBadge label={`PT delay · ${snapshot.ptDelayRisk}`}  level={snapshot.ptDelayRisk} />

                {snapshot.weatherImpact !== 'none' && (
                    <DemandBadge
                        label={`Weather · ${snapshot.weatherImpact}`}
                        level={
                            snapshot.weatherImpact === 'severe'   ? 'high' :
                            snapshot.weatherImpact === 'moderate' ? 'moderate' : 'low'
                        }
                    />
                )}

                {snapshot.eventImpact && (
                    <>
                        <div style={{ width: 1, height: 22, background: 'var(--border-subtle)', flexShrink: 0 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>🏟</span>
                            <span style={{
                                fontFamily:   'var(--font-mono)',
                                fontSize:     'clamp(0.62rem, 0.8vw, 0.72rem)',
                                color:        'var(--severity-medium)',
                                overflow:     'hidden',
                                whiteSpace:   'nowrap',
                                textOverflow: 'ellipsis',
                            }}>
                                {snapshot.eventImpact}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Forecast badge — only shown when a future slot is active */}
            {activeSlot !== 'now' && (
                <div style={{
                    flexShrink:  0,
                    padding:     '0 14px',
                    borderLeft:  '1px solid var(--border-subtle)',
                    height:      '100%',
                    display:     'flex',
                    alignItems:  'center',
                }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'clamp(0.58rem, 0.72vw, 0.68rem)',
                        letterSpacing: '0.09em',
                        color:         'var(--accent-secondary)',
                    }}>
                        ⟁ FORECAST
                    </span>
                </div>
            )}
        </div>
    );
}