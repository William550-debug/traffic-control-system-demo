'use client';

import { useMemo } from 'react';
import { StatusBar }      from '@/components/status-bar/status-bar';
import { useAlerts }      from '@/hooks/use-alerts';
import { useSystemHealth } from '@/hooks/use-system-health';
import { useClock }        from '@/hooks/use-clock';
import {
    SEVERITY_COLORS,
    SEVERITY_BG,
    SEVERITY_BORDER,
    ALERT_TYPE_LABELS,
    formatRelativeTime,
    formatPercent,
} from '@/lib/utils';
import type { Alert } from '@/types';

// ── Critical event card for wall display ─
function WallAlertCard({ alert, index }: { alert: Alert; index: number }) {
    const color  = SEVERITY_COLORS[alert.severity];
    const bg     = SEVERITY_BG[alert.severity];
    const border = SEVERITY_BORDER[alert.severity];

    return (
        <div
            style={{
                padding: '12px 14px',
                background: bg,
                border: `1px solid ${border}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 8,
                animation: `slide-in-up ${200 + index * 100}ms ease both`,
                flexShrink: 0,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
        }}>
          {alert.title}
        </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    color,
                    letterSpacing: '0.08em',
                    flexShrink: 0,
                }}>
          {alert.confidence}%
        </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
        }}>
          {alert.location.label}
        </span>
                <span style={{ color: 'var(--border-strong)' }}>·</span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.58rem',
                    color: 'var(--text-muted)',
                }}>
          {formatRelativeTime(alert.detectedAt)}
        </span>
            </div>
        </div>
    );
}

// ── Predictive timeline strip ─────────────
function WallPredictiveStrip() {
    const slots = [
        { label: 'NOW',    hotspots: 4, color: 'var(--severity-critical)' },
        { label: '+30 MIN', hotspots: 2, color: 'var(--severity-high)' },
        { label: '+1 HR',   hotspots: 1, color: 'var(--severity-medium)' },
        { label: '+2 HR',   hotspots: 2, color: 'var(--severity-high)' },
    ];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            padding: '0 24px',
            gap: 0,
        }}>
      <span className="text-wall-label" style={{ color: 'var(--text-muted)', marginRight: 24, flexShrink: 0 }}>
        60-MIN PROJECTION
      </span>

            {/* Timeline */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                height: '100%',
                gap: 1,
            }}>
                {slots.map((slot, i) => (
                    <div
                        key={slot.label}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                            padding: '8px 12px',
                            background: i === 0 ? 'rgba(59, 158, 255, 0.04)' : 'transparent',
                        }}
                    >
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)',
                letterSpacing: '0.1em',
                color: i === 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                textTransform: 'uppercase',
            }}>
              {slot.label}
            </span>
                        <div style={{ display: 'flex', gap: 3 }}>
                            {[...Array(Math.min(slot.hotspots, 5))].map((_, j) => (
                                <div key={j} style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: slot.color,
                                    opacity: 0.85,
                                    boxShadow: `0 0 4px ${slot.color}`,
                                }} />
                            ))}
                        </div>
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.52rem',
                            color: 'var(--text-disabled)',
                            letterSpacing: '0.06em',
                        }}>
              {slot.hotspots} hotspot{slot.hotspots !== 1 ? 's' : ''}
            </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── System health panel ───────────────────
function WallSystemHealth() {
    const health = useSystemHealth();

    const metrics = [
        {
            label: 'IoT Network',
            value: formatPercent(health.iotNetworkPercent, 1),
            warn: health.iotNetworkPercent < 90,
            sublabel: `${Math.round(health.iotNetworkPercent * 4.2)} / 420 sensors`,
        },
        {
            label: 'AI Confidence',
            value: formatPercent(health.aiConfidence),
            warn: health.aiConfidence < 70,
            sublabel: health.aiConfidence >= 80 ? 'High reliability' : 'Reduced reliability',
        },
        {
            label: 'System Uptime',
            value: formatPercent(health.uptimePercent, 2),
            warn: false,
            sublabel: `${health.activeOperators} operators online`,
        },
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '12px 14px',
        }}>
      <span className="text-wall-label" style={{ color: 'var(--text-muted)' }}>
        SYSTEM HEALTH
      </span>
            {metrics.map((m) => (
                <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(0.6rem, 0.9vw, 0.7rem)',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
            }}>
              {m.label}
            </span>
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)',
                            fontWeight: 500,
                            color: m.warn ? 'var(--severity-medium)' : 'var(--text-primary)',
                        }}>
              {m.value}
            </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{
                        height: 3,
                        background: 'var(--bg-elevated)',
                        borderRadius: 2,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: m.value,
                            background: m.warn ? 'var(--severity-medium)' : 'var(--status-online)',
                            borderRadius: 2,
                            transition: 'width 1s ease',
                        }} />
                    </div>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.52rem',
                        color: 'var(--text-disabled)',
                        letterSpacing: '0.06em',
                    }}>
            {m.sublabel}
          </span>
                </div>
            ))}
        </div>
    );
}

// ── Map placeholder for wall ──────────────
function WallMapPlaceholder() {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: 'var(--bg-base)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            {/* Grid */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
          linear-gradient(var(--border-subtle) 1px, transparent 1px),
          linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
        `,
                backgroundSize: '60px 60px',
            }} />

            {/* Scan line effect */}
            <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
                opacity: 0.15,
                animation: 'scan-line 8s linear infinite',
            }} />

            {/* Simulated hotspot blobs */}
            {[
                { top: '35%', left: '45%', size: 80, color: 'var(--severity-critical)' },
                { top: '28%', left: '52%', size: 50, color: 'var(--severity-critical)' },
                { top: '55%', left: '38%', size: 60, color: 'var(--severity-high)' },
                { top: '42%', left: '30%', size: 40, color: 'var(--severity-medium)' },
                { top: '60%', left: '60%', size: 30, color: 'var(--severity-low)' },
            ].map((blob, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    top: blob.top,
                    left: blob.left,
                    width: blob.size,
                    height: blob.size,
                    borderRadius: '50%',
                    background: blob.color,
                    opacity: 0.12,
                    filter: 'blur(20px)',
                    transform: 'translate(-50%, -50%)',
                }} />
            ))}

            <div style={{
                position: 'relative',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
            }}>
        <span className="text-wall-label" style={{ color: 'var(--text-muted)' }}>
          SITUATION MAP — NAIROBI METRO
        </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    color: 'var(--text-disabled)',
                    letterSpacing: '0.06em',
                }}>
          Phase 3 — Mapbox integration
        </span>
            </div>
        </div>
    );
}

// ── Wall Shell ────────────────────────────
export function WallShell() {
    const { alertsBySeverity } = useAlerts();

    const criticalAndHigh = useMemo(() => {
        return [
            ...alertsBySeverity.critical,
            ...alertsBySeverity.high,
        ].slice(0, 5); // Wall shows max 5
    }, [alertsBySeverity]);

    return (
        <div style={{
            display: 'grid',
            gridTemplateRows: 'var(--status-bar-h) 1fr 100px',
            gridTemplateColumns: '1fr 280px',
            height: '100dvh',
            overflow: 'hidden',
            background: 'var(--bg-void)',
            gap: 1,
        }}>

            {/* ── Status Bar ── */}
            <div style={{ gridColumn: '1 / -1' }}>
                <StatusBar variant="wall" />
            </div>

            {/* ── Main Map ── */}
            <div style={{ overflow: 'hidden', position: 'relative' }}>
                <WallMapPlaceholder />
            </div>

            {/* ── Right rail: Critical Events + System Health ── */}
            <div style={{
                background: 'var(--bg-raised)',
                borderLeft: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Events header */}
                <div className="panel-header">
          <span className="text-wall-label" style={{ color: 'var(--severity-critical)' }}>
            CRITICAL EVENTS
          </span>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: 'var(--severity-critical)',
                    }}>
            {criticalAndHigh.length}
          </span>
                </div>

                {/* Alert cards */}
                <div style={{
                    flex: 1,
                    overflow: 'hidden',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}>
                    {criticalAndHigh.length === 0 ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
              <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-disabled)',
                  letterSpacing: '0.08em',
              }}>
                NO CRITICAL EVENTS
              </span>
                        </div>
                    ) : (
                        criticalAndHigh.map((alert, i) => (
                            <WallAlertCard key={alert.id} alert={alert} index={i} />
                        ))
                    )}
                </div>

                {/* System health */}
                <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <WallSystemHealth />
                </div>
            </div>

            {/* ── Predictive Strip ── spans full width */}
            <div style={{
                gridColumn: '1 / -1',
                background: 'var(--bg-raised)',
                borderTop: '1px solid var(--border-default)',
            }}>
                <WallPredictiveStrip />
            </div>
        </div>
    );
}