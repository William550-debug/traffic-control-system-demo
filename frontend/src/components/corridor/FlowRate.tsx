'use client';

import { flowPercent, flowSeverity, SEVERITY_COLORS, formatNumber } from '@/lib/utils';

interface FlowRateBarProps {
    flowRate:     number;
    capacityRate: number;
    avgSpeedKph:  number;
}

export function FlowRateBar({ flowRate, capacityRate, avgSpeedKph }: FlowRateBarProps) {
    const pct      = flowPercent(flowRate, capacityRate);
    const severity = flowSeverity(pct);
    const color    = SEVERITY_COLORS[severity];

    // Segment thresholds
    const segments = [
        { threshold: 30,  color: 'var(--status-online)' },
        { threshold: 55,  color: 'var(--severity-low)'  },
        { threshold: 75,  color: 'var(--severity-medium)' },
        { threshold: 90,  color: 'var(--severity-high)'  },
        { threshold: 100, color: 'var(--severity-critical)' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Header metrics */}
            <div style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap:                 6,
            }}>
                {[
                    { label: 'Flow',     value: `${formatNumber(flowRate)}`, unit: 'veh/h' },
                    { label: 'Capacity', value: `${formatNumber(capacityRate)}`, unit: 'veh/h' },
                    { label: 'Avg Speed', value: `${avgSpeedKph}`, unit: 'km/h' },
                ].map(m => (
                    <div key={m.label} style={{
                        padding:      '6px 8px',
                        background:   'var(--bg-elevated)',
                        borderRadius: 6,
                        border:       '1px solid var(--border-subtle)',
                        textAlign:    'center',
                    }}>
                        <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   '0.75rem',
                            fontWeight: 600,
                            color:      'var(--text-primary)',
                            lineHeight: 1,
                        }}>
                            {m.value}
                            <span style={{
                                fontSize:      '0.5rem',
                                color:         'var(--text-muted)',
                                marginLeft:    2,
                                fontWeight:    400,
                            }}>
                {m.unit}
              </span>
                        </div>
                        <div style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '0.5rem',
                            color:         'var(--text-muted)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            marginTop:     2,
                        }}>
                            {m.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Segmented bar */}
            <div>
                <div style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    marginBottom:   4,
                }}>
          <span style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.55rem',
              color:         'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
          }}>
            Utilisation
          </span>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '0.65rem',
                        fontWeight: 600,
                        color,
                    }}>
            {pct}%
          </span>
                </div>

                {/* Track */}
                <div style={{
                    height:       8,
                    background:   'var(--bg-elevated)',
                    borderRadius: 4,
                    overflow:     'hidden',
                    position:     'relative',
                }}>
                    {/* Threshold markers */}
                    {[30, 55, 75, 90].map(t => (
                        <div key={t} style={{
                            position:   'absolute',
                            top:        0,
                            bottom:     0,
                            left:       `${t}%`,
                            width:      1,
                            background: 'rgba(255,255,255,0.08)',
                            zIndex:     1,
                        }} />
                    ))}

                    {/* Fill */}
                    <div style={{
                        height:       '100%',
                        width:        `${pct}%`,
                        background:   color,
                        borderRadius: 4,
                        transition:   'width 600ms ease, background 600ms ease',
                        position:     'relative',
                        zIndex:       2,
                    }} />
                </div>

                {/* Threshold labels */}
                <div style={{
                    display:  'flex',
                    position: 'relative',
                    marginTop: 3,
                    height:   10,
                }}>
                    {[
                        { pos: 0,   label: '0' },
                        { pos: 30,  label: '30%' },
                        { pos: 75,  label: '75%' },
                        { pos: 95,  label: '100%' },
                    ].map(({ pos, label }) => (
                        <span key={pos} style={{
                            position:   'absolute',
                            left:       `${pos}%`,
                            fontFamily: 'var(--font-mono)',
                            fontSize:   '0.48rem',
                            color:      'var(--text-disabled)',
                            transform:  pos > 80 ? 'translateX(-100%)' : 'none',
                        }}>
              {label}
            </span>
                    ))}
                </div>
            </div>
        </div>
    );
}