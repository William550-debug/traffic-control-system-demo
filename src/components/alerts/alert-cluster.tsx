'use client';

import { useState } from 'react';
import type { Alert, AlertPendingAction } from '@/types';
import { SEVERITY_COLORS, ALERT_TYPE_LABELS } from '@/lib/utils';
import { AlertCard } from './alert-card';

interface AlertClusterProps {
    label:          string;   // "5 intersections in Westlands"
    alerts:         Alert[];
    pendingActions: Record<string, AlertPendingAction>;
    isHumanMode:    boolean;
    onAlertSelect:  (alert: Alert) => void;
    onApprove:      (id: string) => void;
    onIgnore:       (id: string) => void;
    onDispatch?:    (id: string) => void;
    onEscalate?:    (id: string) => void;
    onApproveAll?:  (ids: string[]) => void;
}

export function AlertClusterGroup({
                                      label,
                                      alerts,
                                      pendingActions,
                                      isHumanMode,
                                      onAlertSelect,
                                      onApprove,
                                      onIgnore,
                                      onDispatch,
                                      onEscalate,
                                      onApproveAll,
                                  }: AlertClusterProps) {
    const [expanded, setExpanded] = useState(false);

    if (alerts.length === 0) return null;

    // Use highest severity in cluster
    const topSeverity = alerts[0].severity;
    const color       = SEVERITY_COLORS[topSeverity];
    const typeLabel   = ALERT_TYPE_LABELS[alerts[0].type] ?? alerts[0].type;
    const zones       = [...new Set(alerts.map(a => a.location.zone))];
    const canBulk     = !isHumanMode; // Mode A only

    return (
        <div style={{
            background:   'var(--bg-base)',
            border:       `1px solid ${color}30`,
            borderLeft:   `3px solid ${color}`,
            borderRadius: 8,
            overflow:     'hidden',
            marginBottom: 4,
        }}>
            {/* Cluster header */}
            <div
                onClick={() => setExpanded(v => !v)}
                style={{
                    padding:    '9px 11px',
                    cursor:     'pointer',
                    display:    'flex',
                    alignItems: 'center',
                    gap:        8,
                    background: expanded ? `${color}06` : 'transparent',
                    transition: 'background 150ms ease',
                }}
            >
                <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: color, flexShrink: 0,
                    boxShadow: `0 0 4px ${color}`,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                        fontWeight: 600, color: 'var(--text-primary)',
                    }}>
                        {label}
                    </div>
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                        color: 'var(--text-muted)', marginTop: 1,
                    }}>
                        {typeLabel} · {zones.join(', ')}
                    </div>
                </div>

                {/* Count badge */}
                <span style={{
                    padding:    '1px 7px',
                    background: `${color}15`,
                    border:     `1px solid ${color}30`,
                    borderRadius:10,
                    fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                    color, fontWeight: 700,
                }}>
          {alerts.length}
        </span>

                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                    color: 'var(--text-disabled)',
                }}>
          {expanded ? '▲' : '▼'}
        </span>
            </div>

            {/* Bulk action (Mode A only) */}
            {!expanded && canBulk && onApproveAll && (
                <div style={{
                    padding:      '0 11px 9px',
                    display:      'flex',
                    gap:          6,
                    alignItems:   'center',
                }}>
          <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
              color: 'var(--text-disabled)', flex: 1,
          }}>
            AI recommendation: acknowledge all
          </span>
                    <button
                        onClick={e => { e.stopPropagation(); onApproveAll(alerts.map(a => a.id)); }}
                        style={{
                            padding:      '3px 10px',
                            background:   `${color}15`,
                            border:       `1px solid ${color}40`,
                            borderRadius: 4,
                            cursor:       'pointer',
                            fontFamily:   'var(--font-mono)',
                            fontSize:     '0.55rem',
                            color,
                            outline:      'none',
                            transition:   'all 150ms ease',
                        }}
                    >
                        Approve All
                    </button>
                </div>
            )}

            {/* Expanded individual cards */}
            {expanded && (
                <div style={{
                    padding:       '4px 8px 8px',
                    display:       'flex',
                    flexDirection: 'column',
                    gap:           4,
                    borderTop:     `1px solid ${color}20`,
                }}>
                    {alerts.map(alert => (
                        <AlertCard
                            key={alert.id}
                            alert={alert}
                            focused={false}
                            pendingAction={pendingActions[alert.id]}
                            onSelect={onAlertSelect}
                            onApprove={onApprove}
                            onIgnore={onIgnore}
                            onDispatch={onDispatch}
                            onEscalate={onEscalate}
                            isHumanMode={isHumanMode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Clustering logic ──────────────────────
// Groups alerts by zone + type when ≥3 share the same combo
export function clusterAlerts(alerts: Alert[]): {
    clusters:    { key: string; label: string; alerts: Alert[] }[];
    standalone:  Alert[];
} {
    const groups = new Map<string, Alert[]>();

    alerts.forEach(alert => {
        const key = `${alert.location.zone}::${alert.type}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(alert);
    });

    const clusters: { key: string; label: string; alerts: Alert[] }[] = [];
    const clusteredIds = new Set<string>();

    groups.forEach((items, key) => {
        if (items.length >= 3) {
            const [zone, type] = key.split('::');
            const typeLabel    = ALERT_TYPE_LABELS[type as keyof typeof ALERT_TYPE_LABELS] ?? type;
            clusters.push({
                key,
                label: `${items.length} ${typeLabel.toLowerCase()} incidents · ${zone}`,
                alerts: items,
            });
            items.forEach(a => clusteredIds.add(a.id));
        }
    });

    const standalone = alerts.filter(a => !clusteredIds.has(a.id));
    return { clusters, standalone };
}