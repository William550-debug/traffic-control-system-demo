'use client';

import { useState } from 'react';
import { confidenceLevel, CONFIDENCE_COLORS } from '@/lib/utils';

// Module-level formatter — created once, not during render
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatTrainingAge(date: Date | string): string {
    const diffHours = Math.round(
        (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60)
    );
    // Use days if more than 48h ago
    if (Math.abs(diffHours) >= 48) {
        return relativeFormatter.format(Math.round(diffHours / 24), 'days');
    }
    return relativeFormatter.format(diffHours, 'hours');
}

interface ConfidenceIndicatorProps {
    confidence: number;
    metadata?: {
        dataCompleteness: number;
        lastTrainingUpdate: Date;
        modelVersion?: string;
    };
    compact?: boolean;
    requiresWarning?: boolean; // mode B low-confidence flag
}

export function ConfidenceIndicator({
                                        confidence,
                                        metadata,
                                        compact = false,
                                        requiresWarning = false,
                                    }: ConfidenceIndicatorProps) {
    const [expanded, setExpanded] = useState(false);
    const level = confidenceLevel(confidence);
    const color = CONFIDENCE_COLORS[level];
    const isLow = confidence < 70;

    if (compact) {
        return (
            <div
                title={`AI Confidence: ${confidence}%`}
                style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         4,
                    cursor:      metadata ? 'pointer' : 'default',
                }}
                onClick={() => metadata && setExpanded(v => !v)}
            >
                {isLow && requiresWarning && (
                    <span style={{ fontSize: '0.6rem' }} title="Low confidence — manual review required">⚠</span>
                )}
                <div style={{
                    width:        32, height: 4,
                    background:   'var(--bg-elevated)',
                    borderRadius: 2, overflow: 'hidden',
                }}>
                    <div style={{
                        height:       '100%',
                        width:        `${confidence}%`,
                        background:   color,
                        borderRadius: 2,
                        transition:   'width 400ms ease',
                    }} />
                </div>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '0.52rem',
                    color:      color,
                    minWidth:   24,
                }}>
          {confidence}%
        </span>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            <div
                onClick={() => metadata && setExpanded(v => !v)}
                style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        6,
                    cursor:     metadata ? 'pointer' : 'default',
                }}
            >
                {isLow && requiresWarning && (
                    <span
                        title="Low confidence — manual review required"
                        style={{ fontSize: '0.65rem' }}
                    >⚠</span>
                )}
                <div style={{
                    flex: 1, height: 5,
                    background:   'var(--bg-elevated)',
                    borderRadius: 3, overflow: 'hidden',
                }}>
                    <div style={{
                        height:       '100%',
                        width:        `${confidence}%`,
                        background:   `linear-gradient(90deg, ${color}90, ${color})`,
                        borderRadius: 3,
                        transition:   'width 400ms ease',
                        boxShadow:    confidence > 90 ? `0 0 4px ${color}` : 'none',
                    }} />
                </div>
                <span style={{
                    fontFamily:  'var(--font-mono)',
                    fontSize:    '0.58rem',
                    fontWeight:  600,
                    color,
                    minWidth:    28,
                    textAlign:   'right',
                }}>
          {confidence}%
        </span>
                {metadata && (
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                        color: 'var(--text-disabled)',
                    }}>
            {expanded ? '▲' : '▼'}
          </span>
                )}
            </div>

            {/* Expanded metadata tooltip */}
            {expanded && metadata && (
                <div style={{
                    position:    'absolute',
                    bottom:      'calc(100% + 6px)',
                    right:       0,
                    width:       200,
                    background:  'var(--bg-overlay)',
                    border:      '1px solid var(--border-strong)',
                    borderRadius:8,
                    padding:     10,
                    zIndex:      999,
                    boxShadow:   '0 4px 16px rgba(0,0,0,0.4)',
                    animation:   'fade-in 150ms ease both',
                }}>
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'var(--text-disabled)', marginBottom: 6,
                    }}>
                        Confidence Breakdown
                    </div>

                    <Row label="Score" value={`${confidence}%`} color={color} />
                    <Row label="Data completeness" value={`${metadata.dataCompleteness}%`}
                         color={metadata.dataCompleteness > 90 ? 'var(--status-online)' : 'var(--status-degraded)'} />
                    <Row label="Last trained" value={formatTrainingAge(metadata.lastTrainingUpdate)} />
                    {metadata.modelVersion && (
                        <Row label="Model" value={metadata.modelVersion} />
                    )}

                    {isLow && (
                        <div style={{
                            marginTop:   8, padding: '4px 8px',
                            background:  'rgba(255,59,59,0.08)',
                            border:      '1px solid rgba(255,59,59,0.2)',
                            borderRadius:4,
                            fontFamily:  'var(--font-mono)', fontSize: '0.52rem',
                            color:       'var(--severity-critical)',
                        }}>
                            ⚠ Manual review required
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
        {label}
      </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: color ?? 'var(--text-primary)' }}>
        {value}
      </span>
        </div>
    );
}