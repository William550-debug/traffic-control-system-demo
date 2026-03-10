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

// ── Single recommendation item ────────────
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
    const { hasPermission }             = useAuth();
    const [showRejectBox, setShowRejectBox] = useState(false);
    const [rejectReason, setRejectReason]   = useState('');
    const [acted, setActed]                 = useState<string | null>(null);

    const confLevel = confidenceLevel(rec.confidence);
    const confColor = CONFIDENCE_COLORS[confLevel];

    const handleApprove = () => {
        onApprove(rec.id);
        setActed('approved');
    };

    const handleModify = () => {
        onModify(rec.id);
        setActed('modified');
    };

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

    return (
        <div
            onClick={isActive ? undefined : onActivate}
            style={{
                padding:      isActive ? '10px 12px' : '8px 12px',
                background:   isActive ? 'rgba(59,158,255,0.06)' : 'transparent',
                border:       `1px solid ${isActive ? 'rgba(59,158,255,0.2)' : 'transparent'}`,
                borderRadius: 8,
                cursor:       isActive ? 'default' : 'pointer',
                transition:   'all 180ms ease',
            }}
        >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: isActive ? 6 : 3 }}>
        <span style={{ fontSize: '0.85rem', lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
          {INTERVENTION_ICONS[rec.interventionType] ?? '⚡'}
        </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily:  'var(--font-display)',
                        fontSize:    '0.7rem',
                        fontWeight:  600,
                        color:       'var(--text-primary)',
                        lineHeight:  1.3,
                        overflow:    'hidden',
                        display:     '-webkit-box',
                        WebkitLineClamp: isActive ? 2 : 1,
                        WebkitBoxOrient: 'vertical',
                    }}>
                        {rec.title}
                    </div>
                </div>

                {/* Confidence */}
                <div style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          3,
                    padding:      '2px 5px',
                    background:   `${confColor}15`,
                    border:       `1px solid ${confColor}30`,
                    borderRadius: 3,
                    flexShrink:   0,
                }}>
                    <div style={{
                        width:        4,
                        height:       4,
                        borderRadius: '50%',
                        background:   confColor,
                    }} />
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '0.52rem',
                        color:      confColor,
                    }}>
            {rec.confidence}%
          </span>
                </div>
            </div>

            {/* Expanded detail */}
            {isActive && (
                <div style={{ animation: 'fade-in 200ms ease' }}>
                    <p style={{
                        fontFamily:   'var(--font-mono)',
                        fontSize:     '0.62rem',
                        color:        'var(--text-muted)',
                        lineHeight:   1.5,
                        margin:       '0 0 10px',
                    }}>
                        {rec.description}
                    </p>

                    {/* Impact metrics */}
                    <div style={{
                        display:             'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap:                 6,
                        marginBottom:        10,
                    }}>
                        <ImpactCell
                            label="Congestion ↓"
                            value={`−${rec.expectedImpact.congestionReduction}%`}
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

                    {/* Expires */}
                    <div style={{
                        fontFamily:   'var(--font-mono)',
                        fontSize:     '0.55rem',
                        color:        'var(--text-disabled)',
                        marginBottom: 10,
                        letterSpacing:'0.06em',
                    }}>
                        Expires {formatRelativeTime(rec.expiresAt)} · Generated {formatRelativeTime(rec.generatedAt)}
                    </div>

                    {/* Action result */}
                    {acted && (
                        <div style={{
                            padding:      '6px 10px',
                            background:   acted === 'approved' ? 'rgba(34,197,94,0.1)' : acted === 'rejected' ? 'rgba(255,59,59,0.1)' : 'rgba(59,158,255,0.1)',
                            border:       `1px solid ${acted === 'approved' ? 'rgba(34,197,94,0.3)' : acted === 'rejected' ? 'rgba(255,59,59,0.3)' : 'rgba(59,158,255,0.3)'}`,
                            borderRadius: 6,
                            fontFamily:   'var(--font-mono)',
                            fontSize:     '0.62rem',
                            color:        acted === 'approved' ? 'var(--status-online)' : acted === 'rejected' ? 'var(--severity-critical)' : 'var(--accent-primary)',
                            animation:    'slide-in-up 200ms ease',
                            marginBottom: 8,
                        }}>
                            ✓ {acted.toUpperCase()} — logged to audit trail
                        </div>
                    )}

                    {/* Reject reason box */}
                    {showRejectBox && !acted && (
                        <div style={{ marginBottom: 8, animation: 'slide-in-up 180ms ease' }}>
                            <div style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      '0.55rem',
                                letterSpacing: '0.1em',
                                color:         'var(--text-muted)',
                                marginBottom:  4,
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
                                    padding:      '7px 9px',
                                    background:   'var(--bg-elevated)',
                                    border:       `1px solid ${rejectReason.length > 0 && rejectReason.length < 10
                                        ? 'var(--severity-high)'
                                        : 'var(--border-default)'
                                    }`,
                                    borderRadius: 5,
                                    color:        'var(--text-primary)',
                                    fontFamily:   'var(--font-mono)',
                                    fontSize:     '0.65rem',
                                    resize:       'none',
                                    outline:      'none',
                                    boxSizing:    'border-box',
                                    lineHeight:   1.4,
                                }}
                            />
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                <button
                                    onClick={handleRejectConfirm}
                                    disabled={rejectReason.trim().length < 10}
                                    style={{
                                        flex:          1,
                                        padding:       '5px',
                                        background:    rejectReason.trim().length >= 10 ? 'rgba(255,59,59,0.15)' : 'transparent',
                                        border:        '1px solid rgba(255,59,59,0.3)',
                                        borderRadius:  5,
                                        cursor:        rejectReason.trim().length >= 10 ? 'pointer' : 'not-allowed',
                                        fontFamily:    'var(--font-mono)',
                                        fontSize:      '0.6rem',
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
                                        padding:    '5px 10px',
                                        background: 'transparent',
                                        border:     '1px solid var(--border-default)',
                                        borderRadius: 5,
                                        cursor:     'pointer',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '0.6rem',
                                        color:      'var(--text-muted)',
                                        outline:    'none',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    {!acted && !showRejectBox && (
                        <div style={{ display: 'flex', gap: 5 }}>
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

function ImpactCell({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{
            padding:      '5px 7px',
            background:   'var(--bg-elevated)',
            borderRadius: 5,
            border:       '1px solid var(--border-subtle)',
            textAlign:    'center',
        }}>
            <div style={{
                fontFamily:  'var(--font-mono)',
                fontSize:    '0.75rem',
                fontWeight:  600,
                color,
                lineHeight:  1,
                marginBottom: 2,
            }}>
                {value}
            </div>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '0.5rem',
                color:      'var(--text-muted)',
                letterSpacing: '0.06em',
            }}>
                {label}
            </div>
        </div>
    );
}

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
                padding:       '5px 8px',
                background:    primary ? `${color}18` : 'rgba(255,255,255,0.04)',
                border:        `1px solid ${primary ? `${color}40` : 'rgba(255,255,255,0.08)'}`,
                borderRadius:  5,
                cursor:        'pointer',
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.6rem',
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

// ── Main card ─────────────────────────────
export function AIRecommendationCard({
                                         recommendations,
                                         onApprove,
                                         onReject,
                                         onModify,
                                     }: AIRecommendationCardProps) {
    const [isCollapsed, setIsCollapsed]   = useState(false);
    const [activeIndex, setActiveIndex]   = useState(0);

    if (recommendations.length === 0) return null;

    const top3 = recommendations.slice(0, 3);

    return (
        <div style={{
            position:     'absolute',
            bottom:       12,
            left:         12,
            zIndex:       500,
            width:        300,
            background:   'rgba(12,17,23,0.96)',
            border:       '1px solid rgba(59,158,255,0.2)',
            borderRadius: 10,
            backdropFilter: 'blur(16px)',
            boxShadow:    '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,158,255,0.05)',
            overflow:     'hidden',
            animation:    'slide-in-up 300ms ease',
        }}>

            {/* Header */}
            <div
                onClick={() => setIsCollapsed(p => !p)}
                style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            8,
                    padding:        '9px 12px',
                    borderBottom:   isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    cursor:         'pointer',
                    userSelect:     'none',
                }}
            >
                {/* AI pulse icon */}
                <div style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
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
                        inset:        4,
                        borderRadius: '50%',
                        background:   'var(--accent-primary)',
                    }} />
                </div>

                <span style={{
                    fontFamily:    'var(--font-display)',
                    fontSize:      '0.68rem',
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
                    fontSize:      '0.58rem',
                    padding:       '1px 6px',
                    background:    'rgba(59,158,255,0.15)',
                    border:        '1px solid rgba(59,158,255,0.3)',
                    borderRadius:  10,
                    color:         'var(--accent-primary)',
                }}>
          {top3.length}
        </span>

                {/* Collapse chevron */}
                <span style={{
                    fontSize:    '0.6rem',
                    color:       'var(--text-muted)',
                    transform:   isCollapsed ? 'rotate(180deg)' : 'none',
                    transition:  'transform 200ms ease',
                }}>
          ▲
        </span>
            </div>

            {/* Body */}
            {!isCollapsed && (
                <div style={{ padding: '6px 8px 8px' }}>
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