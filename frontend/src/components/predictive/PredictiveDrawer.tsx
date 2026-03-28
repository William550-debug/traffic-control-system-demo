'use client';

/**
 * PredictiveDrawer
 * ─────────────────
 * Replaces the fixed 140px Row 3 predictive strip with a slide-up drawer
 * anchored to the bottom edge of the map stage. Collapsed state: a slim
 * 36px pull-tab showing summary hotspots. Expanded state: slides up to
 * show the full PredictiveStrip content (200px tall panel).
 *
 * Placement: rendered as a child of the map stage div (position:relative),
 * so it lives entirely within Row 2 Col 1 — no grid rows needed below.
 *
 * z-index: 35 — above map overlays (z:20–30) but below emergency tint (z:40).
 * The MapIntelligenceOverlay's bottom panels (CBD Dwell at bottom:20,
 * Congestion Legend at bottom:20) will still be visible because:
 *   – Collapsed: pull-tab is 36px, panels sit left/right of centre
 *   – Expanded: panels slide up with the drawer out of conflict range
 *
 * Keyboard: P toggles open/close.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChevronUp, ChevronDown, Activity, Clock,
    TrendingUp, MapPin, AlertTriangle, Zap, X,
} from 'lucide-react';
import { PredictiveStrip } from '@/components/predictive/predictive-strip';
import { ErrorBoundary }   from '@/components/layout/Error-Boundary';
import { PredictiveSkeleton } from '@/components/layout/Skeletons';

// ─── Mock predictive summary for the pull-tab ────────────────────────────────
// In production, replace with data from usePredictive() hook.

const HOTSPOTS = [
    { label: 'Uhuru Hwy', eta: '+15m', level: 'high',   color: '#ff8800' },
    { label: 'CBD Ring',  eta: 'NOW',  level: 'critical',color: '#ff3b3b' },
    { label: 'Ngong Rd',  eta: '+30m', level: 'medium',  color: '#f5c518' },
    { label: 'Jogoo Rd',  eta: '+45m', level: 'low',     color: '#50c878' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PredictiveDrawer() {
    const [open, setOpen] = useState(false);
    const drawerRef       = useRef<HTMLDivElement>(null);

    // Toggle on P key (no modifier, not in text input)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                e.key === 'p' &&
                !e.metaKey && !e.ctrlKey &&
                !(e.target instanceof HTMLInputElement) &&
                !(e.target instanceof HTMLTextAreaElement)
            ) {
                setOpen(v => !v);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    // Close on Esc
    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, []);

    const DRAWER_HEIGHT   = 220;   // px — expanded panel content height
    // Increased from 36 to 42px — the taller pull-tab gives hotspot chips
    // more vertical room and makes the hit target more comfortable.
    const PUSHTAB_HEIGHT  = 42;    // px — always-visible pull-tab

    return (
        <div
            ref={drawerRef}
            style={{
                // Anchor to the bottom of the map stage
                position:   'absolute',
                bottom:     0,
                left:       0,
                right:      0,
                zIndex:     35,
                // Slide the full block (tab + content) upward when open
                transform:  open
                    ? `translateY(-${DRAWER_HEIGHT}px)`
                    : 'translateY(0)',
                transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)',
                // Don't let the container clip the slide-up content
                overflow:   'visible',
                pointerEvents: 'none',   // re-enabled per-child below
            }}
        >
            {/* ── Pull-tab — always visible at map bottom edge ── */}
            <div
                onClick={() => setOpen(v => !v)}
                title="Predictive strip (P)"
                style={{
                    height:         PUSHTAB_HEIGHT,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    padding:        '0 16px',
                    cursor:         'pointer',
                    pointerEvents:  'all',
                    userSelect:     'none',
                    // Glass surface
                    background:     'rgba(10, 12, 18, 0.88)',
                    backdropFilter: 'blur(10px)',
                    borderTop:      '1px solid rgba(255,255,255,0.08)',
                    // Rounded top corners only
                    borderTopLeftRadius:  10,
                    borderTopRightRadius: 10,
                    transition: 'background 200ms ease',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(20,24,32,0.94)';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(10,12,18,0.88)';
                }}
            >
                {/* Left — label + live dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                        className="relative flex"
                        style={{ width: 6, height: 6 }}
                    >
                        <span
                            className="absolute inline-flex rounded-full animate-ping opacity-50"
                            style={{ width: 6, height: 6, background: 'var(--accent-primary)' }}
                        />
                        <span
                            className="relative inline-flex rounded-full"
                            style={{ width: 6, height: 6, background: 'var(--accent-primary)' }}
                        />
                    </span>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'clamp(0.6rem, 0.78vw, 0.7rem)',
                        fontWeight:    700,
                        letterSpacing: '0.09em',
                        textTransform: 'uppercase',
                        color:         'var(--text-secondary)',
                    }}>
                        Predictive
                    </span>
                </div>

                {/* Centre — hotspot summary chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', overflow: 'hidden' }}>
                    {HOTSPOTS.map(h => (
                        <div
                            key={h.label}
                            style={{
                                display:     'flex',
                                alignItems:  'center',
                                gap:         5,
                                // Increased vertical padding so chips are more legible
                                padding:     '3px 10px',
                                borderRadius: 7,
                                background:  `${h.color}12`,
                                border:      `1px solid ${h.color}30`,
                                flexShrink:  0,
                            }}
                        >
                            <span style={{
                                width:      6,
                                height:     6,
                                borderRadius: '50%',
                                background: h.color,
                                flexShrink: 0,
                                display:    'inline-block',
                                animation:  h.level === 'critical' ? 'pulse-dot 1.4s ease infinite' : 'none',
                            }} />
                            <span style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      'clamp(0.56rem, 0.72vw, 0.66rem)',
                                color:         h.color,
                                fontWeight:    700,
                                whiteSpace:    'nowrap',
                            }}>
                                {h.label}
                            </span>
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.5rem, 0.65vw, 0.6rem)',
                                color:      'var(--text-disabled)',
                                whiteSpace: 'nowrap',
                            }}>
                                {h.eta}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Right — chevron + keyboard hint */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'clamp(0.5rem, 0.65vw, 0.6rem)',
                        color:         'var(--text-disabled)',
                        letterSpacing: '0.04em',
                    }}>
                        P
                    </span>
                    {open
                        ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                        : <ChevronUp   size={14} style={{ color: 'var(--text-muted)' }} />
                    }
                </div>
            </div>

            {/* ── Expanded drawer content ── */}
            <div
                style={{
                    height:         DRAWER_HEIGHT,
                    background:     'rgba(10, 12, 18, 0.96)',
                    backdropFilter: 'blur(14px)',
                    borderTop:      '1px solid rgba(255,255,255,0.06)',
                    overflow:       'hidden',
                    pointerEvents:  'all',
                    // Opacity fade in sync with slide
                    opacity:        open ? 1 : 0,
                    transition:     'opacity 200ms ease',
                }}
            >
                <ErrorBoundary label="Predictive" fallback={<PredictiveSkeleton />}>
                    <PredictiveStrip />
                </ErrorBoundary>
            </div>
        </div>
    );
}