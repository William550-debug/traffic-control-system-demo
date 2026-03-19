'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Alert, Agency } from '@/types';

interface AgencyNotification {
    agency:    Agency;
    notifiedAt:Date;
    status:    'notified' | 'acknowledged' | 'responding';
}

interface CrisisOverlayProps {
    alerts:         Alert[];
    onDismiss?:     () => void;
}

const AGENCY_LABELS: Record<Agency, string> = {
    traffic:    'Traffic Ops',
    emergency:  'Emergency Services',
    transport:  'Transport Authority',
    planning:   'Urban Planning',
};

const AGENCY_COLORS: Record<Agency, string> = {
    traffic:   '#3b9eff',
    emergency: '#ff3b3b',
    transport: '#f5c518',
    planning:  '#7c6af7',
};

function isCrisis(alert: Alert): boolean {
    return alert.severity === 'critical' || alert.status === 'active' && alert.type === 'emergency';
}

function getCrisisColor(alerts: Alert[]): { border: string; glow: string; label: string } {
    const hasEmergency = alerts.some(a => a.type === 'emergency');
    if (hasEmergency) return { border: '#a855f7', glow: 'rgba(168,85,247,0.15)', label: 'EMERGENCY' };
    return { border: '#ef4444', glow: 'rgba(239,68,68,0.12)', label: 'CRITICAL' };
}

export function CrisisOverlay({ alerts, onDismiss }: CrisisOverlayProps) {
    const crisisAlerts = alerts.filter(isCrisis);
    const [notifications, setNotifications] = useState<AgencyNotification[]>([]);
    const [dismissed, setDismissed]         = useState(false);
    const [visible, setVisible]             = useState(false);
    const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Activate when crisis alerts appear
    useEffect(() => {
        if (crisisAlerts.length > 0 && !dismissed) {
            setVisible(true);

            const agencies = new Set<Agency>();
            crisisAlerts.forEach(a => {
                if (a.agency) agencies.add(a.agency);
                a.affectedAgencies?.forEach(ag => agencies.add(ag));
            });
            agencies.add('emergency');
            agencies.add('traffic');

            const notifs: AgencyNotification[] = Array.from(agencies).map((agency, i) => ({
                agency,
                notifiedAt: new Date(Date.now() + i * 300),
                status: 'notified',
            }));
            setNotifications(notifs);

            // Clear any existing timers before registering new ones
            timerIds.current.forEach(clearTimeout);
            timerIds.current = [];

            notifs.forEach((_, i) => {
                timerIds.current.push(
                    setTimeout(() => {
                        setNotifications(prev => prev.map((n, j) =>
                            j === i ? { ...n, status: 'acknowledged' } : n
                        ));
                    }, 3000 + i * 1500)
                );
                timerIds.current.push(
                    setTimeout(() => {
                        setNotifications(prev => prev.map((n, j) =>
                            j === i ? { ...n, status: 'responding' } : n
                        ));
                    }, 8000 + i * 2000)
                );
            });
        } else if (crisisAlerts.length === 0) {
            setVisible(false);
            setDismissed(false);
        }

        return () => {
            timerIds.current.forEach(clearTimeout);
            timerIds.current = [];
        };
    }, [crisisAlerts.length, dismissed]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDismiss = useCallback(() => {
        setDismissed(true);
        setVisible(false);
        onDismiss?.();
    }, [onDismiss]);

    if (!visible || crisisAlerts.length === 0) return null;

    const { border, glow, label } = getCrisisColor(crisisAlerts);

    return (
        <>
            {/* Screen border pulse */}
            <div style={{
                position:      'fixed',
                inset:         0,
                zIndex:        700,
                pointerEvents: 'none',
                boxShadow:     `inset 0 0 0 3px ${border}, inset 0 0 40px ${glow}`,
                animation:     'pulse-ring 2s ease infinite',
            }} />

            {/* Crisis panel */}
            <div style={{
                position:    'fixed',
                top:         'calc(var(--status-bar-h) + 8px)',
                left:        8,
                width:       260,
                zIndex:      800,
                background:  'var(--bg-overlay)',
                border:      `1px solid ${border}50`,
                borderLeft:  `3px solid ${border}`,
                borderRadius:10,
                overflow:    'hidden',
                animation:   'slide-in-up 300ms ease both',
                boxShadow:   `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${glow}`,
            }}>

                {/* Header */}
                <div style={{
                    padding:    '10px 12px',
                    background: `${border}12`,
                    borderBottom:`1px solid ${border}30`,
                    display:    'flex', alignItems: 'center', gap: 8,
                }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: border, animation: 'pulse-dot 1s ease infinite',
                        flexShrink: 0,
                    }} />
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.6rem',
                        fontWeight:    700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color:         border,
                        flex:          1,
                    }}>
            {label} PROTOCOL
          </span>
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                        color: 'var(--text-disabled)',
                    }}>
            {crisisAlerts.length} active
          </span>
                    <button
                        onClick={handleDismiss}
                        style={{
                            padding:    '2px 6px',
                            background: 'transparent',
                            border:     'none', cursor: 'pointer',
                            color:      'var(--text-disabled)', fontSize: '0.75rem',
                            outline:    'none',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Active crisis alerts */}
                <div style={{ padding: '8px 12px', borderBottom: `1px solid var(--border-default)` }}>
                    {crisisAlerts.slice(0, 3).map(alert => (
                        <div key={alert.id} style={{
                            fontFamily:  'var(--font-mono)', fontSize: '0.58rem',
                            color:       'var(--text-primary)', marginBottom: 4,
                            paddingLeft: 10,
                            borderLeft:  `2px solid ${border}60`,
                        }}>
                            {alert.title}
                        </div>
                    ))}
                    {crisisAlerts.length > 3 && (
                        <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                            color: 'var(--text-muted)', paddingLeft: 10,
                        }}>
                            +{crisisAlerts.length - 3} more
                        </div>
                    )}
                </div>

                {/* Agency notification status */}
                <div style={{ padding: '8px 12px' }}>
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'var(--text-disabled)', marginBottom: 6,
                    }}>
                        Agency Notifications
                    </div>
                    {notifications.map(n => {
                        const color = AGENCY_COLORS[n.agency];
                        const statusIcon = {
                            notified:     '📡',
                            acknowledged: '✓',
                            responding:   '🚨',
                        }[n.status];
                        const statusColor = {
                            notified:     'var(--text-muted)',
                            acknowledged: 'var(--status-degraded)',
                            responding:   'var(--status-online)',
                        }[n.status];

                        return (
                            <div key={n.agency} style={{
                                display:      'flex', alignItems: 'center', gap: 8,
                                padding:      '4px 0',
                                borderBottom: '1px solid var(--border-default)',
                            }}>
                                <div style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: color, flexShrink: 0,
                                }} />
                                <span style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                                    color: 'var(--text-primary)', flex: 1,
                                }}>
                  {AGENCY_LABELS[n.agency]}
                </span>
                                <span style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                                    color: statusColor, display: 'flex', alignItems: 'center', gap: 3,
                                }}>
                  {statusIcon} {n.status}
                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Timestamp */}
                <div style={{
                    padding:    '6px 12px',
                    fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                    color:      'var(--text-disabled)', letterSpacing: '0.06em',
                    borderTop:  '1px solid var(--border-default)',
                }}>
                    Protocol active · All conflicting actions locked
                </div>
            </div>
        </>
    );
}