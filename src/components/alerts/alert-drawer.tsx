'use client';

import { useEffect, useState } from 'react';
import type { Alert } from '@/types';
import {
    SEVERITY_COLORS,
    SEVERITY_BG,
    SEVERITY_BORDER,
    ALERT_TYPE_LABELS,
    formatRelativeTime,
    formatTime,
    confidenceLevel,
    CONFIDENCE_COLORS,
} from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface AlertDrawerProps {
    alert:     Alert | null;
    onClose:   () => void;
    onApprove: (id: string) => void;
    onIgnore:  (id: string, reason: string) => void;
    onDispatch?:  (id: string) => void;
    onEscalate?:  (id: string) => void;
}

export function AlertDrawer({
                                alert,
                                onClose,
                                onApprove,
                                onIgnore,
                                onDispatch,
                                onEscalate,
                            }: AlertDrawerProps) {
    const { hasPermission } = useAuth();
    const [ignoreReason, setIgnoreReason]   = useState('');
    const [showIgnoreBox, setShowIgnoreBox] = useState(false);
    const [acted, setActed] = useState<{ label: string; at: string } | null>(null);

    // Reset state when alert changes
    useEffect(() => {
        setIgnoreReason('');
        setShowIgnoreBox(false);
        setActed(null);
    }, [alert?.id]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const isOpen = alert !== null;

    const handleApprove = () => {
        if (!alert) return;
        onApprove(alert.id);
        setActed({ label: 'approved', at: formatTime(new Date()) });
    };

    const handleIgnore = () => {
        if (!alert) return;
        if (!showIgnoreBox) { setShowIgnoreBox(true); return; }
        if (ignoreReason.trim().length < 10) return;
        onIgnore(alert.id, ignoreReason.trim());
        setActed({ label: 'ignored', at: formatTime(new Date()) });
        setShowIgnoreBox(false);
    };

    const handleDispatch = () => {
        if (!alert || !onDispatch) return;
        onDispatch(alert.id);
        setActed({ label: 'dispatched', at: formatTime(new Date()) });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position:   'fixed',
                    inset:      0,
                    zIndex:     800,
                    background: 'rgba(8,11,15,0.5)',
                    opacity:    isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition: 'opacity 250ms ease',
                }}
            />

            {/* Drawer */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={alert ? `Alert: ${alert.title}` : 'Alert detail'}
                style={{
                    position:   'fixed',
                    top:        0,
                    right:      0,
                    bottom:     0,
                    width:      380,
                    zIndex:     900,
                    background: 'var(--bg-raised)',
                    borderLeft: `1px solid ${alert ? SEVERITY_BORDER[alert.severity] : 'var(--border-default)'}`,
                    transform:  isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 280ms cubic-bezier(0.32,0,0.15,1)',
                    display:    'flex',
                    flexDirection: 'column',
                    overflow:   'hidden',
                }}
            >
                {alert && (
                    <>
                        {/* ── Header ── */}
                        <div style={{
                            padding:      '14px 16px 12px',
                            borderBottom: `1px solid ${SEVERITY_BORDER[alert.severity]}`,
                            background:   SEVERITY_BG[alert.severity],
                            flexShrink:   0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                {/* Severity bar */}
                                <div style={{
                                    width:        3,
                                    alignSelf:    'stretch',
                                    background:   SEVERITY_COLORS[alert.severity],
                                    borderRadius: 2,
                                    flexShrink:   0,
                                    boxShadow:    `0 0 8px ${SEVERITY_COLORS[alert.severity]}`,
                                }} />

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Type + severity */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.55rem',
                        letterSpacing: '0.12em',
                        color:         SEVERITY_COLORS[alert.severity],
                        textTransform: 'uppercase',
                    }}>
                      {alert.severity} · {ALERT_TYPE_LABELS[alert.type]}
                    </span>
                                        {alert.status === 'acknowledged' && (
                                            <span style={{
                                                fontFamily:    'var(--font-mono)',
                                                fontSize:      '0.5rem',
                                                letterSpacing: '0.1em',
                                                color:         'var(--status-online)',
                                                padding:       '1px 5px',
                                                border:        '1px solid var(--status-online)',
                                                borderRadius:  3,
                                            }}>
                        ACK
                      </span>
                                        )}
                                        <div style={{ flex: 1 }} />
                                        <button
                                            onClick={onClose}
                                            aria-label="Close"
                                            style={{
                                                width:      24,
                                                height:     24,
                                                display:    'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'rgba(255,255,255,0.05)',
                                                border:     '1px solid var(--border-default)',
                                                borderRadius: 4,
                                                cursor:     'pointer',
                                                color:      'var(--text-muted)',
                                                fontSize:   '0.8rem',
                                                outline:    'none',
                                                flexShrink: 0,
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Title */}
                                    <h2 style={{
                                        fontFamily:   'var(--font-display)',
                                        fontSize:     '0.9rem',
                                        fontWeight:   700,
                                        color:        'var(--text-primary)',
                                        lineHeight:   1.3,
                                        margin:       0,
                                        marginBottom: 4,
                                    }}>
                                        {alert.title}
                                    </h2>

                                    {/* Location */}
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '0.62rem',
                                        color:      'var(--text-muted)',
                                    }}>
                    📍 {alert.location.label} · {alert.location.zone}
                  </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Scrollable body ── */}
                        <div style={{
                            flex:     1,
                            overflow: 'auto',
                            padding:  '14px 16px',
                            display:  'flex',
                            flexDirection: 'column',
                            gap:      14,
                        }}>

                            {/* Description */}
                            <div>
                                <SectionLabel>DESCRIPTION</SectionLabel>
                                <p style={{
                                    fontFamily:  'var(--font-mono)',
                                    fontSize:    '0.7rem',
                                    color:       'var(--text-secondary)',
                                    lineHeight:  1.6,
                                    margin:      0,
                                }}>
                                    {alert.description}
                                </p>
                            </div>

                            {/* Metadata grid */}
                            <div style={{
                                display:             'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap:                 8,
                            }}>
                                <MetaCell label="DETECTED" value={formatTime(alert.detectedAt)} sub={formatRelativeTime(alert.detectedAt)} />
                                <MetaCell label="LAST UPDATE" value={formatTime(alert.updatedAt)} sub={formatRelativeTime(alert.updatedAt)} />
                                <MetaCell
                                    label="AI CONFIDENCE"
                                    value={`${alert.confidence}%`}
                                    sub={confidenceLevel(alert.confidence).toUpperCase()}
                                    valueColor={CONFIDENCE_COLORS[confidenceLevel(alert.confidence)]}
                                />
                                <MetaCell
                                    label="AFFECTED SIGNALS"
                                    value={String(alert.affectedIntersections.length || '—')}
                                    sub="intersections"
                                />
                            </div>

                            {/* Confidence bar */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                    <SectionLabel>CONFIDENCE</SectionLabel>
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '0.6rem',
                                        color:      CONFIDENCE_COLORS[confidenceLevel(alert.confidence)],
                                    }}>
                    {confidenceLevel(alert.confidence).toUpperCase()}
                  </span>
                                </div>
                                <div style={{
                                    height:       6,
                                    background:   'var(--bg-elevated)',
                                    borderRadius: 3,
                                    overflow:     'hidden',
                                }}>
                                    <div style={{
                                        height:       '100%',
                                        width:        `${alert.confidence}%`,
                                        background:   CONFIDENCE_COLORS[confidenceLevel(alert.confidence)],
                                        borderRadius: 3,
                                        transition:   'width 600ms ease',
                                    }} />
                                </div>
                            </div>

                            {/* Suggested action */}
                            {alert.suggestedAction && (
                                <div style={{
                                    padding:      10,
                                    background:   'rgba(59,158,255,0.06)',
                                    border:       '1px solid rgba(59,158,255,0.18)',
                                    borderRadius: 8,
                                    borderLeft:   '3px solid var(--accent-primary)',
                                }}>
                                    <SectionLabel>AI SUGGESTION</SectionLabel>
                                    <p style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '0.68rem',
                                        color:      'var(--text-secondary)',
                                        margin:     0,
                                        lineHeight: 1.5,
                                    }}>
                                        {alert.suggestedAction}
                                    </p>
                                </div>
                            )}

                            {/* Affected intersections */}
                            {alert.affectedIntersections.length > 0 && (
                                <div>
                                    <SectionLabel>AFFECTED INTERSECTIONS</SectionLabel>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                                        {alert.affectedIntersections.map(id => (
                                            <span key={id} style={{
                                                fontFamily:    'var(--font-mono)',
                                                fontSize:      '0.58rem',
                                                padding:       '2px 7px',
                                                background:    'var(--bg-elevated)',
                                                border:        '1px solid var(--border-default)',
                                                borderRadius:  4,
                                                color:         'var(--text-secondary)',
                                                letterSpacing: '0.06em',
                                            }}>
                        {id}
                      </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action result banner */}
                            {acted && (
                                <div style={{
                                    padding:      10,
                                    background:   'rgba(34,197,94,0.1)',
                                    border:       '1px solid rgba(34,197,94,0.3)',
                                    borderRadius: 8,
                                    display:      'flex',
                                    alignItems:   'center',
                                    gap:          8,
                                    animation:    'slide-in-up 200ms ease',
                                }}>
                                    <span style={{ fontSize: '0.9rem' }}>✓</span>
                                    <span style={{
                                        fontFamily:    'var(--font-mono)',
                                        fontSize:      '0.65rem',
                                        color:         'var(--status-online)',
                                        letterSpacing: '0.06em',
                                    }}>
                    Action logged: {acted.label.toUpperCase()} — {acted.at}
                  </span>
                                </div>
                            )}

                            {/* Ignore reason input */}
                            {showIgnoreBox && (
                                <div style={{ animation: 'slide-in-up 200ms ease' }}>
                                    <SectionLabel>REASON FOR IGNORING (required)</SectionLabel>
                                    <textarea
                                        value={ignoreReason}
                                        onChange={e => setIgnoreReason(e.target.value)}
                                        placeholder="Minimum 10 characters — logged to audit trail"
                                        autoFocus
                                        rows={3}
                                        style={{
                                            width:        '100%',
                                            padding:      '8px 10px',
                                            background:   'var(--bg-elevated)',
                                            border:       `1px solid ${ignoreReason.length > 0 && ignoreReason.length < 10
                                                ? 'var(--severity-high)'
                                                : 'var(--border-default)'
                                            }`,
                                            borderRadius: 6,
                                            color:        'var(--text-primary)',
                                            fontFamily:   'var(--font-mono)',
                                            fontSize:     '0.68rem',
                                            lineHeight:   1.5,
                                            resize:       'vertical',
                                            outline:      'none',
                                            marginTop:    5,
                                            boxSizing:    'border-box',
                                        }}
                                    />
                                    <span style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   '0.55rem',
                                        color:      ignoreReason.length < 10
                                            ? 'var(--severity-high)'
                                            : 'var(--status-online)',
                                        display:    'block',
                                        marginTop:  3,
                                    }}>
                    {ignoreReason.length} / 10 minimum
                  </span>
                                </div>
                            )}
                        </div>

                        {/* ── Action footer ── */}
                        {!acted && (
                            <div style={{
                                padding:      '12px 16px',
                                borderTop:    '1px solid var(--border-default)',
                                background:   'var(--bg-base)',
                                display:      'flex',
                                gap:          8,
                                flexShrink:   0,
                            }}>
                                {hasPermission('approve_signal') && (
                                    <DrawerBtn
                                        label="Approve"
                                        color="var(--status-online)"
                                        onClick={handleApprove}
                                        primary
                                    />
                                )}
                                {hasPermission('dispatch_unit') && onDispatch && (
                                    <DrawerBtn
                                        label="Dispatch"
                                        color="var(--severity-high)"
                                        onClick={handleDispatch}
                                    />
                                )}
                                {onEscalate && alert?.status !== 'escalated' && (
                                    <DrawerBtn
                                        label="↑ Escalate"
                                        color="var(--accent-secondary)"
                                        onClick={() => { onEscalate(alert!.id); setActed({ label: 'escalated', at: formatTime(new Date()) }); }}
                                    />
                                )}
                                <DrawerBtn
                                    label={showIgnoreBox ? 'Confirm Ignore' : 'Ignore'}
                                    color="var(--text-muted)"
                                    onClick={handleIgnore}
                                    disabled={showIgnoreBox && ignoreReason.trim().length < 10}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}

// ── Small helpers ─────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.55rem',
            letterSpacing: '0.12em',
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom:  4,
        }}>
            {children}
        </div>
    );
}

function MetaCell({
                      label,
                      value,
                      sub,
                      valueColor,
                  }: {
    label:       string;
    value:       string;
    sub?:        string;
    valueColor?: string;
}) {
    return (
        <div style={{
            padding:      '8px 10px',
            background:   'var(--bg-elevated)',
            borderRadius: 6,
            border:       '1px solid var(--border-subtle)',
        }}>
            <div style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.52rem',
                letterSpacing: '0.1em',
                color:         'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom:  3,
            }}>
                {label}
            </div>
            <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   '0.82rem',
                fontWeight: 500,
                color:      valueColor ?? 'var(--text-primary)',
                lineHeight: 1,
            }}>
                {value}
            </div>
            {sub && (
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '0.52rem',
                    color:      'var(--text-disabled)',
                    marginTop:  2,
                }}>
                    {sub}
                </div>
            )}
        </div>
    );
}

function DrawerBtn({
                       label,
                       color,
                       onClick,
                       primary,
                       disabled,
                   }: {
    label:    string;
    color:    string;
    onClick:  () => void;
    primary?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                flex:          primary ? 1.5 : 1,
                padding:       '8px 10px',
                background:    primary ? `${color}18` : 'rgba(255,255,255,0.04)',
                border:        `1px solid ${primary ? `${color}45` : 'rgba(255,255,255,0.1)'}`,
                borderRadius:  6,
                cursor:        disabled ? 'not-allowed' : 'pointer',
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.65rem',
                fontWeight:    600,
                letterSpacing: '0.06em',
                color:         disabled ? 'var(--text-disabled)' : color,
                transition:    'all 150ms ease',
                outline:       'none',
                opacity:       disabled ? 0.5 : 1,
            }}
        >
            {label}
        </button>
    );
}