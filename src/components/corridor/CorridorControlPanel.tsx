'use client';

import { useState, useEffect } from 'react';
import type { Corridor, SignalTiming } from '@/types';
import {
    CORRIDOR_STATUS_LABELS,
    CORRIDOR_STATUS_COLORS,
} from '@/lib/utils';
import { SignalTimingDiagram } from './SignalTiming';
import { FlowRateBar }         from './FlowRate';
import { useAuth }             from '@/providers/auth-provider';

interface CorridorControlPanelProps {
    corridor:       Corridor | null;
    onClose:        () => void;
    onUpdateTiming: (corridorId: string, timing: SignalTiming) => void;
    onLock:         (corridorId: string, by: string) => void;
    onUnlock:       (corridorId: string) => void;
}

// ── Section label ─────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      '0.55rem',
            letterSpacing: '0.12em',
            color:         'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom:  8,
        }}>
            {children}
        </div>
    );
}

// ── Camera thumbnail ─────────────────────
function CameraThumbnail({
                             label,
                             online,
                         }: {
    label:  string;
    online: boolean;
}) {
    return (
        <div style={{
            padding:      '10px',
            background:   'var(--bg-elevated)',
            border:       `1px solid ${online ? 'var(--border-default)' : 'rgba(255,59,59,0.2)'}`,
            borderRadius: 8,
            display:      'flex',
            flexDirection:'column',
            alignItems:   'center',
            gap:          6,
            flex:         1,
        }}>
            {/* Mock camera frame */}
            <div style={{
                width:        '100%',
                aspectRatio:  '16/9',
                background:   online
                    ? 'linear-gradient(135deg, var(--bg-void) 0%, var(--bg-overlay) 100%)'
                    : 'rgba(255,59,59,0.05)',
                borderRadius: 4,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                position:     'relative',
                overflow:     'hidden',
            }}>
                {online ? (
                    <>
                        {/* Simulated road lines */}
                        <div style={{
                            position:   'absolute',
                            inset:      0,
                            background: `repeating-linear-gradient(
                to bottom,
                transparent 0px, transparent 8px,
                rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 9px
              )`,
                        }} />
                        <span style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      '0.5rem',
                            color:         'var(--text-disabled)',
                            letterSpacing: '0.08em',
                            position:      'relative',
                            zIndex:        1,
                        }}>
              LIVE
            </span>
                        <div style={{
                            position:     'absolute',
                            top:          4,
                            right:        4,
                            width:        5,
                            height:       5,
                            borderRadius: '50%',
                            background:   'var(--severity-critical)',
                            animation:    'pulse-dot 1.5s ease infinite',
                        }} />
                    </>
                ) : (
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.55rem',
                        color:         'var(--severity-critical)',
                        letterSpacing: '0.08em',
                        opacity:       0.7,
                    }}>
            OFFLINE
          </span>
                )}
            </div>

            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.55rem',
                color:         online ? 'var(--text-muted)' : 'var(--severity-critical)',
                letterSpacing: '0.06em',
            }}>
        {label}
      </span>
        </div>
    );
}

// ── Micro-recommendation chip ─────────────
function MicroRec({ text, impact }: { text: string; impact: string }) {
    return (
        <div style={{
            padding:      '7px 10px',
            background:   'rgba(59,158,255,0.06)',
            border:       '1px solid rgba(59,158,255,0.15)',
            borderLeft:   '2px solid var(--accent-primary)',
            borderRadius: 6,
            display:      'flex',
            alignItems:   'flex-start',
            gap:          8,
        }}>
            <span style={{ fontSize: '0.75rem', flexShrink: 0, marginTop: 1 }}>⚡</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   '0.62rem',
                    color:      'var(--text-secondary)',
                    lineHeight: 1.4,
                }}>
                    {text}
                </div>
                <div style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      '0.55rem',
                    color:         'var(--status-online)',
                    marginTop:     2,
                    letterSpacing: '0.04em',
                }}>
                    {impact}
                </div>
            </div>
        </div>
    );
}

// ── Panel header ──────────────────────────
function PanelHeader({
                         corridor,
                         onClose,
                     }: {
    corridor: Corridor;
    onClose:  () => void;
}) {
    const statusColor = CORRIDOR_STATUS_COLORS[corridor.status];

    return (
        <div style={{
            padding:       '14px 16px 12px',
            borderBottom:  `1px solid ${statusColor}30`,
            background:    `${statusColor}08`,
            flexShrink:    0,
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                    width:        3,
                    alignSelf:    'stretch',
                    background:   statusColor,
                    borderRadius: 2,
                    flexShrink:   0,
                    boxShadow:    `0 0 8px ${statusColor}60`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'space-between',
                        marginBottom:   5,
                    }}>
            <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.55rem',
                letterSpacing: '0.12em',
                color:         statusColor,
                textTransform: 'uppercase',
            }}>
              {CORRIDOR_STATUS_LABELS[corridor.status]}
            </span>
                        <button
                            onClick={onClose}
                            aria-label="Close corridor panel"
                            style={{
                                width:      24,
                                height:     24,
                                display:    'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.05)',
                                border:     '1px solid var(--border-default)',
                                borderRadius: 4,
                                cursor:     'pointer',
                                color:      'var(--text-muted)',
                                fontSize:   '0.8rem',
                                outline:    'none',
                                flexShrink: 0,
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <h2 style={{
                        fontFamily:   'var(--font-display)',
                        fontSize:     '0.95rem',
                        fontWeight:   700,
                        color:        'var(--text-primary)',
                        margin:       0,
                        lineHeight:   1.2,
                    }}>
                        {corridor.name}
                    </h2>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.58rem',
                        color:         'var(--text-muted)',
                        marginTop:     3,
                        display:       'block',
                    }}>
            {corridor.intersections.length} intersections
                        {corridor.lockedBy && (
                            <span style={{ color: 'var(--severity-medium)', marginLeft: 8 }}>
                · Locked by {corridor.lockedBy}
              </span>
                        )}
          </span>
                </div>
            </div>
        </div>
    );
}

// ── Main panel ────────────────────────────
export function CorridorControlPanel({
                                         corridor,
                                         onClose,
                                         onUpdateTiming,
                                         onLock,
                                         onUnlock,
                                     }: CorridorControlPanelProps) {
    const { user, hasPermission } = useAuth();

    const [localTiming,  setLocalTiming]  = useState<SignalTiming | null>(null);
    const [timingDirty,  setTimingDirty]  = useState(false);
    const [applyResult,  setApplyResult]  = useState<string | null>(null);

    const isOpen = corridor !== null;

    // Sync local timing when corridor changes
    useEffect(() => {
        if (corridor?.signalTiming) {
            setLocalTiming({ ...corridor.signalTiming });
            setTimingDirty(false);
            setApplyResult(null);
        }
    }, [corridor?.id, corridor?.signalTiming]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleTimingChange = (timing: SignalTiming) => {
        setLocalTiming(timing);
        setTimingDirty(true);
        setApplyResult(null);
    };

    const handleApplyTiming = () => {
        if (!corridor || !localTiming) return;
        onUpdateTiming(corridor.id, localTiming);
        setTimingDirty(false);
        setApplyResult('Signal timing updated — changes propagating to 3 intersections');
        setTimeout(() => setApplyResult(null), 4000);
    };

    const handleLockToggle = () => {
        if (!corridor || !user) return;
        if (corridor.lockedBy) {
            onUnlock(corridor.id);
        } else {
            onLock(corridor.id, user.name);
        }
    };

    const isLocked      = !!corridor?.lockedBy;
    const lockedByMe    = corridor?.lockedBy === user?.name;
    const canEdit       = hasPermission('approve_signal') && (!isLocked || lockedByMe);

    // Mock micro-recommendations per corridor
    const microRecs = corridor ? [
        {
            text:   `Extend green phase by 12s on ${corridor.name} southbound`,
            impact: '−18% queue length',
        },
        {
            text:   'Coordinate with adjacent signal at next intersection',
            impact: '−8% travel time',
        },
    ] : [];

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position:      'fixed',
                    inset:         0,
                    zIndex:        700,
                    background:    'rgba(8,11,15,0.4)',
                    opacity:       isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transition:    'opacity 250ms ease',
                }}
            />

            {/* Panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={corridor ? `Corridor: ${corridor.name}` : 'Corridor control'}
                style={{
                    position:      'fixed',
                    top:           0,
                    right:         0,
                    bottom:        0,
                    width:         360,
                    zIndex:        800,
                    background:    'var(--bg-raised)',
                    borderLeft:    `1px solid ${corridor
                        ? `${CORRIDOR_STATUS_COLORS[corridor.status]}40`
                        : 'var(--border-default)'
                    }`,
                    transform:     isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition:    'transform 280ms cubic-bezier(0.32,0,0.15,1)',
                    display:       'flex',
                    flexDirection: 'column',
                    overflow:      'hidden',
                }}
            >
                {corridor && localTiming && (
                    <>
                        {/* Header */}
                        <PanelHeader corridor={corridor} onClose={onClose} />

                        {/* Scrollable body */}
                        <div style={{
                            flex:          1,
                            overflow:      'auto',
                            padding:       '14px 16px',
                            display:       'flex',
                            flexDirection: 'column',
                            gap:           18,
                        }}>

                            {/* Flow rate */}
                            <div>
                                <SectionLabel>Traffic Flow</SectionLabel>
                                <FlowRateBar
                                    flowRate={corridor.flowRate}
                                    capacityRate={corridor.capacityRate}
                                    avgSpeedKph={corridor.avgSpeedKph}
                                />
                            </div>

                            {/* Camera feeds */}
                            <div>
                                <SectionLabel>Camera Feeds</SectionLabel>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <CameraThumbnail label="N Approach" online={true}  />
                                    <CameraThumbnail label="S Approach" online={true}  />
                                    <CameraThumbnail label="Junction"   online={corridor.status !== 'emergency'} />
                                </div>
                            </div>

                            {/* Signal timing */}
                            <div>
                                <div style={{
                                    display:        'flex',
                                    alignItems:     'center',
                                    justifyContent: 'space-between',
                                    marginBottom:   8,
                                }}>
                                    <SectionLabel>Signal Timing</SectionLabel>
                                    {/* Lock toggle */}
                                    {hasPermission('approve_signal') && (
                                        <button
                                            onClick={handleLockToggle}
                                            style={{
                                                padding:       '2px 8px',
                                                background:    isLocked
                                                    ? lockedByMe ? 'rgba(245,197,24,0.12)' : 'rgba(255,59,59,0.1)'
                                                    : 'transparent',
                                                border:        `1px solid ${isLocked
                                                    ? lockedByMe ? 'rgba(245,197,24,0.3)' : 'rgba(255,59,59,0.3)'
                                                    : 'var(--border-default)'
                                                }`,
                                                borderRadius:  4,
                                                cursor:        !isLocked || lockedByMe ? 'pointer' : 'not-allowed',
                                                fontFamily:    'var(--font-mono)',
                                                fontSize:      '0.55rem',
                                                color:         isLocked
                                                    ? lockedByMe ? 'var(--severity-medium)' : 'var(--severity-critical)'
                                                    : 'var(--text-muted)',
                                                letterSpacing: '0.06em',
                                                outline:       'none',
                                                marginBottom:  8,
                                            }}
                                        >
                                            {isLocked
                                                ? lockedByMe ? '🔒 Locked by you' : `🔒 ${corridor.lockedBy}`
                                                : '🔓 Lock to edit'
                                            }
                                        </button>
                                    )}
                                </div>

                                {!canEdit && isLocked && !lockedByMe && (
                                    <div style={{
                                        padding:      '8px 10px',
                                        background:   'rgba(255,59,59,0.08)',
                                        border:       '1px solid rgba(255,59,59,0.2)',
                                        borderRadius: 6,
                                        marginBottom: 10,
                                    }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.62rem',
                        color:         'var(--severity-critical)',
                    }}>
                      Locked by {corridor.lockedBy} — view only
                    </span>
                                    </div>
                                )}

                                <SignalTimingDiagram
                                    timing={localTiming}
                                    onChange={handleTimingChange}
                                    readonly={!canEdit}
                                />

                                {/* Apply / unsaved indicator */}
                                {timingDirty && canEdit && (
                                    <div style={{
                                        display:      'flex',
                                        alignItems:   'center',
                                        gap:          8,
                                        marginTop:    10,
                                        animation:    'slide-in-up 200ms ease',
                                    }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      '0.58rem',
                        color:         'var(--severity-medium)',
                        flex:          1,
                    }}>
                      Unsaved changes
                    </span>
                                        <button
                                            onClick={() => {
                                                setLocalTiming({ ...corridor.signalTiming! });
                                                setTimingDirty(false);
                                            }}
                                            style={{
                                                padding:    '4px 10px',
                                                background: 'transparent',
                                                border:     '1px solid var(--border-default)',
                                                borderRadius: 5,
                                                cursor:     'pointer',
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   '0.6rem',
                                                color:      'var(--text-muted)',
                                                outline:    'none',
                                            }}
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={handleApplyTiming}
                                            style={{
                                                padding:       '4px 12px',
                                                background:    'rgba(59,158,255,0.15)',
                                                border:        '1px solid rgba(59,158,255,0.4)',
                                                borderRadius:  5,
                                                cursor:        'pointer',
                                                fontFamily:    'var(--font-mono)',
                                                fontSize:      '0.6rem',
                                                fontWeight:    600,
                                                color:         'var(--accent-primary)',
                                                outline:       'none',
                                                transition:    'all 150ms ease',
                                            }}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                )}

                                {applyResult && (
                                    <div style={{
                                        marginTop:    8,
                                        padding:      '7px 10px',
                                        background:   'rgba(34,197,94,0.1)',
                                        border:       '1px solid rgba(34,197,94,0.25)',
                                        borderRadius: 6,
                                        fontFamily:   'var(--font-mono)',
                                        fontSize:     '0.6rem',
                                        color:        'var(--status-online)',
                                        animation:    'slide-in-up 200ms ease',
                                    }}>
                                        ✓ {applyResult}
                                    </div>
                                )}
                            </div>

                            {/* AI micro-recommendations */}
                            <div>
                                <SectionLabel>AI Micro-Recommendations</SectionLabel>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {microRecs.map((rec, i) => (
                                        <MicroRec key={i} text={rec.text} impact={rec.impact} />
                                    ))}
                                </div>
                            </div>

                        </div>
                    </>
                )}
            </div>
        </>
    );
}