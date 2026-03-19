'use client';

import { useEffect, useState } from 'react';
import { useMode } from '@/providers/mode-provider';
import type { ModeTransition } from '@/types';

const MODE_CONFIG = {
    'AI-Prioritized': {
        color:      '#3b9eff',
        bg:         'rgba(59,158,255,0.08)',
        border:     'rgba(59,158,255,0.25)',
        icon:       '⚡',
        label:      'AI-Prioritized Mode',
        sublabel:   'Low-impact actions execute automatically. High-severity requires confirmation.',
    },
    'Human-Validated': {
        color:      '#f5c518',
        bg:         'rgba(245,197,24,0.08)',
        border:     'rgba(245,197,24,0.3)',
        icon:       '⚠',
        label:      'Human-Validated Mode',
        sublabel:   'All actions require operator confirmation. AI suggestions only.',
    },
} as const;

interface BannerProps {
    transition: ModeTransition;
    onDismiss:  () => void;
}

function Banner({ transition, onDismiss }: BannerProps) {
    const cfg      = MODE_CONFIG[transition.to];
    const [pct, setPct] = useState(100);

    // Progress bar countdown
    useEffect(() => {
        const start = Date.now();
        const total = 10_000;
        const id = setInterval(() => {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, 100 - (elapsed / total) * 100);
            setPct(remaining);
            if (remaining === 0) clearInterval(id);
        }, 100);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{
            position:       'fixed',
            top:            'var(--status-bar-h)',
            left:           0, right: 0,
            zIndex:         900,
            background:     cfg.bg,
            borderBottom:   `1px solid ${cfg.border}`,
            backdropFilter: 'blur(8px)',
            animation:      'slide-in-up 300ms ease both',
        }}>
            {/* Main content */}
            <div style={{
                display:     'flex',
                alignItems:  'center',
                gap:         12,
                padding:     '10px 16px',
                maxWidth:    1400,
                margin:      '0 auto',
            }}>

                {/* Icon */}
                <div style={{
                    width:          32, height: 32,
                    borderRadius:   '50%',
                    background:     `${cfg.color}20`,
                    border:         `1px solid ${cfg.color}40`,
                    display:        'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize:       '0.85rem', flexShrink: 0,
                }}>
                    {cfg.icon}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontFamily:    'var(--font-display)',
                        fontSize:      '0.72rem',
                        fontWeight:    700,
                        color:         cfg.color,
                        letterSpacing: '0.04em',
                    }}>
                        {transition.triggeredBy === 'manual' ? '🔧 Manual Override — ' : ''}
                        System switched to {cfg.label}
                    </div>
                    <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '0.58rem',
                        color:      'var(--text-muted)',
                        marginTop:  2,
                    }}>
                        {cfg.sublabel}
                        {transition.reason && (
                            <span style={{ color: 'var(--text-disabled)', marginLeft: 8 }}>
                · {transition.reason}
              </span>
                        )}
                    </div>
                </div>

                {/* Trigger badge */}
                <div style={{
                    padding:       '2px 8px',
                    background:    `${cfg.color}15`,
                    border:        `1px solid ${cfg.color}30`,
                    borderRadius:  4,
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.52rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color:         cfg.color,
                    flexShrink:    0,
                }}>
                    {transition.triggeredBy === 'manual' ? '🔑 Manual' : '🤖 Auto'}
                </div>

                {/* Dismiss */}
                <button
                    onClick={onDismiss}
                    style={{
                        padding:    '4px 8px',
                        background: 'transparent',
                        border:     `1px solid ${cfg.color}30`,
                        borderRadius:6,
                        cursor:     'pointer',
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '0.58rem',
                        color:      'var(--text-muted)',
                        outline:    'none',
                        flexShrink: 0,
                        transition: 'all 150ms ease',
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <div style={{
                position:   'absolute',
                bottom:     0, left: 0,
                height:     2,
                width:      `${pct}%`,
                background: cfg.color,
                opacity:    0.5,
                transition: 'width 100ms linear',
            }} />
        </div>
    );
}

export function ModeBanner() {
    const { pendingBanner, dismissBanner } = useMode();
    if (!pendingBanner) return null;
    return <Banner transition={pendingBanner} onDismiss={dismissBanner} />;
}