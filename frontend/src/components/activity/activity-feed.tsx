'use client';

import { useRef, useEffect } from 'react';
import { useAuditLog }       from '@/hooks/use-audit-log';
import { formatRelativeTime } from '@/lib/utils';
import { AGENCY_COLORS }     from '@/providers/auth-provider';
import type { AuditAction, Agency } from '@/types';

// ── Action type labels ────────────────────
const ACTION_LABELS: Record<string, string> = {
    alert_approved:             'Alert approved',
    alert_rejected:             'Alert rejected',
    alert_ignored:              'Alert ignored',
    signal_adjusted:            'Signal adjusted',
    corridor_activated:         'Corridor activated',
    corridor_locked:            'Corridor locked',
    dispatch_sent:              'Dispatch sent',
    ai_approved:                'AI rec approved',
    ai_rejected:                'AI rec rejected',
    emergency_mode_activated:   'EMERGENCY ON',
    emergency_mode_deactivated: 'EMERGENCY OFF',
};

// ── Single feed row ───────────────────────
function FeedRow({ action, isNew }: { action: AuditAction; isNew: boolean }) {
    const agencyColor = AGENCY_COLORS[action.agency as Agency] ?? 'var(--text-muted)';
    const isEmergency = action.type === 'emergency_mode_activated';

    return (
        <div style={{
            display:      'flex',
            alignItems:   'flex-start',
            gap:          8,
            padding:      '5px 0',
            borderBottom: '1px solid var(--border-subtle)',
            animation:    isNew ? 'slide-in-up 200ms ease' : 'none',
            background:   isNew ? 'rgba(59,158,255,0.04)' : 'transparent',
            transition:   'background 1s ease',
        }}>

            {/* Agency color bar */}
            <div style={{
                width:        3,
                height:       '100%',
                minHeight:    28,
                background:   isEmergency ? 'var(--emergency-accent)' : agencyColor,
                borderRadius: 2,
                flexShrink:   0,
                marginTop:    1,
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Action label */}
                <div style={{
                    fontFamily:  'var(--font-mono)',
                    fontSize:    '0.62rem',
                    color:       isEmergency ? 'var(--emergency-accent)' : 'var(--text-secondary)',
                    fontWeight:  isEmergency ? 600 : 400,
                    overflow:    'hidden',
                    whiteSpace:  'nowrap',
                    textOverflow:'ellipsis',
                    lineHeight:  1.3,
                }}>
                    {ACTION_LABELS[action.type] ?? action.type} — {action.targetLabel}
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <span style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      '0.5rem',
              letterSpacing: '0.08em',
              color:         agencyColor,
          }}>
            {action.performedBy.split(' ')[0]}
          </span>
                    <span style={{ color: 'var(--border-strong)', fontSize: '0.5rem' }}>·</span>
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '0.5rem',
                        color:      'var(--text-disabled)',
                    }}>
            {formatRelativeTime(action.timestamp)}
          </span>
                </div>
            </div>
        </div>
    );
}

// ── Main feed ─────────────────────────────
export function ActivityFeed() {
    const { actions }  = useAuditLog();
    const prevCountRef = useRef(actions.length);
    const scrollRef    = useRef<HTMLDivElement>(null);

    // Auto-scroll to top on new actions
    useEffect(() => {
        if (actions.length > prevCountRef.current && scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        prevCountRef.current = actions.length;
    }, [actions.length]);

    return (
        <div style={{
            height:        '100%',
            background:    'var(--bg-raised)',
            borderLeft:    '1px solid var(--border-default)',
            borderTop:     '1px solid var(--border-default)',
            display:       'flex',
            flexDirection: 'column',
            overflow:      'hidden',
        }}>

            {/* Header */}
            <div style={{
                padding:        '8px 12px',
                borderBottom:   '1px solid var(--border-subtle)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                flexShrink:     0,
                background:     'var(--bg-elevated)',
            }}>
        <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.55rem',
            letterSpacing: '0.12em',
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
        }}>
          Activity
        </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '0.5rem',
              color:      'var(--text-disabled)',
          }}>
            {actions.length}
          </span>
                    <div style={{
                        width:        6,
                        height:       6,
                        borderRadius: '50%',
                        background:   'var(--status-online)',
                        boxShadow:    '0 0 5px var(--status-online)',
                    }} />
                </div>
            </div>

            {/* Feed list */}
            <div
                ref={scrollRef}
                style={{
                    flex:     1,
                    overflow: 'auto',
                    padding:  '4px 10px',
                }}
            >
                {actions.map((action, i) => (
                    <FeedRow
                        key={action.id}
                        action={action}
                        isNew={i === 0}
                    />
                ))}
            </div>
        </div>
    );
}