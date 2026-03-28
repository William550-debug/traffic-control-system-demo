'use client';

import { useState } from 'react';
import type { Recommendation } from '@/types';
import { confidenceLevel, CONFIDENCE_COLORS, formatRelativeTime } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface AIRecommendationCardProps {
    recommendations: Recommendation[];
    onApprove: (id: string) => void;
    onReject:  (id: string, reason: string) => void;
    onModify:  (id: string) => void;
}

// ── Single recommendation item ─────────────────────────────────────────────
function RecommendationItem({
    rec,
    isActive,
    onActivate,
    onApprove,
    onReject,
    onModify,
}: {
    rec:        Recommendation;
    isActive:   boolean;
    onActivate: () => void;
    onApprove:  (id: string) => void;
    onReject:   (id: string, reason: string) => void;
    onModify:   (id: string) => void;
}) {
    const { hasPermission }                 = useAuth();
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [rejectReason, setRejectReason]   = useState('');
    const [acted, setActed]                 = useState<string | null>(null);

    const confLevel = confidenceLevel(rec.confidence);
    const confColor = CONFIDENCE_COLORS[confLevel];

    const handleApprove = () => { onApprove(rec.id); setActed('approved'); };
    const handleModify  = () => { onModify(rec.id);  setActed('modified'); };

    const handleRejectConfirm = () => {
        if (rejectReason.trim().length < 10) return;
        onReject(rec.id, rejectReason.trim());
        setActed('rejected');
        setShowRejectBox(false);
    };

    const INTERVENTION_ICONS: Record<string, string> = {
        signal_timing:       '🚦',
        corridor_activation: '🛣',
        dispatch:            '🚔',
        reroute:             '↩',
    };

    const detectionData    = rec.metadata?.detectionData;
    const hasDetectionData = detectionData && (detectionData.vehicleCount || detectionData.timeWindow);

    return (
        <div
            onClick={isActive ? undefined : onActivate}
            style={{
                /*
                 * Active items get slightly more vertical padding to breathe;
                 * inactive items stay compact to maximise list density.
                 * Horizontal padding is uniform so content columns align.
                 */
                padding:      isActive ? '12px 14px' : '10px 14px',
                background:   isActive ? 'rgba(59,158,255,0.07)' : 'transparent',
                border:       `1px solid ${isActive ? 'rgba(59,158,255,0.22)' : 'transparent'}`,
                borderRadius: 10,
                cursor:       isActive ? 'default' : 'pointer',
                transition:   'all 180ms ease',
                marginBottom: isActive ? 0 : 2,
            }}
        >
            {/* Top row — icon + title + confidence badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: isActive ? 8 : 4 }}>
                <span style={{ fontSize: '0.9rem', lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                    {INTERVENTION_ICONS[rec.interventionType] ?? '⚡'}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily:      'var(--font-display)',
                        /*
                         * clamp(min, preferred, max) — scales the title between
                         * a readable floor on compact screens and a comfortable
                         * ceiling on 80–120 inch wall displays.
                         */
                        fontSize:        'clamp(0.72rem, 0.9vw, 0.85rem)',
                        fontWeight:      600,
                        color:           'var(--text-primary)',
                        lineHeight:      1.35,
                        overflow:        'hidden',
                        display:         '-webkit-box',
                        WebkitLineClamp: isActive ? 2 : 1,
                        WebkitBoxOrient: 'vertical',
                    }}>
                        {rec.title}
                    </div>
                </div>

                {/* Confidence badge — always visible for rapid triage */}
                <div style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          4,
                    padding:      '3px 7px',
                    background:   `${confColor}15`,
                    border:       `1px solid ${confColor}30`,
                    borderRadius: 4,
                    flexShrink:   0,
                }}>
                    <div style={{
                        width: 5, height: 5, borderRadius: '50%', background: confColor,
                    }} />
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   'clamp(0.58rem, 0.72vw, 0.68rem)',
                        color:      confColor,
                    }}>
                        {rec.confidence}%
                    </span>
                </div>
            </div>

            {/* ── Expanded detail — only rendered for the active item ── */}
            {isActive && (
                <div style={{ animation: 'fade-in 200ms ease' }}>

                    {/* Description */}
                    <p style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   'clamp(0.65rem, 0.82vw, 0.75rem)',
                        color:      'var(--text-muted)',
                        lineHeight: 1.6,
                        margin:     '0 0 12px',
                    }}>
                        {rec.description}
                    </p>

                    {/* "Why this recommendation" — detection context */}
                    {hasDetectionData && (
                        <div style={{
                            marginBottom: 12,
                            padding:      '8px 10px',
                            background:   'rgba(59,158,255,0.08)',
                            border:       '1px solid rgba(59,158,255,0.16)',
                            borderRadius: 7,
                            fontFamily:   'var(--font-mono)',
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6,
                            }}>
                                <span style={{
                                    fontSize:      'clamp(0.58rem, 0.72vw, 0.68rem)',
                                    fontWeight:    700,
                                    letterSpacing: '0.07em',
                                    textTransform: 'uppercase',
                                    color:         'var(--accent-primary)',
                                }}>
                                    Why this recommendation
                                </span>
                                <span style={{
                                    fontSize:  'clamp(0.56rem, 0.68vw, 0.64rem)',
                                    color:     'var(--text-muted)',
                                    marginLeft: 'auto',
                                }}>
                                    detection
                                </span>
                            </div>

                            <div style={{
                                display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap',
                            }}>
                                <span style={{
                                    fontSize:   'clamp(0.72rem, 0.9vw, 0.82rem)',
                                    fontWeight: 600,
                                    color:      'var(--text-primary)',
                                }}>
                                    {detectionData.vehicleCount} vehicles
                                </span>
                                <span style={{
                                    fontSize: 'clamp(0.58rem, 0.72vw, 0.68rem)',
                                    color:    'var(--text-muted)',
                                }}>
                                    detected in
                                </span>
                                <span style={{
                                    fontSize:   'clamp(0.72rem, 0.9vw, 0.82rem)',
                                    fontWeight: 600,
                                    color:      'var(--accent-primary)',
                                }}>
                                    {detectionData.timeWindow}
                                </span>
                            </div>

                            {/* Confidence meter bar */}
                            <div style={{
                                marginTop: 7, display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <div style={{
                                    flex: 1, height: 3,
                                    background:   'rgba(255,255,255,0.1)',
                                    borderRadius: 2, overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width:        `${rec.confidence}%`,
                                        height:       '100%',
                                        background:   confColor,
                                        borderRadius: 2,
                                        transition:   'width 300ms ease',
                                    }} />
                                </div>
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize:   'clamp(0.58rem, 0.72vw, 0.68rem)',
                                    color:      confColor,
                                }}>
                                    {rec.confidence}% confidence
                                </span>
                            </div>

                            {/* Additional detection metadata */}
                            {detectionData.averageSpeed && (
                                <div style={{
                                    marginTop:    7,
                                    display:      'flex',
                                    gap:          10,
                                    fontSize:     'clamp(0.58rem, 0.72vw, 0.68rem)',
                                    color:        'var(--text-muted)',
                                    borderTop:    '1px solid rgba(255,255,255,0.06)',
                                    paddingTop:   7,
                                }}>
                                    <span>⚡ Avg speed: {detectionData.averageSpeed} mph</span>
                                    {detectionData.congestionLevel && (
                                        <span>🚦 Congestion: {detectionData.congestionLevel}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Impact metrics grid */}
                    {rec.expectedImpact && (
                        <div style={{
                            display:             'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap:                 7,
                            marginBottom:        12,
                        }}>
                            <ImpactCell
                                label="Congestion ↓"
                                value={`−${rec.expectedImpact.congestionReduction ?? 0}%`}
                                color="var(--status-online)"
                            />
                            {rec.expectedImpact.travelTimeSavedMinutes && (
                                <ImpactCell
                                    label="Travel time"
                                    value={`−${rec.expectedImpact.travelTimeSavedMinutes}m`}
                                    color="var(--accent-primary)"
                                />
                            )}
                            {rec.expectedImpact.fuelSavingsLiters && (
                                <ImpactCell
                                    label="Fuel saved"
                                    value={`${rec.expectedImpact.fuelSavingsLiters}L`}
                                    color="var(--severity-info)"
                                />
                            )}
                        </div>
                    )}

                    {/* Expiry / generated timestamps */}
                    <div style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'clamp(0.58rem, 0.72vw, 0.68rem)',
                        color:         'var(--text-disabled)',
                        marginBottom:  12,
                        letterSpacing: '0.06em',
                    }}>
                        Expires {formatRelativeTime(rec.expiresAt)} · Generated {formatRelativeTime(rec.generatedAt)}
                    </div>

                    {/* Action result banner */}
                    {acted && (
                        <div style={{
                            padding:      '8px 12px',
                            background:   acted === 'approved' ? 'rgba(34,197,94,0.1)' : acted === 'rejected' ? 'rgba(255,59,59,0.1)' : 'rgba(59,158,255,0.1)',
                            border:       `1px solid ${acted === 'approved' ? 'rgba(34,197,94,0.3)' : acted === 'rejected' ? 'rgba(255,59,59,0.3)' : 'rgba(59,158,255,0.3)'}`,
                            borderRadius: 7,
                            fontFamily:   'var(--font-mono)',
                            fontSize:     'clamp(0.65rem, 0.82vw, 0.75rem)',
                            color:        acted === 'approved' ? 'var(--status-online)' : acted === 'rejected' ? 'var(--severity-critical)' : 'var(--accent-primary)',
                            animation:    'slide-in-up 200ms ease',
                            marginBottom: 10,
                        }}>
                            ✓ {acted.toUpperCase()} — logged to audit trail
                        </div>
                    )}

                    {/* Reject reason textarea */}
                    {showRejectBox && !acted && (
                        <div style={{ marginBottom: 10, animation: 'slide-in-up 180ms ease' }}>
                            <div style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      'clamp(0.58rem, 0.72vw, 0.68rem)',
                                letterSpacing: '0.1em',
                                color:         'var(--text-muted)',
                                marginBottom:  5,
                                textTransform: 'uppercase',
                            }}>
                                Rejection reason (required)
                            </div>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Min 10 characters — audit trail"
                                rows={2}
                                autoFocus
                                style={{
                                    width:        '100%',
                                    padding:      '9px 12px',
                                    background:   'var(--bg-elevated)',
                                    border:       `1px solid ${rejectReason.length > 0 && rejectReason.length < 10
                                        ? 'var(--severity-high)'
                                        : 'var(--border-default)'
                                    }`,
                                    borderRadius: 6,
                                    color:        'var(--text-primary)',
                                    fontFamily:   'var(--font-mono)',
                                    fontSize:     'clamp(0.65rem, 0.82vw, 0.75rem)',
                                    resize:       'none',
                                    outline:      'none',
                                    boxSizing:    'border-box',
                                    lineHeight:   1.5,
                                }}
                            />
                            <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                                <button
                                    onClick={handleRejectConfirm}
                                    disabled={rejectReason.trim().length < 10}
                                    style={{
                                        flex:          1,
                                        padding:       '7px',
                                        background:    rejectReason.trim().length >= 10 ? 'rgba(255,59,59,0.15)' : 'transparent',
                                        border:        '1px solid rgba(255,59,59,0.3)',
                                        borderRadius:  6,
                                        cursor:        rejectReason.trim().length >= 10 ? 'pointer' : 'not-allowed',
                                        fontFamily:    'var(--font-mono)',
                                        fontSize:      'clamp(0.62rem, 0.78vw, 0.72rem)',
                                        color:         rejectReason.trim().length >= 10 ? 'var(--severity-critical)' : 'var(--text-disabled)',
                                        outline:       'none',
                                        transition:    'all 150ms ease',
                                    }}
                                >
                                    Confirm reject
                                </button>
                                <button
                                    onClick={() => setShowRejectBox(false)}
                                    style={{
                                        padding:      '7px 12px',
                                        background:   'transparent',
                                        border:       '1px solid var(--border-default)',
                                        borderRadius: 6,
                                        cursor:       'pointer',
                                        fontFamily:   'var(--font-mono)',
                                        fontSize:     'clamp(0.62rem, 0.78vw, 0.72rem)',
                                        color:        'var(--text-muted)',
                                        outline:      'none',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    {!acted && !showRejectBox && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            {hasPermission('approve_signal') && (
                                <RecBtn label="Approve" color="var(--status-online)" onClick={handleApprove} primary />
                            )}
                            <RecBtn label="Modify" color="var(--accent-primary)" onClick={handleModify} />
                            <RecBtn
                                label="Reject"
                                color="var(--severity-critical)"
                                onClick={() => setShowRejectBox(true)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Impact cell ────────────────────────────────────────────────────────────────
function ImpactCell({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{
            padding:      '8px 10px',
            background:   'var(--bg-elevated)',
            borderRadius: 6,
            border:       '1px solid var(--border-subtle)',
            textAlign:    'center',
        }}>
            {/* Value is the primary data point — larger, coloured */}
            <div style={{
                fontFamily:   'var(--font-mono)',
                fontSize:     'clamp(0.78rem, 1vw, 0.9rem)',
                fontWeight:   700,
                color,
                lineHeight:   1,
                marginBottom: 3,
            }}>
                {value}
            </div>
            <div style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      'clamp(0.54rem, 0.68vw, 0.64rem)',
                color:         'var(--text-muted)',
                letterSpacing: '0.06em',
            }}>
                {label}
            </div>
        </div>
    );
}

// ── Action button ──────────────────────────────────────────────────────────────
function RecBtn({
    label, color, onClick, primary,
}: {
    label: string; color: string; onClick: () => void; primary?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                flex:          primary ? 1.4 : 1,
                /*
                 * Increased vertical padding (7px vs original 5px) so tap
                 * targets are comfortable on touch-enabled operator consoles.
                 */
                padding:       '7px 10px',
                background:    primary ? `${color}18` : 'rgba(255,255,255,0.04)',
                border:        `1px solid ${primary ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
                borderRadius:  6,
                cursor:        'pointer',
                fontFamily:    'var(--font-mono)',
                fontSize:      'clamp(0.62rem, 0.78vw, 0.72rem)',
                fontWeight:    600,
                color:         primary ? color : 'var(--text-secondary)',
                letterSpacing: '0.05em',
                outline:       'none',
                transition:    'all 150ms ease',
            }}
        >
            {label}
        </button>
    );
}

// ── Main card ──────────────────────────────────────────────────────────────────
export function AIRecommendationCard({
    recommendations,
    onApprove,
    onReject,
    onModify,
}: AIRecommendationCardProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    if (recommendations.length === 0) return null;

    const top3 = recommendations.slice(0, 3);

    return (
        <div style={{
            position:   'absolute',
            bottom:     16,
            left:       16,
            zIndex:     500,
            /*
             * Width scales with viewport so the card remains proportional
             * on 80–120 inch displays without overflowing small screens.
             */
            width:          'clamp(300px, 22vw, 390px)',
            maxWidth:       'calc(100% - 32px)',
            background:     'rgba(12,17,23,0.97)',
            border:         '1px solid rgba(59,158,255,0.22)',
            borderRadius:   12,
            backdropFilter: 'blur(18px)',
            boxShadow:      '0 10px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,158,255,0.06)',
            overflow:       'hidden',
            animation:      'slide-in-up 300ms ease',
        }}>

            {/* Header — click to collapse/expand */}
            <div
                onClick={() => setIsCollapsed(p => !p)}
                style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          10,
                    padding:      '12px 16px',
                    borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.07)',
                    cursor:       'pointer',
                    userSelect:   'none',
                }}
            >
                {/* Animated AI pulse indicator */}
                <div style={{ position: 'relative', width: 18, height: 18, flexShrink: 0 }}>
                    <div style={{
                        position:     'absolute',
                        inset:        0,
                        borderRadius: '50%',
                        border:       '1px solid var(--accent-primary)',
                        opacity:      0.4,
                        animation:    'pulse-ring 2s ease-out infinite',
                    }} />
                    <div style={{
                        position:     'absolute',
                        inset:        5,
                        borderRadius: '50%',
                        background:   'var(--accent-primary)',
                    }} />
                </div>

                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      'clamp(0.72rem, 0.9vw, 0.82rem)',
                    fontWeight:    700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color:         'var(--text-primary)',
                    flex:          1,
                }}>
                    AI Recommendations
                </span>

                {/* Count badge */}
                <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      'clamp(0.6rem, 0.75vw, 0.7rem)',
                    padding:       '2px 8px',
                    background:    'rgba(59,158,255,0.15)',
                    border:        '1px solid rgba(59,158,255,0.3)',
                    borderRadius:  10,
                    color:         'var(--accent-primary)',
                }}>
                    {top3.length}
                </span>

                {/* Collapse chevron */}
                <span style={{
                    fontSize:   '0.65rem',
                    color:      'var(--text-muted)',
                    transform:  isCollapsed ? 'rotate(180deg)' : 'none',
                    transition: 'transform 200ms ease',
                }}>
                    ▲
                </span>
            </div>

            {/* Body */}
            {!isCollapsed && (
                <div style={{ padding: '10px 12px 12px' }}>
                    {top3.map((rec, i) => (
                        <RecommendationItem
                            key={rec.id}
                            rec={rec}
                            isActive={i === activeIndex}
                            onActivate={() => setActiveIndex(i)}
                            onApprove={onApprove}
                            onReject={onReject}
                            onModify={onModify}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}