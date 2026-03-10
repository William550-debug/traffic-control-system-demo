'use client';

import { useState, useMemo } from 'react';
import { AlertCard }   from './alert-card';
import type { Alert, Severity, AlertPendingAction } from '@/types';
import { SEVERITY_COLORS, sortBySeverity } from '@/lib/utils';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const MAX_VISIBLE_PER_GROUP = 3;

interface AlertPanelProps {
    alerts:          Alert[];
    focusedAlertId?: string;
    pendingActions?: Record<string, AlertPendingAction>;
    onAlertSelect:   (alert: Alert) => void;
    onApprove:       (id: string) => void;
    onIgnore:        (id: string) => void;
    onDispatch?:     (id: string) => void;
}

export function AlertPanel({
                               alerts,
                               focusedAlertId,
                               pendingActions = {},
                               onAlertSelect,
                               onApprove,
                               onIgnore,
                               onDispatch,
                           }: AlertPanelProps) {
    const [expandedGroups, setExpandedGroups] = useState<Set<Severity>>(new Set());

    const grouped = useMemo(() => {
        const map: Partial<Record<Severity, Alert[]>> = {};
        sortBySeverity(alerts).forEach(a => {
            if (!map[a.severity]) map[a.severity] = [];
            map[a.severity]!.push(a);
        });
        return map;
    }, [alerts]);

    const totalActive = alerts.length;
    const criticalCount = grouped.critical?.length ?? 0;

    const toggleGroup = (sev: Severity) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(sev)) next.delete(sev);
            else next.add(sev);
            return next;
        });
    };

    return (
        <div style={{
            height:         '100%',
            display:        'flex',
            flexDirection:  'column',
            background:     'var(--bg-raised)',
            borderLeft:     '1px solid var(--border-default)',
            overflow:       'hidden',
        }}>

            {/* ── Panel header ── */}
            <div style={{
                padding:       '10px 12px 9px',
                borderBottom:  '1px solid var(--border-default)',
                display:       'flex',
                alignItems:    'center',
                gap:           8,
                flexShrink:    0,
                background:    'var(--bg-elevated)',
            }}>
        <span style={{
            fontFamily:    'var(--font-display)',
            fontSize:      '0.7rem',
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         'var(--text-primary)',
        }}>
          Alerts
        </span>

                {/* Total count */}
                <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.6rem',
                    color:         'var(--text-muted)',
                }}>
          {totalActive}
        </span>

                <div style={{ flex: 1 }} />

                {/* Critical badge */}
                {criticalCount > 0 && (
                    <div style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          4,
                        padding:      '2px 7px',
                        background:   'rgba(255,59,59,0.12)',
                        border:       '1px solid rgba(255,59,59,0.3)',
                        borderRadius: 4,
                        animation:    'fade-in 300ms ease',
                    }}>
                        <div style={{
                            width:        5,
                            height:       5,
                            borderRadius: '50%',
                            background:   'var(--severity-critical)',
                            animation:    'pulse-dot 1s ease infinite',
                        }} />
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '0.58rem',
                            fontWeight:    600,
                            color:         'var(--severity-critical)',
                            letterSpacing: '0.06em',
                        }}>
              {criticalCount}
            </span>
                    </div>
                )}
            </div>

            {/* ── Alert groups ── */}
            <div style={{
                flex:           1,
                overflow:       'auto',
                padding:        '8px',
                display:        'flex',
                flexDirection:  'column',
                gap:            4,
            }}>
                {totalActive === 0 && (
                    <div style={{
                        flex:           1,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        flexDirection:  'column',
                        gap:            8,
                    }}>
                        <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>✓</span>
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '0.62rem',
                            color:         'var(--text-disabled)',
                            letterSpacing: '0.08em',
                        }}>
              NO ACTIVE ALERTS
            </span>
                    </div>
                )}

                {SEVERITY_ORDER.map(severity => {
                    const items = grouped[severity];
                    if (!items || items.length === 0) return null;

                    const isExpanded  = expandedGroups.has(severity);
                    const overflowCount = Math.max(0, items.length - MAX_VISIBLE_PER_GROUP);
                    const visible     = isExpanded ? items : items.slice(0, MAX_VISIBLE_PER_GROUP);
                    const color       = SEVERITY_COLORS[severity];

                    return (
                        <div key={severity} style={{ marginBottom: 4 }}>
                            {/* Group header */}
                            <div style={{
                                display:        'flex',
                                alignItems:     'center',
                                gap:            6,
                                padding:        '4px 4px 6px',
                            }}>
                                <div style={{
                                    width:        5,
                                    height:       5,
                                    borderRadius: '50%',
                                    background:   color,
                                    boxShadow:    severity === 'critical' ? `0 0 5px ${color}` : 'none',
                                    animation:    severity === 'critical' ? 'pulse-dot 1.5s ease infinite' : 'none',
                                    flexShrink:   0,
                                }} />
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '0.55rem',
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color,
                                    flex:          1,
                                }}>
                  {severity}
                </span>
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '0.55rem',
                                    color:         'var(--text-disabled)',
                                }}>
                  {items.length}
                </span>
                            </div>

                            {/* Cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {visible.map(alert => (
                                    <AlertCard
                                        key={alert.id}
                                        alert={alert}
                                        focused={alert.id === focusedAlertId}
                                        pendingAction={pendingActions[alert.id]}
                                        onSelect={onAlertSelect}
                                        onApprove={onApprove}
                                        onIgnore={onIgnore}
                                        onDispatch={onDispatch}
                                    />
                                ))}
                            </div>

                            {/* Overflow toggle */}
                            {overflowCount > 0 && (
                                <button
                                    onClick={() => toggleGroup(severity)}
                                    style={{
                                        width:         '100%',
                                        marginTop:     5,
                                        padding:       '5px',
                                        background:    'transparent',
                                        border:        `1px dashed ${color}40`,
                                        borderRadius:  6,
                                        cursor:        'pointer',
                                        fontFamily:    'var(--font-mono)',
                                        fontSize:      '0.58rem',
                                        color:         color,
                                        opacity:       0.7,
                                        letterSpacing: '0.06em',
                                        transition:    'opacity 150ms ease',
                                        outline:       'none',
                                    }}
                                >
                                    {isExpanded
                                        ? `↑ Show less`
                                        : `↓ ${overflowCount} more ${severity}`
                                    }
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}