'use client';

import { useState, useEffect } from 'react';
import { useRouter }           from 'next/navigation';
import { useClock }        from '@/hooks/use-clock';
import { useSystemHealth } from '@/hooks/use-system-health';
import { useAlerts }       from '@/hooks/use-alerts';
import { useWebSocket }    from '@/providers/websocket-provider';
import { useAuth, ROLE_LABELS } from '@/providers/auth-provider';
import { formatShiftDuration, formatPercent } from '@/lib/utils';
import type { Agency } from '@/types';

// ── Props ─────────────────────────────────
interface StatusBarProps {
    variant: 'wall' | 'operator';
    onEmergencyToggle?: () => void;
    isEmergencyMode?: boolean;
}

// ── Agency pill ───────────────────────────
const AGENCY_META: Record<Agency, { label: string; color: string }> = {
    traffic:   { label: 'TRAFFIC',   color: '#3b9eff' },
    emergency: { label: 'EMERGENCY', color: '#ff3b3b' },
    transport: { label: 'TRANSPORT', color: '#22c55e' },
    planning:  { label: 'PLANNING',  color: '#f5c518' },
};

// ── Sub-components ────────────────────────

function Logo() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Animated signal icon */}
            <div style={{ position: 'relative', width: 22, height: 22 }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    border: '1.5px solid var(--accent-primary)',
                    borderRadius: '50%',
                    opacity: 0.3,
                    animation: 'pulse-ring 2.5s ease-out infinite',
                }} />
                <div style={{
                    position: 'absolute', inset: 4,
                    background: 'var(--accent-primary)',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px var(--accent-primary)',
                }} />
            </div>
            <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '0.95rem',
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
            }}>
        COMMAND<span style={{ color: 'var(--accent-primary)', marginLeft: 1 }}>CTR</span>
      </span>
        </div>
    );
}

function LiveClock({ variant }: { variant: 'wall' | 'operator' }) {
    const { time, date } = useClock();

    if (variant === 'wall') {
        return (
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.6rem',
                    fontWeight: 300,
                    letterSpacing: '0.04em',
                    color: 'var(--text-primary)',
                    lineHeight: 1,
                }}>
                    {time}
                </div>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    marginTop: 2,
                    textTransform: 'uppercase',
                }}>
                    {date}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem',
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '0.04em',
      }}>
        {time}
      </span>
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
            }}>
        {date}
      </span>
        </div>
    );
}

function ConnectionDot() {
    const { connectionState } = useWebSocket();

    const config = {
        connecting:   { color: 'var(--status-degraded)',  label: 'CONNECTING', pulse: true },
        connected:    { color: 'var(--status-online)',     label: 'LIVE',       pulse: false },
        reconnecting: { color: 'var(--severity-high)',     label: 'RECONNECT',  pulse: true },
        disconnected: { color: 'var(--status-offline)',    label: 'OFFLINE',    pulse: false },
    }[connectionState];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: config.color,
                boxShadow: connectionState === 'connected' ? `0 0 6px ${config.color}` : 'none',
                animation: config.pulse ? 'pulse-dot 1s ease infinite' : 'none',
                flexShrink: 0,
            }} />
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.58rem',
                letterSpacing: '0.1em',
                color: config.color,
                opacity: 0.9,
            }}>
        {config.label}
      </span>
        </div>
    );
}

function AlertBadge({ count }: { count: number }) {
    if (count === 0) return null;
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            background: 'rgba(255, 59, 59, 0.12)',
            border: '1px solid rgba(255, 59, 59, 0.3)',
            borderRadius: 4,
            animation: count > 0 ? 'fade-in 300ms ease' : 'none',
        }}>
            <div style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--severity-critical)',
                animation: 'pulse-dot 1s ease infinite',
                flexShrink: 0,
            }} />
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--severity-critical)',
                letterSpacing: '0.06em',
            }}>
        {count} CRITICAL
      </span>
        </div>
    );
}

function HealthMetric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: warn ? 'var(--severity-medium)' : 'var(--text-primary)',
          lineHeight: 1,
      }}>
        {value}
      </span>
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.52rem',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
            }}>
        {label}
      </span>
        </div>
    );
}

function Divider() {
    return (
        <div style={{
            width: 1,
            height: 20,
            background: 'var(--border-default)',
            flexShrink: 0,
        }} />
    );
}

function WeatherBadge() {
    // Placeholder — connect to weather API or WS event
    return (
        <div title="Heavy rain — reduced visibility" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'default',
        }}>
            <span style={{ fontSize: '0.85rem' }}>🌧</span>
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                color: 'var(--severity-medium)',
                letterSpacing: '0.06em',
            }}>
        RAIN
      </span>
        </div>
    );
}

function EventBadge() {
    return (
        <div title="Kasarani Stadium — match day 18:00" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 7px',
            background: 'rgba(245, 197, 24, 0.1)',
            border: '1px solid rgba(245, 197, 24, 0.25)',
            borderRadius: 4,
            cursor: 'default',
        }}>
            <span style={{ fontSize: '0.75rem' }}>🏟</span>
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.58rem',
                color: 'var(--severity-medium)',
                letterSpacing: '0.06em',
            }}>
        EVENT 18:00
      </span>
        </div>
    );
}

function EmergencyToggle({
                             isActive,
                             onToggle,
                         }: {
    isActive: boolean;
    onToggle: () => void;
}) {
    const [confirming, setConfirming] = useState(false);

    const handleClick = () => {
        if (isActive) {
            onToggle();
            return;
        }
        if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 3000);
            return;
        }
        setConfirming(false);
        onToggle();
    };

    return (
        <button
            onClick={handleClick}
            title={isActive ? 'Deactivate emergency mode' : 'Activate emergency mode'}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: isActive
                    ? 'rgba(168, 85, 247, 0.15)'
                    : confirming
                        ? 'rgba(255, 59, 59, 0.12)'
                        : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${
                    isActive ? 'rgba(168, 85, 247, 0.4)' :
                        confirming ? 'rgba(255, 59, 59, 0.4)' :
                            'var(--border-default)'
                }`,
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                outline: 'none',
            }}
        >
      <span style={{ fontSize: '0.75rem' }}>
        {isActive ? '🟣' : '⚡'}
      </span>
            <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.58rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: isActive
                    ? 'var(--emergency-accent)'
                    : confirming
                        ? 'var(--severity-critical)'
                        : 'var(--text-secondary)',
            }}>
        {isActive ? 'EMERGENCY' : confirming ? 'CONFIRM?' : 'EMRG'}
      </span>
        </button>
    );
}

function UserChip() {
    const { user, logout } = useAuth();
    const router = useRouter();
    if (!user) return null;

    const agencyMeta = AGENCY_META[user.agency];
    const shiftLabel = formatShiftDuration(user.shiftStart);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '3px 6px 3px 6px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 20,
        }}>
            {/* Avatar */}
            <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: agencyMeta.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
        <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.6rem',
            fontWeight: 700,
            color: '#000',
            letterSpacing: 0,
        }}>
          {user.initials}
        </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1,
        }}>
          {user.name}
        </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.52rem',
              color: agencyMeta.color,
              letterSpacing: '0.08em',
          }}>
            {ROLE_LABELS[user.role]}
          </span>
                    <span style={{ color: 'var(--border-strong)', fontSize: '0.5rem' }}>·</span>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.52rem',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.06em',
                    }}>
            {shiftLabel}
          </span>
                </div>
            </div>

            {/* Logout button */}
            <button
                onClick={handleLogout}
                title="Sign out"
                style={{
                    marginLeft:   2,
                    padding:      '3px 7px',
                    background:   'transparent',
                    border:       '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    cursor:       'pointer',
                    fontFamily:   'var(--font-mono)',
                    fontSize:     '0.52rem',
                    color:        'var(--text-disabled)',
                    transition:   'all 150ms ease',
                    outline:      'none',
                    letterSpacing:'0.04em',
                    flexShrink:   0,
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--severity-high)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--severity-high)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-disabled)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                }}
            >
                Sign out
            </button>
        </div>
    );
}

function LangToggle() {
    const [lang, setLang] = useState<'EN' | 'SW'>('EN');
    return (
        <button
            onClick={() => setLang(l => l === 'EN' ? 'SW' : 'EN')}
            style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                background: 'none',
                border: '1px solid var(--border-subtle)',
                borderRadius: 3,
                padding: '2px 6px',
                cursor: 'pointer',
                transition: 'color var(--transition-fast)',
            }}
        >
            {lang}
        </button>
    );
}

// ── Main StatusBar ────────────────────────
export function StatusBar({
                              variant,
                              onEmergencyToggle,
                              isEmergencyMode = false,
                          }: StatusBarProps) {
    const health = useSystemHealth();
    const { criticalCount } = useAlerts();

    const iotWarn = health.iotNetworkPercent < 90;
    const aiWarn  = health.aiConfidence < 70;

    return (
        <header
            role="banner"
            style={{
                height: 'var(--status-bar-h)',
                background: isEmergencyMode
                    ? 'rgba(15, 7, 25, 0.98)'
                    : 'rgba(12, 17, 23, 0.98)',
                borderBottom: `1px solid ${
                    isEmergencyMode ? 'rgba(168, 85, 247, 0.25)' : 'var(--border-default)'
                }`,
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 12,
                position: 'relative',
                zIndex: 50,
                // Emergency shimmer
                ...(isEmergencyMode && {
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.1) inset',
                }),
            }}
        >
            {/* LEFT: Logo + connection */}
            <Logo />
            <ConnectionDot />

            <Divider />

            {/* Clock */}
            <LiveClock variant={variant} />

            {/* Critical alert badge */}
            <AlertBadge count={criticalCount} />

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* CENTER / RIGHT: contextual content */}
            {variant === 'wall' ? (
                /* Wall — large health metrics for room visibility */
                <>
                    <HealthMetric
                        label="IoT Network"
                        value={formatPercent(health.iotNetworkPercent, 1)}
                        warn={iotWarn}
                    />
                    <Divider />
                    <HealthMetric
                        label="AI Confidence"
                        value={formatPercent(health.aiConfidence)}
                        warn={aiWarn}
                    />
                    <Divider />
                    <HealthMetric
                        label="Uptime"
                        value={formatPercent(health.uptimePercent, 1)}
                    />
                    <Divider />
                    <WeatherBadge />
                    <EventBadge />
                    <Divider />
                    <LangToggle />
                </>
            ) : (
                /* Operator — compact metrics + user chip */
                <>
                    <WeatherBadge />
                    <EventBadge />
                    <Divider />
                    <HealthMetric
                        label="IoT"
                        value={formatPercent(health.iotNetworkPercent, 0)}
                        warn={iotWarn}
                    />
                    <HealthMetric
                        label="AI"
                        value={formatPercent(health.aiConfidence, 0)}
                        warn={aiWarn}
                    />
                    <Divider />
                    {onEmergencyToggle && (
                        <EmergencyToggle isActive={isEmergencyMode} onToggle={onEmergencyToggle} />
                    )}
                    <Divider />
                    <UserChip />
                    <LangToggle />
                </>
            )}

            {/* Emergency mode indicator line */}
            {isEmergencyMode && (
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, var(--emergency-accent), transparent)',
                    animation: 'shimmer 2s ease infinite',
                    backgroundSize: '200% 100%',
                }} />
            )}
        </header>
    );
}