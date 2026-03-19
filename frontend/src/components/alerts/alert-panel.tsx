'use client';

/**
 * AlertPanel — Enhanced
 *
 * Key improvements over original:
 *  - LIVE pulse chip + last-updated ticker in header
 *  - Severity pills with trend direction indicators
 *  - Type filter chips with per-type counts
 *  - Group headers with handled-% progress bar (replaces inline hover mutations)
 *  - AlertDigest with AI confidence rollup
 *  - Polished EmptyState with contextual messaging
 *  - onDispatch now carries DispatchService payload for full round-trip
 *  - ModeStrip popover: replaced raw <button> confirm/cancel with shadcn Button
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    AlertTriangle,
    Flame,
    AlertCircle,
    Info,
    Radio,
    SlidersHorizontal,
    X,
    Bot,
    ShieldCheck,
    Layers,
    List,
    ChevronUp,
    ChevronDown,
    CheckCircle,
    CheckCircle2,
    ToggleLeft,
    ToggleRight,
    ArrowLeftRight,
    Activity,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    Wifi,
    Filter,
    Zap,
    Sparkles,
} from 'lucide-react';
import { AlertCard }                        from './alert-card';
import { AlertClusterGroup, clusterAlerts } from './alert-cluster';
import type { Alert, Severity, AlertType, AlertPendingAction, OperatingMode } from '@/types';
import { SEVERITY_COLORS, ALERT_TYPE_LABELS, sortBySeverity } from '@/lib/utils';
import { useMode }   from '@/providers/mode-provider';
import { useAuth }   from '@/providers/auth-provider';
import { Badge }     from '@/components/ui/badge';
import { Button }    from '@/components/ui/button';
import { Progress }  from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAlerts } from '@/hooks/use-alerts';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type DispatchService = 'police' | 'ambulance' | 'red_cross' | 'ntsa';

interface AlertPanelProps {
    alerts:          Alert[];
    focusedAlertId?: string;
    pendingActions?: Record<string, AlertPendingAction>;
    onAlertSelect:   (alert: Alert) => void;
    onApprove:       (id: string) => void;
    onIgnore:        (id: string, reason?: string) => void;
    onDispatch?:     (id: string, service?: DispatchService) => void;
    onEscalate?:     (id: string) => void;
    onApproveAll?:   (ids: string[]) => void;
}

type FilterSeverity = Severity | 'all';
type FilterType     = AlertType | 'all';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_ICONS: Record<Severity, React.ElementType> = {
    critical: AlertTriangle,
    high:     Flame,
    medium:   AlertCircle,
    low:      Info,
    info:     Radio,
};

const SEVERITY_ORDER: Severity[]  = ['critical', 'high', 'medium', 'low', 'info'];
const MAX_VISIBLE_PER_GROUP       = 3;

// ─── Live header indicator ────────────────────────────────────────────────────

function LiveIndicator() {
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [secondsAgo,  setSecondsAgo]  = useState(0);

    useEffect(() => {
        // Simulate feed refreshing every 7s
        const refresh = setInterval(() => setLastUpdated(new Date()), 7000);
        return () => clearInterval(refresh);
    }, []);

    useEffect(() => {
        setSecondsAgo(0);
        const tick = setInterval(() => setSecondsAgo(s => s + 1), 1000);
        return () => clearInterval(tick);
    }, [lastUpdated]);

    return (
        <div className="flex items-center gap-1.5 shrink-0">
            {/* Pulsing live dot */}
            <span className="relative flex h-2 w-2 shrink-0">
                <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ background: 'var(--status-online)' }}
                />
                <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: 'var(--status-online)' }}
                />
            </span>
            <span
                className="text-[0.48rem] tracking-[0.08em] uppercase"
                style={{ color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}
            >
                LIVE
            </span>
            <span
                className="text-[0.46rem]"
                style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
            >
                · {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
            </span>
        </div>
    );
}

// ─── Severity filter pill ─────────────────────────────────────────────────────

function SeverityPill({
                          severity, count, active, onClick, trend,
                      }: {
    severity: Severity;
    count:    number;
    active:   boolean;
    onClick:  () => void;
    trend?:   'up' | 'down' | 'stable';
}) {
    const color = SEVERITY_COLORS[severity];
    const Icon  = SEVERITY_ICONS[severity];

    const TrendIcon =
        trend === 'up'   ? TrendingUp   :
            trend === 'down' ? TrendingDown :
                Minus;

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        aria-label={`${severity} — ${count} alert${count !== 1 ? 's' : ''}`}
                        aria-pressed={active}
                        className="flex items-center gap-[5px] rounded-lg transition-all duration-200 shrink-0 relative"
                        style={{
                            padding:    '5px 9px',
                            background: active ? `${color}20` : `${color}08`,
                            border:     `1px solid ${active ? `${color}55` : `${color}18`}`,
                            color,
                            boxShadow:  active
                                ? severity === 'critical'
                                    ? `0 0 10px ${color}35, inset 0 0 8px ${color}08`
                                    : `0 0 6px ${color}25`
                                : 'none',
                            transform:  active ? 'translateY(-0.5px)' : 'none',
                        }}
                    >
                        <Icon
                            size={11}
                            strokeWidth={active ? 2.5 : 2}
                            style={{
                                animation: active && severity === 'critical'
                                    ? 'pulse-dot 1.4s ease infinite'
                                    : 'none',
                                flexShrink: 0,
                            }}
                        />
                        <span
                            className="text-[0.58rem] font-bold tabular-nums leading-none"
                            style={{ fontFamily: 'var(--font-mono)' }}
                        >
                            {count}
                        </span>
                        {trend && trend !== 'stable' && (
                            <TrendIcon
                                size={9}
                                strokeWidth={2.5}
                                style={{
                                    color:   trend === 'up' ? color : 'var(--text-disabled)',
                                    opacity: 0.8,
                                    flexShrink: 0,
                                }}
                            />
                        )}
                        {/* Active underline accent */}
                        {active && (
                            <span
                                className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                                style={{
                                    width:      '60%',
                                    height:     2,
                                    background: color,
                                    opacity:    0.7,
                                }}
                            />
                        )}
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs capitalize">
                    {severity} · {count} alert{count !== 1 ? 's' : ''}
                    {trend === 'up' ? ' ↑ increasing' : trend === 'down' ? ' ↓ decreasing' : ''}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ─── Mode strip ───────────────────────────────────────────────────────────────

function ModeStrip({ isHumanMode }: { isHumanMode: boolean }) {
    const {
        currentMode,
        manualOverride,
        autoTransitionEnabled,
        setAutoTransition,
        canOverride,
    } = useMode();
    const { user } = useAuth();

    const [open,   setOpen]   = useState(false);
    const [reason, setReason] = useState('');
    const toggleBtnRef        = useRef<HTMLButtonElement>(null);
    const popoverRef          = useRef<HTMLDivElement>(null);
    const [popPos, setPopPos] = useState({ top: 0, left: 0 });

    const ModeIcon    = isHumanMode ? ShieldCheck : Bot;
    const ToggleIcon  = isHumanMode ? ToggleRight : ToggleLeft;
    const color       = isHumanMode ? '#f5c518' : 'var(--accent-primary)';
    const label       = isHumanMode ? 'Human-Validated'       : 'AI-Prioritized';
    const sublabel    = isHumanMode ? 'Operator review required' : 'Auto-prioritized by AI';
    const toggleColor = isHumanMode ? '#f5c518' : 'var(--text-disabled)';

    const targetMode:  OperatingMode = isHumanMode ? 'AI-Prioritized' : 'Human-Validated';
    const targetColor                = isHumanMode ? 'var(--accent-primary)' : '#f5c518';
    const targetLabel                = isHumanMode ? 'AI-Prioritized' : 'Human-Validated';

    // Position popover below toggle button
    useEffect(() => {
        if (!open || !toggleBtnRef.current) return;
        const rect = toggleBtnRef.current.getBoundingClientRect();
        setPopPos({
            top:  rect.bottom + 6,
            left: Math.max(8, rect.right - 260),
        });
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                !toggleBtnRef.current?.contains(e.target as Node) &&
                !popoverRef.current?.contains(e.target as Node)
            ) {
                setOpen(false);
                setReason('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleConfirm = () => {
        if (!reason.trim() || !user) return;
        manualOverride(targetMode, reason.trim(), user.id);
        setReason('');
        setOpen(false);
    };

    return (
        <>
            {/* ── Mode strip bar ── */}
            <div
                className="flex items-center gap-3 px-4 shrink-0"
                style={{
                    height:       52,
                    background:   isHumanMode ? 'rgba(245,197,24,0.04)' : 'rgba(59,158,255,0.025)',
                    borderBottom: `1px solid ${isHumanMode ? 'rgba(245,197,24,0.15)' : 'var(--border-subtle)'}`,
                    borderTop:    `1px solid ${isHumanMode ? 'rgba(245,197,24,0.08)' : 'transparent'}`,
                    transition:   'all 400ms ease',
                }}
            >
                {/* Mode icon */}
                <div
                    className="flex items-center justify-center shrink-0 rounded-lg"
                    style={{
                        width:      30,
                        height:     30,
                        background: isHumanMode ? 'rgba(245,197,24,0.14)' : 'rgba(59,158,255,0.10)',
                        border:     `1px solid ${isHumanMode ? 'rgba(245,197,24,0.38)' : 'rgba(59,158,255,0.28)'}`,
                        boxShadow:  isHumanMode ? '0 0 8px rgba(245,197,24,0.18)' : 'none',
                        transition: 'all 400ms ease',
                    }}
                >
                    <ModeIcon
                        size={16}
                        strokeWidth={2}
                        style={{ color, transition: 'color 400ms ease', flexShrink: 0 }}
                    />
                </div>

                {/* Label + subtitle */}
                <div className="flex flex-col flex-1 min-w-0 gap-[3px]">
                    <span
                        style={{
                            fontFamily:    'var(--font-mono)',
                            fontSize:      'clamp(0.58rem, 0.5rem + 0.25vw, 0.68rem)',
                            fontWeight:    700,
                            letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            color,
                            lineHeight:    1,
                            transition:    'color 400ms ease',
                            whiteSpace:    'nowrap',
                            overflow:      'hidden',
                            textOverflow:  'ellipsis',
                        }}
                    >
                        {label}
                    </span>
                    <span
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   '0.5rem',
                            color:      'var(--text-disabled)',
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {sublabel}
                    </span>
                </div>

                {/* Toggle button */}
                <button
                    ref={toggleBtnRef}
                    onClick={() => { if (!canOverride) return; setOpen(v => !v); }}
                    aria-label={canOverride ? `Switch to ${targetLabel}` : 'Supervisor access required'}
                    aria-expanded={open}
                    title={canOverride ? `Switch to ${targetLabel}` : 'Supervisor access required'}
                    className="flex items-center justify-center shrink-0 rounded-lg transition-all duration-150"
                    style={{
                        width:      40,
                        height:     30,
                        background: open
                            ? (isHumanMode ? 'rgba(245,197,24,0.15)' : 'rgba(59,158,255,0.15)')
                            : 'transparent',
                        border: `1px solid ${open
                            ? (isHumanMode ? 'rgba(245,197,24,0.45)' : 'rgba(59,158,255,0.45)')
                            : 'var(--border-default)'}`,
                        cursor:  canOverride ? 'pointer' : 'not-allowed',
                        outline: 'none',
                        opacity: canOverride ? 1 : 0.45,
                    }}
                    onMouseEnter={e => {
                        if (!open && canOverride) {
                            (e.currentTarget as HTMLButtonElement).style.background  =
                                isHumanMode ? 'rgba(245,197,24,0.08)' : 'rgba(59,158,255,0.08)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor =
                                isHumanMode ? 'rgba(245,197,24,0.35)' : 'rgba(59,158,255,0.35)';
                        }
                    }}
                    onMouseLeave={e => {
                        if (!open) {
                            (e.currentTarget as HTMLButtonElement).style.background  = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)';
                        }
                    }}
                >
                    <ToggleIcon
                        size={26}
                        strokeWidth={1.6}
                        style={{
                            color:      open ? (isHumanMode ? '#f5c518' : 'var(--accent-primary)') : toggleColor,
                            transition: 'color 300ms ease',
                            filter:     isHumanMode && !open
                                ? 'drop-shadow(0 0 4px rgba(245,197,24,0.45))'
                                : 'none',
                        }}
                    />
                </button>
            </div>

            {/* ── Reason popover ── */}
            {open && (
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-label="Confirm mode switch"
                    style={{
                        position:     'fixed',
                        top:          popPos.top,
                        left:         popPos.left,
                        width:        260,
                        background:   'var(--bg-overlay)',
                        border:       '1px solid var(--border-strong)',
                        borderRadius: 10,
                        padding:      14,
                        zIndex:       1000,
                        boxShadow:    '0 8px 40px rgba(0,0,0,0.65)',
                        animation:    'slide-in-up 180ms ease both',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <ArrowLeftRight
                                size={13}
                                strokeWidth={2}
                                style={{ color: targetColor, flexShrink: 0 }}
                            />
                            <span
                                style={{
                                    fontFamily:    'var(--font-display)',
                                    fontSize:      '0.75rem',
                                    fontWeight:    700,
                                    color:         'var(--text-primary)',
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                Switch Mode
                            </span>
                        </div>
                        <button
                            onClick={() => { setOpen(false); setReason(''); }}
                            aria-label="Close"
                            style={{
                                width:          20,
                                height:         20,
                                display:        'flex',
                                alignItems:     'center',
                                justifyContent: 'center',
                                background:     'transparent',
                                border:         '1px solid var(--border-subtle)',
                                borderRadius:   4,
                                cursor:         'pointer',
                                color:          'var(--text-muted)',
                                fontSize:       '0.6rem',
                                outline:        'none',
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Current → Target indicator */}
                    <div
                        className="flex items-center gap-2 mb-3 rounded-lg px-3 py-2"
                        style={{
                            background: 'var(--bg-raised)',
                            border:     '1px solid var(--border-default)',
                        }}
                    >
                        <div
                            className="flex items-center gap-[5px] rounded px-2 py-[3px]"
                            style={{ background: `${color}12`, border: `1px solid ${color}35` }}
                        >
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}` }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                {isHumanMode ? 'HV' : 'AI'}
                            </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-disabled)' }}>→</span>
                        <div
                            className="flex items-center gap-[5px] rounded px-2 py-[3px]"
                            style={{ background: `${targetColor}12`, border: `1px dashed ${targetColor}45` }}
                        >
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: targetColor, opacity: 0.6 }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, color: targetColor, textTransform: 'uppercase', letterSpacing: '0.07em', opacity: 0.9 }}>
                                {isHumanMode ? 'AI' : 'HV'}
                            </span>
                        </div>
                    </div>

                    {/* Auto-transition toggle */}
                    <div
                        className="flex items-center gap-2 mb-3 cursor-pointer"
                        onClick={() => setAutoTransition(!autoTransitionEnabled)}
                        role="switch"
                        aria-checked={autoTransitionEnabled}
                        tabIndex={0}
                        onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setAutoTransition(!autoTransitionEnabled);
                            }
                        }}
                    >
                        <div style={{
                            width: 28, height: 14, borderRadius: 7, flexShrink: 0,
                            background: autoTransitionEnabled ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                            border: `1px solid ${autoTransitionEnabled ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                            position: 'relative', transition: 'background 200ms ease, border-color 200ms ease',
                        }}>
                            <div style={{
                                position: 'absolute', top: 2,
                                left: autoTransitionEnabled ? 'calc(100% - 12px)' : 2,
                                width: 8, height: 8, borderRadius: '50%', background: 'white',
                                transition: 'left 200ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                            }} />
                        </div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-secondary)', letterSpacing: '0.04em', lineHeight: 1 }}>
                                Auto-transition
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-disabled)', marginTop: 2 }}>
                                {autoTransitionEnabled ? 'System can switch modes' : 'Manual override only'}
                            </div>
                        </div>
                    </div>

                    {/* Reason label */}
                    <label style={{
                        display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.52rem',
                        letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5,
                    }}>
                        Reason <span style={{ color: 'var(--severity-high)' }}>*</span>
                    </label>

                    {/* Reason textarea */}
                    <textarea
                        autoFocus
                        placeholder="Describe why you're switching modes…"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        style={{
                            width: '100%', padding: '7px 9px', resize: 'none', outline: 'none',
                            background: 'var(--bg-base)', borderRadius: 6,
                            border: `1px solid ${reason.trim() ? 'var(--border-strong)' : 'var(--border-default)'}`,
                            fontFamily: 'var(--font-mono)', fontSize: '0.62rem', lineHeight: 1.5,
                            color: 'var(--text-primary)', boxSizing: 'border-box', marginBottom: 10,
                            transition: 'border-color 150ms ease',
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleConfirm(); }}
                    />

                    {/* Action buttons — shadcn Button */}
                    <div className="flex gap-1.5">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleConfirm}
                            disabled={!reason.trim()}
                            className="flex-1 h-7 text-[0.58rem] tracking-wide gap-1 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
                            style={{
                                fontFamily:  'var(--font-mono)',
                                background:  reason.trim() ? `${targetColor}20` : 'transparent',
                                borderColor: reason.trim() ? targetColor : 'var(--border-default)',
                                color:       reason.trim() ? targetColor : 'var(--text-disabled)',
                            }}
                        >
                            <ArrowLeftRight size={11} strokeWidth={2.5} />
                            Confirm Switch
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setOpen(false); setReason(''); }}
                            className="h-7 px-3 text-[0.58rem]"
                            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
                        >
                            Cancel
                        </Button>
                    </div>

                    <div style={{
                        marginTop: 7, fontFamily: 'var(--font-mono)', fontSize: '0.48rem',
                        color: 'var(--text-disabled)', letterSpacing: '0.04em',
                    }}>
                        ⌘↵ to confirm
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({
                         severity,
                         items,
                         isHumanMode,
                         onApproveAll,
                     }: {
    severity:    Severity;
    items:       Alert[];
    isHumanMode: boolean;
    onApproveAll?: (ids: string[]) => void;
}) {
    const c          = SEVERITY_COLORS[severity];
    const Icon       = SEVERITY_ICONS[severity];
    const isCritical = severity === 'critical';

    // Count handled (acknowledged / escalated / resolved)
    const handledCount = items.filter(
        a => a.status === 'acknowledged' || a.status === 'escalated' || a.status === 'resolved'
    ).length;
    const handledPct = items.length > 0 ? Math.round((handledCount / items.length) * 100) : 0;

    return (
        <div
            className="flex items-center gap-3 px-3 py-[9px] rounded-xl"
            style={{
                background: `${c}09`,
                border:     `1px solid ${c}22`,
                boxShadow:  isCritical ? `0 0 12px ${c}18` : 'none',
            }}
        >
            {/* Icon box */}
            <div
                className="flex items-center justify-center shrink-0 rounded-lg"
                style={{
                    width:      32,
                    height:     32,
                    background: `${c}15`,
                    border:     `1px solid ${c}35`,
                    boxShadow:  isCritical ? `0 0 8px ${c}30` : 'none',
                }}
            >
                <Icon
                    size={16}
                    strokeWidth={isCritical ? 2.5 : 2}
                    style={{
                        color:     c,
                        animation: isCritical ? 'pulse-dot 1.4s ease infinite' : 'none',
                        flexShrink: 0,
                    }}
                />
            </div>

            {/* Label + progress */}
            <div className="flex flex-col flex-1 min-w-0 gap-1">
                <div className="flex items-center gap-2">
                    <span
                        className="font-bold tracking-[0.08em] uppercase leading-none"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.65rem, 0.55rem + 0.3vw, 0.78rem)',
                            color:      c,
                        }}
                    >
                        {severity}
                    </span>
                    {/* Count badge */}
                    <span
                        className="flex items-center justify-center tabular-nums"
                        style={{
                            minWidth:     24,
                            height:       18,
                            padding:      '0 7px',
                            borderRadius: 999,
                            background:   `${c}15`,
                            border:       `1px solid ${c}35`,
                            fontFamily:   'var(--font-mono)',
                            fontSize:     'clamp(0.52rem, 0.44rem + 0.2vw, 0.62rem)',
                            fontWeight:   700,
                            color:        c,
                            letterSpacing:'0.04em',
                        }}
                    >
                        {items.length}
                    </span>
                </div>

                {/* Handled progress bar */}
                {handledCount > 0 && (
                    <div className="flex items-center gap-1.5">
                        <Progress
                            value={handledPct}
                            className="h-[3px] flex-1"
                            style={
                                {
                                    background: `${c}15`,
                                    '--progress-foreground': c,
                                } as React.CSSProperties
                            }
                        />
                        <span
                            className="text-[0.44rem] tabular-nums shrink-0"
                            style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                        >
                            {handledPct}% handled
                        </span>
                    </div>
                )}
            </div>

            {/* Approve all — shadcn Button */}
            {isHumanMode && onApproveAll && items.length > 1 && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onApproveAll(items.map(a => a.id))}
                    className="h-7 shrink-0 gap-1 text-[0.54rem] tracking-[0.04em] font-semibold transition-all duration-150"
                    style={{
                        fontFamily:   'var(--font-mono)',
                        background:   'rgba(34,197,94,0.08)',
                        borderColor:  'rgba(34,197,94,0.28)',
                        color:        'var(--status-online)',
                        whiteSpace:   'nowrap',
                    }}
                >
                    <CheckCircle2 size={11} strokeWidth={2.5} />
                    Approve all
                </Button>
            )}
        </div>
    );
}

// ─── Type filter chip ─────────────────────────────────────────────────────────

function TypeChip({
                      type, active, count, onClick,
                  }: {
    type:    AlertType;
    active:  boolean;
    count:   number;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 rounded-md transition-all duration-150"
            style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      '0.54rem',
                letterSpacing: '0.04em',
                padding:       '4px 9px',
                background:    active ? 'rgba(59,158,255,0.12)' : 'transparent',
                border:        `1px solid ${active ? 'rgba(59,158,255,0.35)' : 'var(--border-default)'}`,
                color:         active ? 'var(--accent-primary)' : 'var(--text-muted)',
                transform:     active ? 'translateY(-0.5px)' : 'none',
                boxShadow:     active ? '0 0 5px rgba(59,158,255,0.15)' : 'none',
            }}
        >
            {ALERT_TYPE_LABELS[type]}
            <span
                className="tabular-nums text-[0.48rem] font-bold"
                style={{
                    padding:      '1px 4px',
                    borderRadius: 999,
                    background:   active ? 'rgba(59,158,255,0.15)' : 'var(--bg-elevated)',
                    color:        active ? 'var(--accent-primary)' : 'var(--text-disabled)',
                }}
            >
                {count}
            </span>
        </button>
    );
}

// ─── AI digest ────────────────────────────────────────────────────────────────

function AlertDigest({ alerts }: { alerts: Alert[] }) {
    const [expanded, setExpanded] = useState(false);

    const avgConfidence = alerts.length > 0
        ? Math.round(alerts.reduce((sum, a) => sum + a.confidence, 0) / alerts.length)
        : 0;

    return (
        <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(59,158,255,0.03)', border: '1px solid rgba(59,158,255,0.1)' }}
        >
            <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-2 w-full text-left px-4 py-3"
            >
                <Bot size={13} strokeWidth={2} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <div className="flex flex-col flex-1 min-w-0 gap-[3px]">
                    <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   'clamp(0.56rem, 0.48rem + 0.2vw, 0.65rem)',
                        color:      'var(--accent-primary)',
                        lineHeight: 1,
                    }}>
                        AI Digest — {alerts.length} low-priority alert{alerts.length !== 1 ? 's' : ''}
                    </span>
                    {!expanded && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-disabled)', lineHeight: 1 }}>
                            Avg confidence: {avgConfidence}% · No action required
                        </span>
                    )}
                </div>

                {/* Confidence mini-bar */}
                <div
                    className="flex items-center gap-1 shrink-0 mr-1"
                    title={`Average AI confidence: ${avgConfidence}%`}
                >
                    <div
                        className="h-1 rounded-full"
                        style={{
                            width:      40,
                            background: 'var(--bg-elevated)',
                            overflow:   'hidden',
                        }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width:      `${avgConfidence}%`,
                                background: avgConfidence >= 80
                                    ? 'var(--status-online)'
                                    : avgConfidence >= 60
                                        ? 'var(--severity-medium)'
                                        : 'var(--severity-high)',
                            }}
                        />
                    </div>
                    <span
                        className="text-[0.44rem] tabular-nums"
                        style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                    >
                        {avgConfidence}%
                    </span>
                </div>

                {expanded
                    ? <ChevronUp   size={12} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                    : <ChevronDown size={12} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                }
            </button>

            {expanded && (
                <div className="px-4 pb-3 flex flex-col gap-[5px]">
                    {alerts.map(alert => (
                        <div
                            key={alert.id}
                            className="flex items-center gap-2 pl-3 py-[4px] rounded-sm"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   '0.58rem',
                                color:      'var(--text-muted)',
                                borderLeft: '2px solid rgba(59,158,255,0.18)',
                                background: 'rgba(59,158,255,0.02)',
                            }}
                        >
                            <span className="flex-1 truncate">{alert.title}</span>
                            <span
                                className="shrink-0 text-[0.48rem]"
                                style={{ color: 'var(--text-disabled)' }}
                            >
                                {alert.location.label}
                            </span>
                            <span
                                className="shrink-0 tabular-nums text-[0.48rem]"
                                style={{
                                    color: alert.confidence >= 80
                                        ? 'var(--status-online)'
                                        : 'var(--severity-medium)',
                                }}
                            >
                                {alert.confidence}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
    return (
        <div
            className="flex flex-col items-center justify-center gap-3 py-12 text-center"
            style={{ color: 'var(--text-disabled)' }}
        >
            <div
                className="w-12 h-12 rounded-full flex items-center justify-center relative"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
            >
                {hasFilters
                    ? <Filter size={18} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                    : <CheckCircle size={18} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                }
                {!hasFilters && (
                    <span
                        className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full"
                        style={{ background: 'var(--status-online)' }}
                    >
                        <span className="text-[0.4rem] text-white font-bold">✓</span>
                    </span>
                )}
            </div>
            <div className="flex flex-col gap-1">
                <span
                    style={{
                        fontFamily:    'var(--font-mono)',
                        fontSize:      'clamp(0.58rem, 0.5rem + 0.2vw, 0.68rem)',
                        letterSpacing: '0.06em',
                        color:         'var(--text-muted)',
                    }}
                >
                    {hasFilters ? 'No alerts match filters' : 'All clear'}
                </span>
                <span
                    style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize:   '0.52rem',
                        color:      'var(--text-disabled)',
                    }}
                >
                    {hasFilters
                        ? 'Try adjusting severity or type filters'
                        : 'No active incidents at this time'
                    }
                </span>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertPanel({
                               focusedAlertId,
                               onAlertSelect,
                               onApprove,
                               onIgnore,
                               onDispatch,
                               onEscalate,
                               onApproveAll,
                           }: AlertPanelProps) {
    const { currentMode } = useMode();
    const isHumanMode     = currentMode === 'Human-Validated';
    const {
        alerts, pendingActions,
        acknowledgeAlert, ignoreAlert, escalateAlert, dispatchAlert,
        claimAlert, releaseAlert, isClaiming, isReleasing,
    } = useAlerts();

    const [filterSev,      setFilterSev]      = useState<FilterSeverity>('all');
    const [filterType,     setFilterType]     = useState<FilterType>('all');
    const [showFilter,     setShowFilter]     = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Set<Severity>>(new Set());

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

    const { clusters, standalone } = useMemo(() => clusterAlerts(filtered), [filtered]);

    const digestAlerts = useMemo(
        () => !isHumanMode ? filtered.filter(a => a.severity === 'low' || a.severity === 'info') : [],
        [filtered, isHumanMode]
    );

    // Type counts for filter chips
    const typeCounts = useMemo(() => {
        const counts: Partial<Record<AlertType, number>> = {};
        alerts.forEach(a => { counts[a.type] = (counts[a.type] ?? 0) + 1; });
        return counts;
    }, [alerts]);
    const activeTypes = useMemo(() => Array.from(new Set(alerts.map(a => a.type))), [alerts]);

    const hasFilters   = filterSev !== 'all' || filterType !== 'all';
    const lowConfCount = filtered.filter(a => a.confidence < 70).length;

    const severityCounts = useMemo(() => {
        const counts: Partial<Record<Severity, number>> = {};
        alerts.forEach(a => { counts[a.severity] = (counts[a.severity] ?? 0) + 1; });
        return counts;
    }, [alerts]);

    const toggleGroup = (sev: Severity) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(sev) ? next.delete(sev) : next.add(sev);
            return next;
        });
    };

    return (
        <TooltipProvider delayDuration={300}>
            <div
                className="h-full flex flex-col overflow-hidden"
                style={{
                    background: 'var(--bg-raised)',
                    borderLeft: `1px solid ${isHumanMode ? 'rgba(245,197,24,0.2)' : 'var(--border-default)'}`,
                    transition: 'border-color 400ms ease',
                }}
            >
                {/* ══ ROW 1 — Title + count + badges + live + filter toggle ══ */}
                <div
                    className="shrink-0 flex items-center gap-2 px-4 pt-4 pb-3 flex-wrap"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                <span
                    className="text-[0.78rem] font-bold tracking-[0.06em] uppercase"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                    Alerts
                </span>

                    {/* Total count badge */}
                    <div
                        className="flex items-center justify-center tabular-nums"
                        style={{
                            height:       18,
                            minWidth:     24,
                            padding:      '0 7px',
                            borderRadius: 999,
                            background:   'var(--bg-elevated)',
                            border:       '1px solid var(--border-default)',
                            fontFamily:   'var(--font-mono)',
                            fontSize:     '0.5rem',
                            fontWeight:   700,
                            color:        'var(--text-muted)',
                        }}
                    >
                        {alerts.length}
                    </div>

                    {/* Low confidence warning badge */}
                    {isHumanMode && lowConfCount > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className="flex items-center gap-1 cursor-default"
                                    style={{
                                        height:       18,
                                        padding:      '0 7px',
                                        borderRadius: 999,
                                        background:   'rgba(255,136,0,0.08)',
                                        border:       '1px solid rgba(255,136,0,0.3)',
                                        fontFamily:   'var(--font-mono)',
                                        fontSize:     '0.48rem',
                                        color:        'var(--severity-high)',
                                    }}
                                >
                                    <AlertTriangle size={9} strokeWidth={2.5} />
                                    {lowConfCount} low conf
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {lowConfCount} alert{lowConfCount !== 1 ? 's' : ''} with confidence below 70% — review required
                            </TooltipContent>
                        </Tooltip>
                    )}

                    <div className="flex-1 min-w-[8px]" />

                    {/* Live indicator */}
                    <LiveIndicator />

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilter(v => !v)}
                        aria-label="Toggle filters"
                        aria-pressed={showFilter}
                        className="shrink-0 flex items-center justify-center rounded-lg transition-all duration-150"
                        style={{
                            width:      30,
                            height:     30,
                            background: showFilter
                                ? 'rgba(255,255,255,0.08)'
                                : hasFilters ? 'rgba(59,158,255,0.10)' : 'transparent',
                            border: `1px solid ${
                                showFilter
                                    ? 'var(--border-strong)'
                                    : hasFilters ? 'rgba(59,158,255,0.4)' : 'var(--border-default)'
                            }`,
                            color:     hasFilters ? 'var(--accent-primary)' : showFilter ? 'var(--text-primary)' : 'var(--text-muted)',
                            boxShadow: hasFilters ? '0 0 6px rgba(59,158,255,0.15)' : 'none',
                        }}
                    >
                        {hasFilters
                            ? <X size={14} strokeWidth={2.5} />
                            : <SlidersHorizontal size={14} strokeWidth={2} />
                        }
                    </button>
                </div>

                {/* ══ ROW 2 — Severity pills ══ */}
                <div
                    className="shrink-0 flex items-center gap-[6px] px-4 py-[10px] flex-wrap"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                    {SEVERITY_ORDER.map(sev => {
                        const count = severityCounts[sev] ?? 0;
                        if (count === 0) return null;
                        const active = filterSev === sev;
                        return (
                            <SeverityPill
                                key={sev}
                                severity={sev}
                                count={count}
                                active={active}
                                onClick={() => setFilterSev(active ? 'all' : sev)}
                            />
                        );
                    })}
                    {hasFilters && (
                        <button
                            onClick={() => { setFilterSev('all'); setFilterType('all'); }}
                            className="flex items-center gap-[4px] rounded-lg transition-all duration-150 ml-auto"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   '0.52rem',
                                padding:    '5px 7px',
                                color:      'var(--text-muted)',
                                background: 'rgba(255,255,255,0.04)',
                                border:     '1px solid var(--border-default)',
                            }}
                        >
                            <X size={9} />
                            clear
                        </button>
                    )}
                </div>

                {/* ══ ROW 3 — Type filter chips (with counts) ══ */}
                {showFilter && (
                    <div
                        className="shrink-0 flex items-center gap-[5px] px-4 py-[9px] flex-wrap"
                        style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background:   'rgba(255,255,255,0.015)',
                            animation:    'slide-in-up 150ms ease',
                        }}
                    >
                        {activeTypes.map(type => (
                            <TypeChip
                                key={type}
                                type={type}
                                active={filterType === type}
                                count={typeCounts[type] ?? 0}
                                onClick={() => setFilterType(filterType === type ? 'all' : type)}
                            />
                        ))}
                    </div>
                )}

                {/* ══ ROW 4 — Mode strip ══ */}
                <ModeStrip isHumanMode={isHumanMode} />

                {/* ══ Tabs: Grouped / Clustered ══ */}
                <Tabs defaultValue="grouped" className="flex flex-col flex-1 overflow-hidden min-h-0">
                    <div
                        className="shrink-0 px-4 py-[10px]"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                        <TabsList
                            className="w-full h-[32px] rounded-xl p-[3px] gap-[3px]"
                            style={{
                                background: 'var(--bg-elevated)',
                                border:     '1px solid var(--border-default)',
                            }}
                        >
                            <TabsTrigger
                                value="grouped"
                                className="flex-1 h-[26px] flex items-center justify-center gap-[5px] tracking-[0.06em] uppercase rounded-[9px] data-[state=active]:bg-[var(--bg-overlay)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-none text-[var(--text-muted)] transition-all duration-150"
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.52rem, 0.44rem + 0.2vw, 0.62rem)' }}
                            >
                                <List size={12} strokeWidth={2} />
                                Grouped
                            </TabsTrigger>
                            <TabsTrigger
                                value="clustered"
                                className="flex-1 h-[26px] flex items-center justify-center gap-[5px] tracking-[0.06em] uppercase rounded-[9px] data-[state=active]:bg-[var(--bg-overlay)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-none text-[var(--text-muted)] transition-all duration-150"
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.52rem, 0.44rem + 0.2vw, 0.62rem)' }}
                            >
                                <Layers size={12} strokeWidth={2} />
                                Clustered
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* ── GROUPED ── */}
                    <TabsContent value="grouped" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
                        <ScrollArea className="h-full">
                            <div className="px-4 py-4 flex flex-col gap-5">
                                {filtered.length === 0 && <EmptyState hasFilters={hasFilters} />}

                                {SEVERITY_ORDER.map(severity => {
                                    const items = grouped[severity];
                                    if (!items?.length) return null;

                                    const c          = SEVERITY_COLORS[severity];
                                    const isExpanded = expandedGroups.has(severity);
                                    const visible    = isExpanded ? items : items.slice(0, MAX_VISIBLE_PER_GROUP);
                                    const overflow   = items.length - MAX_VISIBLE_PER_GROUP;

                                    return (
                                        <div key={severity} className="flex flex-col gap-[10px]">
                                            {/* Enhanced group header */}
                                            <GroupHeader
                                                severity={severity}
                                                items={items}
                                                isHumanMode={isHumanMode}
                                                onApproveAll={onApproveAll}
                                            />

                                            {/* Alert cards */}
                                            <div className="flex flex-col gap-[8px]">
                                                {visible.map(alert => (
                                                    <AlertCard
                                                        key={alert.id}
                                                        alert={alert}
                                                        focused={alert.id === focusedAlertId}
                                                        pendingAction={pendingActions?.[alert.id]}
                                                        isHumanMode={isHumanMode}
                                                        onSelect={onAlertSelect}
                                                        onApprove={onApprove}
                                                        onIgnore={onIgnore}
                                                        onDispatch={onDispatch}
                                                        onEscalate={onEscalate}
                                                        onClaim={claimAlert}
                                                        onRelease={releaseAlert}
                                                        isClaiming={isClaiming(alert.id)}
                                                        isReleasing={isReleasing(alert.id)}
                                                    />
                                                ))}
                                            </div>

                                            {/* Show more / less */}
                                            {overflow > 0 && (
                                                <button
                                                    onClick={() => toggleGroup(severity)}
                                                    className={cn(
                                                        'flex items-center justify-center gap-2 w-full rounded-xl',
                                                        'transition-all duration-150',
                                                    )}
                                                    style={{
                                                        height:        32,
                                                        background:    isExpanded ? `${c}08` : 'transparent',
                                                        border:        `1px dashed ${c}35`,
                                                        fontFamily:    'var(--font-mono)',
                                                        fontSize:      'clamp(0.56rem, 0.48rem + 0.2vw, 0.65rem)',
                                                        fontWeight:    600,
                                                        color:         c,
                                                        letterSpacing: '0.06em',
                                                        cursor:        'pointer',
                                                        opacity:       0.85,
                                                    }}
                                                    onMouseEnter={e => {
                                                        const el = e.currentTarget as HTMLButtonElement;
                                                        el.style.background  = `${c}12`;
                                                        el.style.borderColor = `${c}55`;
                                                        el.style.opacity     = '1';
                                                    }}
                                                    onMouseLeave={e => {
                                                        const el = e.currentTarget as HTMLButtonElement;
                                                        el.style.background  = isExpanded ? `${c}08` : 'transparent';
                                                        el.style.borderColor = `${c}35`;
                                                        el.style.opacity     = '0.85';
                                                    }}
                                                >
                                                    {isExpanded
                                                        ? <><ChevronUp   size={13} strokeWidth={2.5} /> Show less</>
                                                        : <><ChevronDown size={13} strokeWidth={2.5} /> {overflow} more {severity}</>
                                                    }
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {!isHumanMode && digestAlerts.length > 0 && (
                                    <AlertDigest alerts={digestAlerts} />
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    {/* ── CLUSTERED ── */}
                    <TabsContent value="clustered" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
                        <ScrollArea className="h-full">
                            <div className="px-4 py-4 flex flex-col gap-3">
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
                                        pendingAction={pendingActions?.[alert.id]}
                                        isHumanMode={isHumanMode}
                                        onSelect={onAlertSelect}
                                        onApprove={onApprove}
                                        onIgnore={onIgnore}
                                        onDispatch={onDispatch}
                                        onEscalate={onEscalate}
                                        onClaim={claimAlert}
                                        onRelease={releaseAlert}
                                        isClaiming={isClaiming(alert.id)}
                                        isReleasing={isReleasing(alert.id)}
                                    />
                                ))}
                                {clusters.length === 0 && standalone.length === 0 && (
                                    <EmptyState hasFilters={hasFilters} />
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </TooltipProvider>
    );
}