'use client';

import { useState, useRef, useEffect } from 'react';
import { useMode } from '@/providers/mode-provider';
import { useAuth } from '@/providers/auth-provider';
import type { OperatingMode } from '@/types';

const MODE_COLORS: Record<OperatingMode, string> = {
    'AI-Prioritized':  '#3b9eff',
    'Human-Validated': '#f5c518',
};

const MODE_SHORT: Record<OperatingMode, string> = {
    'AI-Prioritized':  'AI',
    'Human-Validated': 'HV',
};

// ── Read-only mode pill ───────────────────
export function ModeIndicator() {
    const { currentMode } = useMode();
    const color   = MODE_COLORS[currentMode];
    const isHuman = currentMode === 'Human-Validated';

    return (
        <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          4,
            padding:      '2px 6px',
            background:   `${color}12`,
            border:       `1px solid ${color}35`,
            borderRadius: 4,
            flexShrink:   0,
        }}>
            <div style={{
                width:     4, height: 4, borderRadius: '50%',
                background: color,
                animation:  isHuman ? 'pulse-dot 1.2s ease infinite' : 'none',
                boxShadow:  `0 0 3px ${color}`,
                flexShrink: 0,
            }} />
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.5rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color,
                fontWeight:    600,
                whiteSpace:    'nowrap',
            }}>
        {MODE_SHORT[currentMode]}
      </span>
        </div>
    );
}

// ── Override controls (supervisor only) ───
export function ModeControls() {
    const { currentMode, manualOverride, autoTransitionEnabled, setAutoTransition, canOverride } = useMode();
    const { user }                       = useAuth();
    const [open, setOpen]                = useState(false);
    const [reason, setReason]            = useState('');
    const btnRef                         = useRef<HTMLButtonElement>(null);
    const popoverRef                     = useRef<HTMLDivElement>(null);
    const [popPos, setPopPos]            = useState({ top: 0, right: 0 });

    // Position popover relative to button using fixed coords — never affects layout
    useEffect(() => {
        if (!open || !btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        setPopPos({
            top:   rect.bottom + 6,
            right: window.innerWidth - rect.right,
        });
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                !btnRef.current?.contains(e.target as Node) &&
                !popoverRef.current?.contains(e.target as Node)
            ) {
                setOpen(false);
                setReason('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    if (!canOverride) return <ModeIndicator />;

    const targetMode: OperatingMode = currentMode === 'AI-Prioritized'
        ? 'Human-Validated'
        : 'AI-Prioritized';

    const targetColor = MODE_COLORS[targetMode];

    const handleOverride = () => {
        if (!reason.trim() || !user) return;
        manualOverride(targetMode, reason.trim(), user.id);
        setReason('');
        setOpen(false);
    };

    return (
        <>
            {/* Compact trigger row — never stretches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <ModeIndicator />
                <button
                    ref={btnRef}
                    onClick={() => setOpen(v => !v)}
                    title="Override operating mode"
                    style={{
                        width:        20, height: 20,
                        display:      'flex', alignItems: 'center', justifyContent: 'center',
                        padding:      0,
                        background:   open ? 'rgba(245,197,24,0.12)' : 'transparent',
                        border:       `1px solid ${open ? 'rgba(245,197,24,0.4)' : 'var(--border-default)'}`,
                        borderRadius: 4,
                        cursor:       'pointer',
                        fontSize:     '0.6rem',
                        color:        open ? '#f5c518' : 'var(--text-muted)',
                        outline:      'none',
                        transition:   'all 150ms ease',
                        flexShrink:   0,
                    }}
                >
                    ⚙
                </button>
            </div>

            {/* Popover — fixed position, floats over everything, never affects layout */}
            {open && (
                <div
                    ref={popoverRef}
                    style={{
                        position:     'fixed',
                        top:          popPos.top,
                        right:        popPos.right,
                        width:        260,
                        background:   'var(--bg-overlay)',
                        border:       '1px solid var(--border-strong)',
                        borderRadius: 10,
                        padding:      14,
                        zIndex:       1000,
                        boxShadow:    '0 8px 32px rgba(0,0,0,0.6)',
                        animation:    'slide-in-up 180ms ease both',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display:       'flex',
                        alignItems:    'center',
                        justifyContent:'space-between',
                        marginBottom:  10,
                    }}>
            <span style={{
                fontFamily: 'var(--font-display)', fontSize: '0.66rem',
                fontWeight: 700, color: 'var(--text-primary)',
            }}>
              Override Mode
            </span>
                        <button
                            onClick={() => { setOpen(false); setReason(''); }}
                            style={{
                                padding: '2px 6px', background: 'transparent',
                                border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)', fontSize: '0.75rem', outline: 'none',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Target mode label */}
                    <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
                        color: 'var(--text-muted)', marginBottom: 10, letterSpacing: '0.04em',
                    }}>
                        Switch to:{' '}
                        <strong style={{ color: targetColor }}>{targetMode}</strong>
                    </div>

                    {/* Auto-transition toggle */}
                    <div
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            marginBottom: 10, cursor: 'pointer',
                        }}
                        onClick={() => setAutoTransition(!autoTransitionEnabled)}
                    >
                        <div style={{
                            width:        28, height: 14, borderRadius: 7,
                            background:   autoTransitionEnabled ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                            border:       '1px solid var(--border-strong)',
                            position:     'relative', flexShrink: 0,
                            transition:   'background 200ms ease',
                        }}>
                            <div style={{
                                position:   'absolute',
                                top: 1,
                                left: autoTransitionEnabled ? 'calc(100% - 13px)' : 2,
                                width: 10, height: 10, borderRadius: '50%',
                                background: 'white',
                                transition: 'left 200ms ease',
                            }} />
                        </div>
                        <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.53rem',
                            color: 'var(--text-muted)',
                        }}>
              Auto-transition {autoTransitionEnabled ? 'on' : 'off'}
            </span>
                    </div>

                    {/* Reason textarea */}
                    <textarea
                        autoFocus
                        placeholder="Reason for override (required)"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={2}
                        style={{
                            width:        '100%',
                            padding:      '6px 9px',
                            background:   'var(--bg-base)',
                            border:       '1px solid var(--border-default)',
                            borderRadius: 6,
                            fontFamily:   'var(--font-mono)',
                            fontSize:     '0.6rem',
                            color:        'var(--text-primary)',
                            resize:       'none',
                            outline:      'none',
                            boxSizing:    'border-box',
                            marginBottom: 8,
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleOverride(); }}
                    />

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={handleOverride}
                            disabled={!reason.trim()}
                            style={{
                                flex:         1,
                                padding:      '6px',
                                background:   reason.trim() ? `${targetColor}20` : 'transparent',
                                border:       `1px solid ${reason.trim() ? targetColor : 'var(--border-default)'}`,
                                borderRadius: 6,
                                cursor:       reason.trim() ? 'pointer' : 'not-allowed',
                                fontFamily:   'var(--font-mono)',
                                fontSize:     '0.58rem',
                                color:        reason.trim() ? targetColor : 'var(--text-disabled)',
                                outline:      'none',
                                transition:   'all 150ms ease',
                            }}
                        >
                            Confirm Override
                        </button>
                        <button
                            onClick={() => { setOpen(false); setReason(''); }}
                            style={{
                                padding:      '6px 10px',
                                background:   'transparent',
                                border:       '1px solid var(--border-default)',
                                borderRadius: 6,
                                cursor:       'pointer',
                                fontFamily:   'var(--font-mono)',
                                fontSize:     '0.58rem',
                                color:        'var(--text-muted)',
                                outline:      'none',
                            }}
                        >
                            Cancel
                        </button>
                    </div>

                    <div style={{
                        marginTop:  8, fontFamily: 'var(--font-mono)',
                        fontSize:   '0.48rem', color: 'var(--text-disabled)',
                        letterSpacing: '0.04em',
                    }}>
                        ⌘↵ to confirm
                    </div>
                </div>
            )}
        </>
    );
}