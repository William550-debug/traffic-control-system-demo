'use client';

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

interface AlertCardProps {
    alert:          Alert;
    focused:        boolean;
    pendingAction?: AlertPendingAction;
    onSelect:       (alert: Alert) => void;
    onApprove:      (id: string) => void;
    onIgnore:       (id: string) => void;
    onDispatch?:    (id: string) => void;
}

export function AlertCard({
                              alert,
                              focused,
                              pendingAction,
                              onSelect,
                              onApprove,
                              onIgnore,
                              onDispatch,
                          }: AlertCardProps) {
    const { hasPermission } = useAuth();

    const color          = SEVERITY_COLORS[alert.severity];
    const bg             = SEVERITY_BG[alert.severity];
    const border         = SEVERITY_BORDER[alert.severity];
    const confLevel      = confidenceLevel(alert.confidence);
    const confColor      = CONFIDENCE_COLORS[confLevel];
    const isAcknowledged = alert.status === 'acknowledged';
    const isPending      = !!pendingAction;

    return (
        <div
            onClick={() => !isPending && onSelect(alert)}
            style={{
                padding:      '10px 11px',
                background:   focused ? 'rgba(59,158,255,0.07)' : bg,
                border:       `1px solid ${focused ? 'rgba(59,158,255,0.35)' : border}`,
                borderLeft:   `3px solid ${color}`,
                borderRadius: 8,
                cursor:       isPending ? 'wait' : 'pointer',
                transition:   'all 180ms ease',
                animation:    'slide-in-up 200ms ease both',
                position:     'relative',
                overflow:     'hidden',
                opacity:      isPending ? 0.85 : 1,
            }}
        >
            {/* Acknowledged dim overlay */}
            {isAcknowledged && !isPending && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(12,17,23,0.35)',
                    pointerEvents: 'none', borderRadius: 8,
                }} />
            )}

            {/* Pending shimmer overlay */}
            {isPending && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 8,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(59,158,255,0.06) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.2s linear infinite',
                }} />
            )}

            {/* Top row: type + confidence + time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
            letterSpacing: '0.1em', color, textTransform: 'uppercase', flexShrink: 0,
        }}>
          {ALERT_TYPE_LABELS[alert.type]}
        </span>

                <div style={{ flex: 1 }} />

                {/* Confidence pill */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '1px 5px', background: `${confColor}18`,
                    border: `1px solid ${confColor}30`, borderRadius: 3,
                }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: confColor, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: confColor }}>
            {alert.confidence}%
          </span>
                </div>

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
                color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 3,
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
                {alert.title}
            </div>

            {/* Location */}
            <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                color: 'var(--text-muted)', marginBottom: 8,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            }}>
                📍 {alert.location.label}
            </div>

            {/* Quick actions */}
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4 }}>
                {hasPermission('approve_signal') && (
                    <ActionBtn
                        label="Approve"
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
                <ActionBtn
                    label="Ignore"
                    color="var(--text-muted)"
                    pending={pendingAction === 'ignore'}
                    disabled={isPending}
                    onClick={() => onIgnore(alert.id)}
                    muted
                />
            </div>
        </div>
    );
}

// ── Inline action button ──────────────────
function ActionBtn({
                       label, color, pending, disabled, onClick, muted,
                   }: {
    label:    string;
    color:    string;
    pending:  boolean;
    disabled: boolean;
    onClick:  () => void;
    muted?:   boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                flex:          muted ? '0 0 auto' : 1,
                padding:       '3px 6px',
                background:    pending ? `${color}22` : 'rgba(255,255,255,0.04)',
                border:        `1px solid ${pending ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
                borderRadius:  4,
                cursor:        disabled ? 'wait' : 'pointer',
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.58rem',
                fontWeight:    500,
                color:         pending ? color : muted ? 'var(--text-muted)' : color,
                transition:    'all 150ms ease',
                outline:       'none',
                letterSpacing: '0.04em',
                whiteSpace:    'nowrap',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                gap:           4,
                opacity:       disabled && !pending ? 0.45 : 1,
            }}
        >
            {pending ? <Spinner color={color} /> : null}
            {pending ? 'Sending…' : label}
        </button>
    );
}

// ── Tiny CSS spinner ──────────────────────
function Spinner({ color }: { color: string }) {
    return (
        <span style={{
            display:     'inline-block',
            width:       8,
            height:      8,
            border:      `1.5px solid ${color}40`,
            borderTop:   `1.5px solid ${color}`,
            borderRadius:'50%',
            animation:   'spin 0.7s linear infinite',
            flexShrink:  0,
        }} />
    );
}