'use client';

import { useState, useEffect } from 'react';
import type { Alert, AlertPendingAction } from '@/types';
import {
    SEVERITY_COLORS,
    SEVERITY_BG,
    SEVERITY_BORDER,
    ALERT_TYPE_LABELS,
    formatRelativeTime,
    confidenceLevel,
    CONFIDENCE_COLORS,
} from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { ConfidenceIndicator } from './confidence-indicator';

interface AlertCardProps {
    alert:          Alert;
    focused:        boolean;
    pendingAction?: AlertPendingAction;
    isHumanMode?:   boolean;
    onSelect:       (alert: Alert) => void;
    onApprove:      (id: string) => void;
    onIgnore:       (id: string, reason?: string) => void;
    onDispatch?:    (id: string) => void;
    onEscalate?:    (id: string) => void;
}

export function AlertCard({
                              alert,
                              focused,
                              pendingAction,
                              isHumanMode = false,
                              onSelect,
                              onApprove,
                              onIgnore,
                              onDispatch,
                              onEscalate,
                          }: AlertCardProps) {
    const { hasPermission } = useAuth();
    const [showDismissReason, setShowDismissReason] = useState(false);
    const [dismissReason, setDismissReason]         = useState('');
    const [timeLeft, setTimeLeft]                   = useState<string | null>(null);
    const [timerUrgent, setTimerUrgent]             = useState(false);

    const color          = SEVERITY_COLORS[alert.severity];
    const bg             = SEVERITY_BG[alert.severity];
    const border         = SEVERITY_BORDER[alert.severity];
    const isAcknowledged = alert.status === 'acknowledged';
    const isEscalated    = alert.status === 'escalated';
    const isPending      = !!pendingAction;
    const isCritical     = alert.severity === 'critical';
    const isLowConf      = alert.confidence < 70;

    // Countdown timer
    useEffect(() => {
        if (!alert.timer) return;
        const update = () => {
            const diff = new Date(alert.timer!.expiresAt).getTime() - Date.now();
            if (diff <= 0) { setTimeLeft('EXPIRED'); setTimerUrgent(true); return; }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
            setTimerUrgent(alert.timer!.urgency === 'critical' && diff < 60000);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [alert.timer]);

    const handleIgnoreClick = () => {
        if (isHumanMode) {
            setShowDismissReason(true);
        } else {
            onIgnore(alert.id);
        }
    };

    const handleDismissConfirm = () => {
        if (!dismissReason.trim()) return;
        onIgnore(alert.id, dismissReason.trim());
        setShowDismissReason(false);
        setDismissReason('');
    };

    return (
        <div
            onClick={() => !isPending && !showDismissReason && onSelect(alert)}
            style={{
                padding:      '9px 11px',
                background:   focused ? 'rgba(59,158,255,0.07)' : bg,
                border:       `1px solid ${focused ? 'rgba(59,158,255,0.35)' : border}`,
                borderLeft:   `3px solid ${color}`,
                borderRadius: 8,
                cursor:       isPending || showDismissReason ? 'default' : 'pointer',
                transition:   'all 180ms ease',
                animation:    'slide-in-up 200ms ease both',
                position:     'relative',
                overflow:     'hidden',
                opacity:      isPending ? 0.85 : 1,
            }}
        >
            {/* Acknowledged dim overlay */}
            {(isAcknowledged || isEscalated) && !isPending && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(12,17,23,0.35)',
                    pointerEvents: 'none', borderRadius: 8,
                }} />
            )}

            {/* Pending shimmer */}
            {isPending && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 8,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(59,158,255,0.06) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.2s linear infinite',
                }} />
            )}

            {/* Human-mode banner */}
            {isHumanMode && (
                <div style={{
                    position:    'absolute', top: 0, right: 0,
                    padding:     '1px 7px',
                    background:  'rgba(245,197,24,0.12)',
                    borderRadius:'0 7px 0 6px',
                    fontFamily:  'var(--font-mono)', fontSize: '0.45rem',
                    letterSpacing:'0.1em', textTransform: 'uppercase',
                    color:       '#f5c518',
                }}>
                    Confirm required
                </div>
            )}

            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
            letterSpacing: '0.1em', color, textTransform: 'uppercase', flexShrink: 0,
        }}>
          {ALERT_TYPE_LABELS[alert.type]}
        </span>
                {alert.agency && (
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.48rem',
                        color: 'var(--text-disabled)', letterSpacing: '0.06em',
                    }}>
            · {alert.agency}
          </span>
                )}
                <div style={{ flex: 1 }} />

                {/* Timer */}
                {timeLeft && (
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                        color: timerUrgent ? 'var(--severity-critical)' : 'var(--severity-medium)',
                        animation: timerUrgent ? 'pulse-dot 1s ease infinite' : 'none',
                        letterSpacing: '0.04em', flexShrink: 0,
                    }}>
            ⏱ {timeLeft}
          </span>
                )}

                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                    color: 'var(--text-disabled)', flexShrink: 0,
                }}>
          {formatRelativeTime(alert.detectedAt)}
        </span>
            </div>

            {/* Title */}
            <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 600,
                color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
                {alert.title}
            </div>

            {/* Location */}
            <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.57rem',
                color: 'var(--text-muted)', marginBottom: 6,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
                📍 {alert.location.label}
            </div>

            {/* Impact metric if present */}
            {alert.impact && (
                <div style={{
                    display:      'flex', alignItems: 'center', gap: 6,
                    padding:      '3px 8px', marginBottom: 6,
                    background:   `${color}08`,
                    border:       `1px solid ${color}20`,
                    borderRadius: 4,
                }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)' }}>
            {alert.impact.metric}
          </span>
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                        fontWeight: 700, color,
                    }}>
            {alert.impact.value}{alert.impact.unit}
          </span>
                </div>
            )}

            {/* Confidence bar */}
            <div style={{ marginBottom: 7 }}>
                <ConfidenceIndicator
                    confidence={alert.confidence}
                    metadata={alert.confidenceMetadata}
                    compact
                    requiresWarning={isHumanMode && isLowConf}
                />
            </div>

            {/* Escalated / claimed status */}
            {(isEscalated || alert.claimedBy) && (
                <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                    color: 'var(--text-muted)', marginBottom: 6,
                }}>
                    {isEscalated && '↑ Escalated to supervisor · '}
                    {alert.claimedBy && `🔒 Handled by ${alert.claimedBy}`}
                </div>
            )}

            {/* Dismiss reason form */}
            {showDismissReason && (
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        marginBottom: 7,
                        padding:      8,
                        background:   'var(--bg-elevated)',
                        borderRadius: 6,
                        border:       '1px solid var(--border-default)',
                    }}
                >
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                        color: 'var(--text-muted)', marginBottom: 5,
                    }}>
                        Dismiss reason (required for audit)
                    </div>
                    <textarea
                        autoFocus
                        value={dismissReason}
                        onChange={e => setDismissReason(e.target.value)}
                        placeholder="Reason for dismissing this alert…"
                        rows={2}
                        style={{
                            width:       '100%',
                            padding:     '5px 8px',
                            background:  'var(--bg-base)',
                            border:      '1px solid var(--border-default)',
                            borderRadius:4,
                            fontFamily:  'var(--font-mono)',
                            fontSize:    '0.58rem',
                            color:       'var(--text-primary)',
                            resize:      'none',
                            outline:     'none',
                            boxSizing:   'border-box',
                        }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button
                            onClick={handleDismissConfirm}
                            disabled={!dismissReason.trim()}
                            style={{
                                flex:         1, padding: '4px',
                                background:   dismissReason.trim() ? 'rgba(255,59,59,0.12)' : 'transparent',
                                border:       `1px solid ${dismissReason.trim() ? 'rgba(255,59,59,0.4)' : 'var(--border-default)'}`,
                                borderRadius: 4, cursor: dismissReason.trim() ? 'pointer' : 'not-allowed',
                                fontFamily:   'var(--font-mono)', fontSize: '0.55rem',
                                color:        dismissReason.trim() ? 'var(--severity-critical)' : 'var(--text-disabled)',
                                outline:      'none',
                            }}
                        >
                            Confirm Dismiss
                        </button>
                        <button
                            onClick={() => { setShowDismissReason(false); setDismissReason(''); }}
                            style={{
                                padding: '4px 8px', background: 'transparent',
                                border: '1px solid var(--border-default)', borderRadius: 4,
                                cursor: 'pointer', fontFamily: 'var(--font-mono)',
                                fontSize: '0.55rem', color: 'var(--text-muted)', outline: 'none',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Quick actions */}
            {!showDismissReason && (
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                    {hasPermission('approve_signal') && (
                        <ActionBtn
                            label={isCritical && isHumanMode ? 'Confirm' : 'Approve'}
                            color="var(--status-online)"
                            pending={pendingAction === 'approve'}
                            disabled={isPending}
                            onClick={() => onApprove(alert.id)}
                        />
                    )}
                    {hasPermission('dispatch_unit') && onDispatch && (
                        <ActionBtn
                            label="Dispatch"
                            color="var(--severity-high)"
                            pending={pendingAction === 'dispatch'}
                            disabled={isPending}
                            onClick={() => onDispatch(alert.id)}
                        />
                    )}
                    {onEscalate && !isEscalated && (
                        <ActionBtn
                            label="↑"
                            color="var(--accent-secondary)"
                            pending={pendingAction === 'escalate'}
                            disabled={isPending}
                            onClick={() => onEscalate(alert.id)}
                            muted
                            title="Escalate to supervisor"
                        />
                    )}
                    {!isHumanMode ? (
                        <ActionBtn
                            label="Ignore"
                            color="var(--text-muted)"
                            pending={pendingAction === 'ignore'}
                            disabled={isPending}
                            onClick={handleIgnoreClick}
                            muted
                        />
                    ) : (
                        <ActionBtn
                            label="Dismiss"
                            color="var(--severity-critical)"
                            pending={pendingAction === 'ignore'}
                            disabled={isPending}
                            onClick={handleIgnoreClick}
                            muted
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// ── Inline action button ──────────────────
function ActionBtn({
                       label, color, pending, disabled, onClick, muted, title,
                   }: {
    label:    string;
    color:    string;
    pending:  boolean;
    disabled: boolean;
    onClick:  () => void;
    muted?:   boolean;
    title?:   string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                flex:           muted ? '0 0 auto' : 1,
                padding:        '3px 6px',
                background:     pending ? `${color}22` : 'rgba(255,255,255,0.04)',
                border:         `1px solid ${pending ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
                borderRadius:   4,
                cursor:         disabled ? 'wait' : 'pointer',
                fontFamily:     'var(--font-mono)',
                fontSize:       '0.58rem',
                fontWeight:     500,
                color:          pending ? color : muted ? 'var(--text-muted)' : color,
                transition:     'all 150ms ease',
                outline:        'none',
                letterSpacing:  '0.04em',
                whiteSpace:     'nowrap',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            4,
                opacity:        disabled && !pending ? 0.45 : 1,
            }}
        >
            {pending ? <Spinner color={color} /> : null}
            {pending ? 'Sending…' : label}
        </button>
    );
}

function Spinner({ color }: { color: string }) {
    return (
        <span style={{
            display:      'inline-block',
            width:        8, height: 8,
            border:       `1.5px solid ${color}40`,
            borderTop:    `1.5px solid ${color}`,
            borderRadius: '50%',
            animation:    'spin 0.7s linear infinite',
            flexShrink:   0,
        }} />
    );
}