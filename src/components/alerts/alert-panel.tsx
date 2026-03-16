'use client';

import React, { useState, useMemo } from 'react';
import { AlertCard }         from './alert-card';
import { AlertClusterGroup, clusterAlerts } from './alert-cluster';
import type { Alert, Severity, AlertType, AlertPendingAction } from '@/types';
import { SEVERITY_COLORS, ALERT_TYPE_LABELS, sortBySeverity } from '@/lib/utils';
import { useMode }           from '@/providers/mode-provider';
import { ModeControls }     from '@/components/modes/mode-controls';

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const MAX_VISIBLE_PER_GROUP      = 3;

interface AlertPanelProps {
    alerts:          Alert[];
    focusedAlertId?: string;
    pendingActions?: Record<string, AlertPendingAction>;
    onAlertSelect:   (alert: Alert) => void;
    onApprove:       (id: string) => void;
    onIgnore:        (id: string, reason?: string) => void;
    onDispatch?:     (id: string) => void;
    onEscalate?:     (id: string) => void;
    onApproveAll?:   (ids: string[]) => void;

}

type FilterSeverity = Severity | 'all';
type FilterType     = AlertType | 'all';

export function AlertPanel({
                               alerts,
                               focusedAlertId,
                               pendingActions = {},
                               onAlertSelect,
                               onApprove,
                               onIgnore,
                               onDispatch,
                               onEscalate,
                               onApproveAll,
                           }: AlertPanelProps) {
    const { currentMode } = useMode();
    const isHumanMode     = currentMode === 'Human-Validated';
    const modeColor       = isHumanMode ? '#f5c518' : '#3b9eff';

    const [filterSev,  setFilterSev]  = useState<FilterSeverity>('all');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [showFilter, setShowFilter] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<Severity>>(new Set());
    const [viewMode, setViewMode]     = useState<'grouped' | 'clustered'>('grouped');

    // Apply filters
    const filtered = useMemo(() => {
        let list = alerts;
        if (filterSev  !== 'all') list = list.filter(a => a.severity === filterSev);
        if (filterType !== 'all') list = list.filter(a => a.type === filterType);
        return sortBySeverity(list);
    }, [alerts, filterSev, filterType]);

    const grouped = useMemo(() => {
        const map: Partial<Record<Severity, Alert[]>> = {};
        filtered.forEach(a => {
            if (!map[a.severity]) map[a.severity] = [];
            map[a.severity]!.push(a);
        });
        return map;
    }, [filtered]);

    const totalActive    = alerts.length;
    const criticalCount  = (grouped.critical?.length ?? 0);
    const lowConfCount   = filtered.filter(a => a.confidence < 70).length;

    const toggleGroup = (sev: Severity) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(sev)) next.delete(sev); else next.add(sev);
            return next;
        });
    };

    const { clusters, standalone } = useMemo(
        () => clusterAlerts(filtered),
        [filtered]
    );

    // Low-severity digest for Mode A
    const digestAlerts = useMemo(
        () => !isHumanMode ? filtered.filter(a => a.severity === 'low' || a.severity === 'info') : [],
        [filtered, isHumanMode]
    );
    const digestIds    = new Set(digestAlerts.map(a => a.id));

    const activeTypes = useMemo(() => {
        const types = new Set(alerts.map(a => a.type));
        return Array.from(types);
    }, [alerts]);

    return (
        <div style={{
            height:        '100%',
            display:       'flex',
            flexDirection: 'column',
            background:    'var(--bg-raised)',
            borderLeft:    `1px solid ${isHumanMode ? '#f5c51830' : 'var(--border-default)'}`,
            overflow:      'hidden',
            transition:    'border-color 500ms ease',
        }}>

            {/* ── Panel header ── */}
            <div style={{
                padding:       '9px 12px 8px',
                borderBottom:  `1px solid ${isHumanMode ? '#f5c51825' : 'var(--border-default)'}`,
                display:       'flex',
                flexDirection: 'column',
                gap:           6,
                flexShrink:    0,
                background:    isHumanMode ? 'rgba(245,197,24,0.03)' : 'var(--bg-elevated)',
                transition:    'background 500ms ease',
            }}>
                {/* Top row: title + mode + count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.7rem',
              fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text-primary)',
              flexShrink: 0,
          }}>
            Alerts
          </span>
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                        color: 'var(--text-muted)', flexShrink: 0,
                    }}>
            {totalActive}
          </span>
                    <div style={{ flex: 1, minWidth: 0 }} />
                    <ModeControls />
                    <button
                        onClick={() => setShowFilter(v => !v)}
                        style={{
                            padding:      '2px 6px',
                            background:   showFilter ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border:       '1px solid var(--border-default)',
                            borderRadius: 4, cursor: 'pointer',
                            fontFamily:   'var(--font-mono)', fontSize: '0.52rem',
                            color:        filterSev !== 'all' || filterType !== 'all'
                                ? 'var(--accent-primary)' : 'var(--text-muted)',
                            outline:      'none',
                            flexShrink:   0,
                            whiteSpace:   'nowrap',
                        }}
                    >
                        Filter
                    </button>
                </div>

                {/* Severity count pills */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {SEVERITY_ORDER.map(sev => {
                        const count = grouped[sev]?.length ?? 0;
                        if (count === 0) return null;
                        const color = SEVERITY_COLORS[sev];
                        return (
                            <button
                                key={sev}
                                onClick={() => setFilterSev(filterSev === sev ? 'all' : sev)}
                                style={{
                                    padding:      '1px 6px',
                                    background:   filterSev === sev ? `${color}25` : `${color}10`,
                                    border:       `1px solid ${filterSev === sev ? `${color}60` : `${color}25`}`,
                                    borderRadius: 10,
                                    cursor:       'pointer', outline: 'none',
                                    fontFamily:   'var(--font-mono)', fontSize: '0.5rem',
                                    color, transition: 'all 150ms ease',
                                    display:      'flex', alignItems: 'center', gap: 4,
                                }}
                            >
                                {sev === 'critical' && (
                                    <span style={{
                                        display: 'inline-block', width: 4, height: 4,
                                        borderRadius: '50%', background: color,
                                        animation: 'pulse-dot 1.2s ease infinite',
                                    }} />
                                )}
                                {sev} {count}
                            </button>
                        );
                    })}
                </div>

                {/* Filters dropdown */}
                {showFilter && (
                    <div style={{
                        padding:      8, background: 'var(--bg-elevated)',
                        border:       '1px solid var(--border-default)', borderRadius: 6,
                        display:      'flex', flexDirection: 'column', gap: 6,
                        animation:    'slide-in-up 150ms ease both',
                    }}>
                        {/* Type filter */}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <FilterChip label="All types" active={filterType === 'all'} onClick={() => setFilterType('all')} />
                            {activeTypes.map(t => (
                                <FilterChip
                                    key={t}
                                    label={ALERT_TYPE_LABELS[t] ?? t}
                                    active={filterType === t}
                                    onClick={() => setFilterType(filterType === t ? 'all' : t as AlertType)}
                                />
                            ))}
                        </div>
                        {/* View mode */}
                        <div style={{ display: 'flex', gap: 4 }}>
                            <FilterChip label="Grouped" active={viewMode === 'grouped'} onClick={() => setViewMode('grouped')} />
                            <FilterChip label="Clustered" active={viewMode === 'clustered'} onClick={() => setViewMode('clustered')} />
                        </div>
                        {(filterSev !== 'all' || filterType !== 'all') && (
                            <button
                                onClick={() => { setFilterSev('all'); setFilterType('all'); }}
                                style={{
                                    padding: '3px', background: 'transparent',
                                    border: '1px solid var(--border-default)', borderRadius: 4,
                                    cursor: 'pointer', fontFamily: 'var(--font-mono)',
                                    fontSize: '0.52rem', color: 'var(--text-muted)', outline: 'none',
                                }}
                            >
                                ✕ Clear filters
                            </button>
                        )}
                    </div>
                )}

                {/* Low-confidence warning in Human mode */}
                {isHumanMode && lowConfCount > 0 && (
                    <div style={{
                        padding:      '3px 8px',
                        background:   'rgba(255,59,59,0.06)',
                        border:       '1px solid rgba(255,59,59,0.2)',
                        borderRadius: 4,
                        fontFamily:   'var(--font-mono)', fontSize: '0.52rem',
                        color:        'var(--severity-critical)',
                        display:      'flex', alignItems: 'center', gap: 5,
                    }}>
                        <span>⚠</span>
                        <span>{lowConfCount} alert{lowConfCount > 1 ? 's' : ''} with low AI confidence — review carefully</span>
                    </div>
                )}
            </div>

            {/* ── Alert list ── */}
            <div style={{
                flex: 1, overflow: 'auto',
                padding: '8px',
                display: 'flex', flexDirection: 'column', gap: 4,
            }}>
                {filtered.length === 0 && (
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexDirection: 'column', gap: 8,
                    }}>
                        <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>✓</span>
                        <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                            color: 'var(--text-disabled)', letterSpacing: '0.08em',
                        }}>
              {filterSev !== 'all' || filterType !== 'all' ? 'NO MATCHING ALERTS' : 'NO ACTIVE ALERTS'}
            </span>
                    </div>
                )}

                {/* ── GROUPED VIEW ── */}
                {viewMode === 'grouped' && SEVERITY_ORDER.map(severity => {
                    const items = grouped[severity];
                    if (!items || items.length === 0) return null;

                    const isExpanded    = expandedGroups.has(severity);
                    const overflowCount = Math.max(0, items.length - MAX_VISIBLE_PER_GROUP);
                    const visible       = isExpanded ? items : items.slice(0, MAX_VISIBLE_PER_GROUP);
                    const color         = SEVERITY_COLORS[severity];
                    // Skip low/info in digest mode (Mode A)
                    const inDigest      = !isHumanMode && (severity === 'low' || severity === 'info');

                    if (inDigest) return null;

                    return (
                        <div key={severity} style={{ marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px 5px' }}>
                                <div style={{
                                    width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0,
                                    boxShadow: severity === 'critical' ? `0 0 5px ${color}` : 'none',
                                    animation: severity === 'critical' ? 'pulse-dot 1.5s ease infinite' : 'none',
                                }} />
                                <span style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                                    letterSpacing: '0.12em', textTransform: 'uppercase', color, flex: 1,
                                }}>
                  {severity}
                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-disabled)' }}>
                  {items.length}
                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {visible.map(alert => (
                                    <AlertCard
                                        key={alert.id}
                                        alert={alert}
                                        focused={alert.id === focusedAlertId}
                                        pendingAction={pendingActions[alert.id]}
                                        isHumanMode={isHumanMode}
                                        onSelect={onAlertSelect}
                                        onApprove={onApprove}
                                        onIgnore={onIgnore}
                                        onDispatch={onDispatch}
                                        onEscalate={onEscalate}
                                    />
                                ))}
                            </div>

                            {overflowCount > 0 && (
                                <button
                                    onClick={() => toggleGroup(severity)}
                                    style={{
                                        width: '100%', marginTop: 5, padding: '5px',
                                        background: 'transparent', border: `1px dashed ${color}40`,
                                        borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-mono)',
                                        fontSize: '0.58rem', color, opacity: 0.7,
                                        letterSpacing: '0.06em', transition: 'opacity 150ms ease', outline: 'none',
                                    }}
                                >
                                    {isExpanded ? '↑ Show less' : `↓ ${overflowCount} more ${severity}`}
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* ── CLUSTERED VIEW ── */}
                {viewMode === 'clustered' && (
                    <>
                        {clusters.map(cluster => (
                            <AlertClusterGroup
                                key={cluster.key}
                                label={cluster.label}
                                alerts={cluster.alerts}
                                pendingActions={pendingActions}
                                isHumanMode={isHumanMode}
                                onAlertSelect={onAlertSelect}
                                onApprove={onApprove}
                                onIgnore={onIgnore}
                                onDispatch={onDispatch}
                                onEscalate={onEscalate}
                                onApproveAll={onApproveAll}
                            />
                        ))}
                        {standalone.map(alert => (
                            <AlertCard
                                key={alert.id}
                                alert={alert}
                                focused={alert.id === focusedAlertId}
                                pendingAction={pendingActions[alert.id]}
                                isHumanMode={isHumanMode}
                                onSelect={onAlertSelect}
                                onApprove={onApprove}
                                onIgnore={onIgnore}
                                onDispatch={onDispatch}
                                onEscalate={onEscalate}
                            />
                        ))}
                    </>
                )}

                {/* ── Mode A digest for low/info alerts ── */}
                {!isHumanMode && digestAlerts.length > 0 && (
                    <AlertDigest alerts={digestAlerts} />
                )}
            </div>
        </div>
    );
}

// ── Filter chip ───────────────────────────
function FilterChip({
                        label, active, onClick,
                    }: {
    label:   string;
    active:  boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding:      '2px 8px',
                background:   active ? 'rgba(59,158,255,0.15)' : 'transparent',
                border:       `1px solid ${active ? 'rgba(59,158,255,0.4)' : 'var(--border-default)'}`,
                borderRadius: 4, cursor: 'pointer', outline: 'none',
                fontFamily:   'var(--font-mono)', fontSize: '0.55rem',
                color:        active ? 'var(--accent-primary)' : 'var(--text-muted)',
                transition:   'all 150ms ease',
                whiteSpace:   'nowrap',
            }}
        >
            {label}
        </button>
    );
}

// ── Digest for Mode A low-severity alerts ─
function AlertDigest({ alerts }: { alerts: Alert[] }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{
            marginTop:    4,
            padding:      '8px 10px',
            background:   'rgba(59,158,255,0.04)',
            border:       '1px solid rgba(59,158,255,0.12)',
            borderRadius: 8,
        }}>
            <div
                onClick={() => setExpanded(v => !v)}
                style={{
                    display:    'flex', alignItems: 'center', gap: 8,
                    cursor:     'pointer',
                }}
            >
                <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--accent-primary)', flexShrink: 0,
                }} />
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                    color: 'var(--accent-primary)', flex: 1,
                }}>
          AI Digest — {alerts.length} low-priority alert{alerts.length > 1 ? 's' : ''}
        </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-disabled)' }}>
          {expanded ? '▲' : '▼'}
        </span>
            </div>

            {!expanded && (
                <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                    color: 'var(--text-muted)', marginTop: 5,
                }}>
                    Auto-handled by AI. No operator action required.
                </div>
            )}

            {expanded && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {alerts.map(alert => (
                        <div key={alert.id} style={{
                            fontFamily:  'var(--font-mono)', fontSize: '0.57rem',
                            color:       'var(--text-muted)', paddingLeft: 10,
                            borderLeft:  `2px solid rgba(59,158,255,0.2)`,
                            paddingTop:  2, paddingBottom: 2,
                        }}>
                            {alert.title} · {alert.location.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}