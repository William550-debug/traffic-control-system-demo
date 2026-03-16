'use client';

import type { ReactNode }   from 'react';
import { useAuth }          from '@/providers/auth-provider';
import type { Agency, Permission } from '@/types';

// ── Role guard ────────────────────────────
interface RoleGuardProps {
    permission?: Permission;
    agency?:     Agency;
    fallback?:   ReactNode;
    children:    ReactNode;
}

export function RoleGuard({
                              permission,
                              agency,
                              fallback = null,
                              children,
                          }: RoleGuardProps) {
    const { hasPermission, isAgency, user } = useAuth();

    if (!user) return <>{fallback}</>;
    if (permission && !hasPermission(permission)) return <>{fallback}</>;
    if (agency && !isAgency(agency)) return <>{fallback}</>;

    return <>{children}</>;
}

// ── Per-agency view config ─────────────────
export interface AgencyViewConfig {
    label:            string;
    accentColor:      string;
    defaultOverlays:  string[];
    priorityAlertTypes: string[];
    showCorridorPanel: boolean;
    showTransitData:   boolean;
    showPlanningData:  boolean;
}

export const AGENCY_VIEW_CONFIGS: Record<Agency, AgencyViewConfig> = {
    traffic: {
        label:             'Traffic Control',
        accentColor:       '#3b9eff',
        defaultOverlays:   ['heatmap', 'signals', 'incidents', 'cameras'],
        priorityAlertTypes:['congestion', 'signal_failure', 'incident'],
        showCorridorPanel: true,
        showTransitData:   false,
        showPlanningData:  false,
    },
    emergency: {
        label:             'Emergency Services',
        accentColor:       '#ff3b3b',
        defaultOverlays:   ['heatmap', 'incidents', 'cameras'],
        priorityAlertTypes:['incident', 'emergency', 'signal_failure'],
        showCorridorPanel: true,
        showTransitData:   false,
        showPlanningData:  false,
    },
    transport: {
        label:             'Public Transport',
        accentColor:       '#22c55e',
        defaultOverlays:   ['heatmap', 'transport', 'incidents'],
        priorityAlertTypes:['congestion', 'event', 'weather'],
        showCorridorPanel: false,
        showTransitData:   true,
        showPlanningData:  false,
    },
    planning: {
        label:             'City Planning',
        accentColor:       '#f5c518',
        defaultOverlays:   ['heatmap', 'predictions', 'events'],
        priorityAlertTypes:['event', 'congestion'],
        showCorridorPanel: false,
        showTransitData:   true,
        showPlanningData:  true,
    },
};

// ── Agency context banner ──────────────────
export function AgencyContextBanner() {
    const { user } = useAuth();
    if (!user) return null;

    const config = AGENCY_VIEW_CONFIGS[user.agency];

    return (
        <div style={{
            position:     'absolute',
            top:          10,
            left:         '50%',
            transform:    'translateX(-50%)',
            zIndex:       500,
            display:      'flex',
            alignItems:   'center',
            gap:          7,
            padding:      '4px 12px',
            background:   'rgba(12,17,23,0.9)',
            border:       `1px solid ${config.accentColor}30`,
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
            pointerEvents: 'none',
        }}>
            <div style={{
                width:        6,
                height:       6,
                borderRadius: '50%',
                background:   config.accentColor,
                boxShadow:    `0 0 6px ${config.accentColor}`,
                flexShrink:   0,
            }} />
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.6rem',
                letterSpacing: '0.1em',
                color:         config.accentColor,
                fontWeight:    600,
            }}>
        {config.label.toUpperCase()}
      </span>
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.55rem',
                color:         'var(--text-muted)',
                letterSpacing: '0.06em',
            }}>
        {user.name}
      </span>
        </div>
    );
}

// ── Role switcher (dev/supervisor tool) ────
export function RoleSwitcher() {
    if (process.env.NODE_ENV !== 'development') return null;
    const { user, login } = useAuth();
    if (!user) return null;

    const users = [
        { id: 'traffic-01',   label: 'Traffic Ops',   color: '#3b9eff' },
        { id: 'emergency-01', label: 'Emergency',      color: '#ff3b3b' },
        { id: 'supervisor-01',label: 'Supervisor',     color: '#f5c518' },
    ];

    return (
        <div style={{
            position:     'absolute',
            bottom:       12,
            right:        12,
            zIndex:       500,
            display:      'flex',
            flexDirection:'column',
            gap:          4,
            alignItems:   'flex-end',
        }}>
      <span style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      '0.5rem',
          color:         'var(--text-disabled)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom:  2,
      }}>
        Dev · Switch role
      </span>
            <div style={{ display: 'flex', gap: 4 }}>
                {users.map(u => (
                    <button
                        key={u.id}
                        onClick={() => login(u.id)}
                        style={{
                            padding:       '3px 8px',
                            background:    user.id === u.id
                                ? `${u.color}20`
                                : 'rgba(12,17,23,0.85)',
                            border:        `1px solid ${user.id === u.id ? `${u.color}50` : 'rgba(255,255,255,0.1)'}`,
                            borderRadius:  4,
                            cursor:        'pointer',
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '0.55rem',
                            color:         user.id === u.id ? u.color : 'var(--text-muted)',
                            backdropFilter:'blur(8px)',
                            outline:       'none',
                            transition:    'all 150ms ease',
                            letterSpacing: '0.06em',
                        }}
                    >
                        {u.label}
                    </button>
                ))}
            </div>
        </div>
    );
}