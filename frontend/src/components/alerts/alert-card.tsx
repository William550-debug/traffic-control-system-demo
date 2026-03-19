'use client';

import { useState, useEffect, useRef } from 'react';
import type { Alert, AlertPendingAction } from '@/types';
import {
    SEVERITY_COLORS,
    SEVERITY_BG,
    SEVERITY_BORDER,
    ALERT_TYPE_LABELS,
    formatRelativeTime,
} from '@/lib/utils';
import { useAuth }             from '@/providers/auth-provider';
import { ConfidenceIndicator } from './confidence-indicator';
import { Badge }               from '@/components/ui/badge';
import { Button }              from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn }       from '@/lib/utils';
import { AgeClock } from '@/components/alerts/claim-banner';
import { ClaimBanner, ClaimButton } from '@/components/alerts/claim-banner';
import {
    CheckCircle2,
    ChevronUp,
    ShieldAlert,
    Siren,
    Truck,
    HeartPulse,
    Car,
    MapPin,
    Clock,
    ChevronDown,
    AlertTriangle,
    XCircle,
    Loader2,
    Timer,
    Activity,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertCardProps {
    alert:          Alert;
    focused:        boolean;
    pendingAction?: AlertPendingAction;
    isHumanMode?:   boolean;
    onSelect:       (alert: Alert) => void;
    onApprove:      (id: string) => void;
    onIgnore:       (id: string, reason?: string) => void;
    onDispatch?:    (id: string, service?: DispatchService) => void;
    onEscalate?:    (id: string) => void;
    onClaim?:       (id: string) => void;
    onRelease?:     (id: string) => void;
    isClaiming?:    boolean;
    isReleasing?:   boolean;
}

type DispatchService = 'police' | 'ambulance' | 'red_cross' | 'ntsa';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_GLOW: Record<string, string> = {
    critical: '0 0 0 1px rgba(255,59,59,0.5),  inset 0 0 24px rgba(255,59,59,0.04)',
    high:     '0 0 0 1px rgba(255,136,0,0.4),  inset 0 0 20px rgba(255,136,0,0.03)',
    medium:   '0 0 0 1px rgba(245,197,24,0.3)',
    low:      'none',
    info:     'none',
};

const SEVERITY_PULSE: Record<string, string> = {
    critical: 'animate-pulse',
    high:     '',
    medium:   '',
    low:      '',
    info:     '',
};

const DISPATCH_OPTIONS: Array<{
    key:          DispatchService;
    label:        string;
    icon:         React.ReactNode;
    eta:          string;
    color:        string;
    description:  string;
}> = [
    {
        key:         'police',
        label:       'Police',
        icon:        <ShieldAlert className="w-3.5 h-3.5" />,
        eta:         '4–7 min',
        color:       '#3b9eff',
        description: 'Kenya Police Service',
    },
    {
        key:         'ambulance',
        label:       'Ambulance',
        icon:        <HeartPulse className="w-3.5 h-3.5" />,
        eta:         '6–10 min',
        color:       '#ff5c5c',
        description: 'Emergency Medical Services',
    },
    {
        key:         'red_cross',
        label:       'Red Cross',
        icon:        <Truck className="w-3.5 h-3.5" />,
        eta:         '8–12 min',
        color:       '#e63333',
        description: 'Kenya Red Cross Society',
    },
    {
        key:         'ntsa',
        label:       'NTSA',
        icon:        <Car className="w-3.5 h-3.5" />,
        eta:         '5–9 min',
        color:       '#f5c518',
        description: 'Road Safety Authority',
    },
];

const SEVERITY_BADGE_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    critical: { bg: 'rgba(255,59,59,0.12)',  border: 'rgba(255,59,59,0.35)',  text: '#ff3b3b', dot: '#ff3b3b' },
    high:     { bg: 'rgba(255,136,0,0.10)',  border: 'rgba(255,136,0,0.30)',  text: '#ff8800', dot: '#ff8800' },
    medium:   { bg: 'rgba(245,197,24,0.10)', border: 'rgba(245,197,24,0.30)', text: '#f5c518', dot: '#f5c518' },
    low:      { bg: 'rgba(80,200,120,0.10)', border: 'rgba(80,200,120,0.25)', text: '#50c878', dot: '#50c878' },
    info:     { bg: 'rgba(100,160,255,0.10)',border: 'rgba(100,160,255,0.25)',text: '#64a0ff', dot: '#64a0ff' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function AlertCard({
                              alert,
                              focused,
                              pendingAction,
                              isHumanMode = false,
                              onSelect,
                              onApprove,
                              onIgnore,
                              onDispatch,
                              onEscalate,
                              onClaim,
                              onRelease,
                              isClaiming,
                              isReleasing,
                          }: AlertCardProps) {
    const { hasPermission } = useAuth();

    // ── State ──
    const [mounted, setMounted]                     = useState(false);
    const [showDismissReason, setShowDismissReason] = useState(false);
    const [dismissReason, setDismissReason]         = useState('');
    const [timeLeft, setTimeLeft]                   = useState<string | null>(null);
    const [timerUrgent, setTimerUrgent]             = useState(false);

    // Dispatch ETA display
    const [dispatchedService, setDispatchedService] = useState<DispatchService | null>(null);
    const [etaCountdown, setEtaCountdown]           = useState<number | null>(null);

    // Resolved fade-out
    const [isResolved, setIsResolved]       = useState(alert.status === 'resolved');
    const [fadeOut, setFadeOut]             = useState(false);
    const [resolvedAt, setResolvedAt]       = useState<Date | null>(null);
    const prevStatus                         = useRef(alert.status);

    // ── Derived ──
    const color          = SEVERITY_COLORS[alert.severity];
    const badgeStyle     = SEVERITY_BADGE_STYLE[alert.severity] ?? SEVERITY_BADGE_STYLE.info;
    const isAcknowledged = alert.status === 'acknowledged';
    const isEscalated    = alert.status === 'escalated';
    const isPending      = !!pendingAction;
    const isCritical     = alert.severity === 'critical';
    const isLowConf      = alert.confidence < 70;

    // ── Client-only mount gate ──
    // hasPermission() reads auth from client-side storage (always null on the
    // server). Gating permission checks behind `mounted` ensures the server
    // and the initial client render produce the same DOM tree, preventing
    // hydration mismatches caused by the Approve button appearing only on
    // the client (which shifts every subsequent sibling to a different tree
    // position, e.g. Escalate's ChevronUp vs Approve's CheckCircle2).
    useEffect(() => { setMounted(true); }, []);

    // ── Alert timer countdown ──
    useEffect(() => {
        if (!alert.timer) return;
        const update = () => {
            const diff = new Date(alert.timer!.expiresAt).getTime() - Date.now();
            if (diff <= 0) { setTimeLeft('EXPIRED'); setTimerUrgent(true); return; }
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
            setTimerUrgent(alert.timer!.urgency === 'critical' && diff < 60000);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [alert.timer]);

    // ── Resolved → fade out animation ──
    useEffect(() => {
        if (prevStatus.current !== 'resolved' && alert.status === 'resolved') {
            setResolvedAt(new Date());
            setFadeOut(true);
            const id = setTimeout(() => setIsResolved(true), 1800);
            return () => clearTimeout(id);
        }
        prevStatus.current = alert.status;
    }, [alert.status]);

    // ── Dispatch ETA countdown ──
    useEffect(() => {
        if (etaCountdown === null || etaCountdown <= 0) return;
        const id = setInterval(() => setEtaCountdown(prev => (prev ?? 1) - 1), 1000);
        return () => clearInterval(id);
    }, [etaCountdown]);

    // ── Handlers ──
    const handleIgnoreClick = () => {
        if (isHumanMode) setShowDismissReason(true);
        else onIgnore(alert.id);
    };

    const handleDismissConfirm = () => {
        if (!dismissReason.trim()) return;
        onIgnore(alert.id, dismissReason.trim());
        setShowDismissReason(false);
        setDismissReason('');
    };

    const handleDispatch = (service: DispatchService) => {
        const opt = DISPATCH_OPTIONS.find(o => o.key === service);
        if (opt) {
            // Parse the upper bound of ETA range for countdown
            const upper = parseInt(opt.eta.split('–')[1]);
            setDispatchedService(service);
            setEtaCountdown(upper * 60);
        }
        onDispatch?.(alert.id, service);
    };

    // ── Resolved state: show a slim resolved chip and skip the rest ──
    if (isResolved && alert.status === 'resolved') {
        return (
            <div
                className={cn(
                    'relative rounded-md overflow-hidden transition-all duration-700 ease-out',
                    'border flex items-center gap-2 px-3 py-2',
                    fadeOut && 'opacity-0 scale-[0.98]',
                )}
                style={{
                    background:  'rgba(80,200,120,0.05)',
                    borderColor: 'rgba(80,200,120,0.2)',
                    borderLeft:  '3px solid #50c878',
                }}
            >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span
                    className="text-xs font-medium text-emerald-400 flex-1 truncate"
                    style={{ fontFamily: 'var(--font-mono)' }}
                >
                    {alert.title}
                </span>
                {resolvedAt && (
                    <span
                        className="text-[0.5rem] shrink-0"
                        style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                    >
                        Resolved {formatRelativeTime(resolvedAt)}
                    </span>
                )}
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div
                onClick={() => !isPending && !showDismissReason && onSelect(alert)}
                className={cn(
                    'relative rounded-md overflow-hidden select-none group',
                    'border-l-[3px] transition-all duration-300',
                    isPending && 'cursor-wait',
                    fadeOut && 'opacity-0 scale-[0.98] pointer-events-none',
                    !isPending && !showDismissReason && 'cursor-pointer',
                    (isAcknowledged || isEscalated) && !isPending && 'opacity-60',
                )}
                style={{
                    background: focused ? 'rgba(59,158,255,0.06)' : SEVERITY_BG[alert.severity],
                    border:     `1px solid ${focused ? 'rgba(59,158,255,0.4)' : SEVERITY_BORDER[alert.severity]}`,
                    borderLeft: `3px solid ${color}`,
                    boxShadow:  focused ? '0 0 0 1px rgba(59,158,255,0.3)' : SEVERITY_GLOW[alert.severity],
                    padding:    '10px 12px',
                    opacity:    isPending ? 0.75 : 1,
                }}
            >
                {/* ── Pending shimmer overlay ── */}
                {isPending && (
                    <div
                        className="absolute inset-0 pointer-events-none rounded-md z-10"
                        style={{
                            background:     'linear-gradient(90deg, transparent 0%, rgba(59,158,255,0.07) 50%, transparent 100%)',
                            backgroundSize: '200% 100%',
                            animation:      'shimmer 1.2s linear infinite',
                        }}
                    />
                )}

                {/* ── Human-mode badge ── */}
                {isHumanMode && (
                    <div className="absolute top-0 right-0">
                        <Badge
                            variant="outline"
                            className="rounded-none rounded-bl-[5px] rounded-tr-[5px] border-0 text-[0.45rem] tracking-widest px-2 py-0.5"
                            style={{
                                background: 'rgba(245,197,24,0.1)',
                                color:      '#f5c518',
                                fontFamily: 'var(--font-mono)',
                            }}
                        >
                            CONFIRM REQUIRED
                        </Badge>
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    ROW 1 — Type · Agency · Severity · Timer · Age
                ══════════════════════════════════════════════ */}
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-2">

                    {/* Alert type label */}
                    <span
                        className="text-[0.5rem] tracking-[0.12em] uppercase shrink-0 font-bold"
                        style={{ color, fontFamily: 'var(--font-mono)' }}
                    >
                        {ALERT_TYPE_LABELS[alert.type]}
                    </span>

                    {/* Agency */}
                    {alert.agency && (
                        <span
                            className="text-[0.46rem] tracking-[0.06em] shrink-0"
                            style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                        >
                            · {alert.agency}
                        </span>
                    )}

                    {/* Severity badge with live dot */}
                    <div
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full shrink-0"
                        style={{
                            background:  badgeStyle.bg,
                            border:      `1px solid ${badgeStyle.border}`,
                        }}
                    >
                        <span
                            className={cn(
                                'w-1.5 h-1.5 rounded-full shrink-0',
                                isCritical ? 'animate-pulse' : '',
                            )}
                            style={{ background: badgeStyle.dot }}
                        />
                        <span
                            className="text-[0.44rem] tracking-[0.08em] uppercase font-bold"
                            style={{ color: badgeStyle.text, fontFamily: 'var(--font-mono)' }}
                        >
                            {alert.severity}
                        </span>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1 min-w-[4px]" />

                    {/* Age clock */}
                    <AgeClock alert={alert} />

                    {/* Timer badge */}
                    {timeLeft && (
                        <div
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm shrink-0"
                            style={{
                                background:  timerUrgent ? 'rgba(255,59,59,0.1)' : 'rgba(245,197,24,0.08)',
                                border:      `1px solid ${timerUrgent ? 'rgba(255,59,59,0.35)' : 'rgba(245,197,24,0.25)'}`,
                                color:       timerUrgent ? 'var(--severity-critical)' : 'var(--severity-medium)',
                                animation:   timerUrgent ? 'pulse-dot 1s ease infinite' : 'none',
                                fontFamily:  'var(--font-mono)',
                            }}
                        >
                            <Timer className="w-2.5 h-2.5 shrink-0" />
                            <span className="text-[0.46rem] tracking-[0.06em]">{timeLeft}</span>
                        </div>
                    )}

                    {/* Relative time */}
                    <span
                        className="text-[0.48rem] tracking-[0.04em] shrink-0"
                        style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                    >
                        {formatRelativeTime(alert.detectedAt)}
                    </span>
                </div>

                {/* ══════════════════════════════════════════════
                    ROW 2 — Title
                ══════════════════════════════════════════════ */}
                <div
                    className="text-[0.78rem] sm:text-[0.82rem] font-semibold leading-snug mb-1 line-clamp-2"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                    {alert.title}
                </div>

                {/* ══════════════════════════════════════════════
                    ROW 3 — Location
                ══════════════════════════════════════════════ */}
                <div
                    className="flex items-center gap-1 mb-2 truncate"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                    <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: 'var(--text-disabled)' }} />
                    <span className="text-[0.56rem] truncate">{alert.location.label}</span>
                </div>

                {/* ══════════════════════════════════════════════
                    ROW 4 — Impact metric chip
                ══════════════════════════════════════════════ */}
                {alert.impact && (
                    <div
                        className="flex items-center gap-2 px-2 py-1 mb-2 rounded-sm"
                        style={{
                            background: `${color}08`,
                            border:     `1px solid ${color}20`,
                        }}
                    >
                        <Activity className="w-2.5 h-2.5 shrink-0" style={{ color }} />
                        <span
                            className="text-[0.53rem]"
                            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                            {alert.impact.metric}
                        </span>
                        <span
                            className="text-[0.64rem] font-bold tabular-nums ml-auto"
                            style={{ color, fontFamily: 'var(--font-mono)' }}
                        >
                            {alert.impact.value}{alert.impact.unit}
                        </span>
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    ROW 5 — Confidence indicator
                ══════════════════════════════════════════════ */}
                <div className="mb-2">
                    <ConfidenceIndicator
                        confidence={alert.confidence}
                        metadata={alert.confidenceMetadata}
                        compact
                        requiresWarning={isHumanMode && isLowConf}
                    />
                </div>

                {/* ══════════════════════════════════════════════
                    ROW 6 — Escalated / claimed status
                ══════════════════════════════════════════════ */}
                {(isEscalated || alert.claimedBy) && (
                    <div
                        className="flex items-center gap-1 text-[0.5rem] mb-1.5"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                    >
                        {isEscalated && (
                            <>
                                <ChevronUp className="w-2.5 h-2.5" />
                                <span>Escalated</span>
                                {alert.claimedBy && <span className="opacity-40">·</span>}
                            </>
                        )}
                        {alert.claimedBy && (
                            <>
                                <span>🔒</span>
                                <span>Handled by {alert.claimedBy}</span>
                            </>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    ROW 7 — Dispatched ETA banner
                ══════════════════════════════════════════════ */}
                {dispatchedService && (
                    <DispatchEtaBanner
                        service={dispatchedService}
                        countdown={etaCountdown}
                    />
                )}

                {/* ══════════════════════════════════════════════
                    ROW 8 — Dismiss reason form
                ══════════════════════════════════════════════ */}
                {showDismissReason && (
                    <div
                        onClick={e => e.stopPropagation()}
                        className="mb-2 rounded-md p-2"
                        style={{
                            background: 'var(--bg-elevated)',
                            border:     '1px solid var(--border-default)',
                        }}
                    >
                        <p
                            className="text-[0.53rem] mb-1.5 flex items-center gap-1"
                            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            Dismiss reason — required for audit
                        </p>
                        <textarea
                            autoFocus
                            value={dismissReason}
                            onChange={e => setDismissReason(e.target.value)}
                            placeholder="Reason for dismissing this alert…"
                            rows={2}
                            style={{
                                width:        '100%',
                                padding:      '5px 8px',
                                resize:       'none',
                                background:   'var(--bg-base)',
                                border:       '1px solid var(--border-default)',
                                borderRadius: 4,
                                fontFamily:   'var(--font-mono)',
                                fontSize:     '0.58rem',
                                color:        'var(--text-primary)',
                                outline:      'none',
                                boxSizing:    'border-box' as const,
                            }}
                        />
                        <div className="flex gap-1.5 mt-1.5">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDismissConfirm}
                                disabled={!dismissReason.trim()}
                                className="flex-1 h-6 text-[0.55rem] tracking-[0.04em] border-[rgba(255,59,59,0.35)] text-(--severity-critical) bg-[rgba(255,59,59,0.06)] hover:bg-[rgba(255,59,59,0.12)] disabled:opacity-30 disabled:cursor-not-allowed gap-1"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                <XCircle className="w-3 h-3" />
                                Confirm Dismiss
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setShowDismissReason(false); setDismissReason(''); }}
                                className="h-6 px-2.5 text-[0.55rem] text-(--text-muted) hover:text-(--text-primary) hover:bg-(--bg-overlay)"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    ROW 9 — Claim banner
                ══════════════════════════════════════════════ */}
                {alert.claimedBy && (
                    <div className="mb-1.5">
                        <ClaimBanner
                            alert={alert}
                            onRelease={id => onRelease?.(id)}
                            onClaim={id => onClaim?.(id)}
                            isReleasing={isReleasing ?? false}
                            isClaiming={isClaiming ?? false}
                            variant="card"
                        />
                    </div>
                )}

                {/* ══════════════════════════════════════════════
                    ROW 10 — Quick action bar
                ══════════════════════════════════════════════ */}
                {!showDismissReason && (
                    <div
                        onClick={e => e.stopPropagation()}
                        className="flex flex-wrap gap-1 mt-0.5"
                    >
                        {/* Approve / Confirm */}
                        {mounted && hasPermission('approve_signal') && (
                            <IconActionBtn
                                label={isCritical && isHumanMode ? 'Confirm' : 'Approve'}
                                icon={<CheckCircle2 className="w-3 h-3" />}
                                color="var(--status-online)"
                                pending={pendingAction === 'approve'}
                                disabled={isPending}
                                onClick={() => onApprove(alert.id)}
                                tooltip={isCritical && isHumanMode ? 'Confirm this critical alert' : 'Approve and act on alert'}
                                flex
                            />
                        )}

                        {/* Dispatch dropdown */}
                        {mounted && hasPermission('dispatch_unit') && onDispatch && (
                            <DispatchDropdown
                                alertId={alert.id}
                                pending={pendingAction === 'dispatch'}
                                disabled={isPending}
                                onDispatch={handleDispatch}
                                alreadyDispatched={dispatchedService}
                            />
                        )}

                        {/* Escalate */}
                        {mounted && onEscalate && !isEscalated && (
                            <IconActionBtn
                                label="Escalate"
                                icon={<ChevronUp className="w-3 h-3" />}
                                color="var(--accent-secondary)"
                                pending={pendingAction === 'escalate'}
                                disabled={isPending}
                                onClick={() => onEscalate(alert.id)}
                                tooltip="Escalate to supervisor"
                                muted
                            />
                        )}

                        {/* Claim */}
                        {mounted && onClaim && (
                            <ClaimButton
                                alert={alert}
                                onClaim={onClaim}
                                isClaiming={isClaiming ?? false}
                                variant="card"
                            />
                        )}

                        {/* Ignore / Dismiss */}
                        <IconActionBtn
                            label={isHumanMode ? 'Dismiss' : 'Ignore'}
                            icon={<XCircle className="w-3 h-3" />}
                            color={isHumanMode ? 'var(--severity-critical)' : 'var(--text-muted)'}
                            pending={pendingAction === 'ignore'}
                            disabled={isPending}
                            onClick={handleIgnoreClick}
                            muted
                            tooltip={isHumanMode ? 'Dismiss with audit reason' : 'Ignore this alert'}
                        />
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

// ─── Dispatch Dropdown ────────────────────────────────────────────────────────

function DispatchDropdown({
                              alertId,
                              pending,
                              disabled,
                              onDispatch,
                              alreadyDispatched,
                          }: {
    alertId:           string;
    pending:           boolean;
    disabled:          boolean;
    onDispatch:        (service: DispatchService) => void;
    alreadyDispatched: DispatchService | null;
}) {
    const dispatched = DISPATCH_OPTIONS.find(o => o.key === alreadyDispatched);

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={disabled}
                            className={cn(
                                'flex-1 h-6 text-[0.56rem] tracking-[0.04em] rounded-sm transition-all duration-150 gap-1',
                                'flex items-center justify-center',
                            )}
                            style={{
                                fontFamily: 'var(--font-mono)',
                                background: alreadyDispatched
                                    ? `${dispatched?.color}20`
                                    : pending
                                        ? 'rgba(255,136,0,0.2)'
                                        : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${
                                    alreadyDispatched
                                        ? `${dispatched?.color}50`
                                        : pending
                                            ? 'rgba(255,136,0,0.5)'
                                            : 'rgba(255,255,255,0.07)'
                                }`,
                                color: alreadyDispatched
                                    ? dispatched?.color
                                    : pending
                                        ? 'var(--severity-high)'
                                        : 'var(--severity-high)',
                                cursor: disabled ? 'wait' : 'pointer',
                                opacity: disabled && !pending ? 0.4 : 1,
                            }}
                        >
                            {pending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : alreadyDispatched ? (
                                dispatched?.icon
                            ) : (
                                <Siren className="w-3 h-3" />
                            )}
                            {pending ? 'Sending…' : alreadyDispatched ? dispatched?.label : 'Dispatch'}
                            {!pending && !alreadyDispatched && <ChevronDown className="w-2.5 h-2.5 ml-auto opacity-60" />}
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    {alreadyDispatched ? `${dispatched?.label} dispatched` : 'Dispatch emergency service'}
                </TooltipContent>
            </Tooltip>

            <DropdownMenuContent
                align="start"
                className="w-52 z-50"
                style={{
                    background:   'var(--bg-elevated)',
                    border:       '1px solid var(--border-default)',
                    fontFamily:   'var(--font-mono)',
                    borderRadius: 6,
                }}
            >
                <DropdownMenuLabel
                    className="text-[0.5rem] tracking-widest uppercase px-2 py-1.5"
                    style={{ color: 'var(--text-disabled)' }}
                >
                    Select Service to Dispatch
                </DropdownMenuLabel>
                <DropdownMenuSeparator style={{ background: 'var(--border-default)' }} />

                {DISPATCH_OPTIONS.map(opt => (
                    <DropdownMenuItem
                        key={opt.key}
                        onClick={() => onDispatch(opt.key)}
                        className="flex items-start gap-2.5 px-2 py-2 cursor-pointer group/item"
                        style={{ outline: 'none' }}
                    >
                        <span
                            className="mt-0.5 p-1 rounded-sm shrink-0"
                            style={{ background: `${opt.color}18`, color: opt.color }}
                        >
                            {opt.icon}
                        </span>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span
                                    className="text-[0.62rem] font-semibold"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {opt.label}
                                </span>
                                <span
                                    className="text-[0.5rem] tabular-nums"
                                    style={{ color: opt.color, fontFamily: 'var(--font-mono)' }}
                                >
                                    ETA {opt.eta}
                                </span>
                            </div>
                            <span
                                className="text-[0.5rem] truncate"
                                style={{ color: 'var(--text-disabled)' }}
                            >
                                {opt.description}
                            </span>
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ─── Dispatch ETA Banner ──────────────────────────────────────────────────────

function DispatchEtaBanner({
                               service,
                               countdown,
                           }: {
    service:   DispatchService;
    countdown: number | null;
}) {
    const opt = DISPATCH_OPTIONS.find(o => o.key === service);
    if (!opt) return null;

    const mins = countdown !== null ? Math.floor(countdown / 60) : null;
    const secs = countdown !== null ? countdown % 60 : null;
    const arrived = countdown !== null && countdown <= 0;

    return (
        <div
            className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded-sm transition-all duration-300"
            style={{
                background: arrived ? 'rgba(80,200,120,0.1)' : `${opt.color}10`,
                border:     `1px solid ${arrived ? 'rgba(80,200,120,0.3)' : `${opt.color}30`}`,
            }}
        >
            <span style={{ color: arrived ? '#50c878' : opt.color }}>
                {arrived ? <CheckCircle2 className="w-3 h-3" /> : opt.icon}
            </span>
            <div className="flex flex-col flex-1 min-w-0">
                <span
                    className="text-[0.52rem] font-semibold"
                    style={{ color: arrived ? '#50c878' : opt.color, fontFamily: 'var(--font-mono)' }}
                >
                    {arrived ? `${opt.label} Arrived` : `${opt.label} Dispatched`}
                </span>
                <span
                    className="text-[0.48rem]"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                    {opt.description}
                </span>
            </div>
            {!arrived && countdown !== null && (
                <div
                    className="flex items-center gap-0.5 shrink-0"
                    style={{ color: opt.color, fontFamily: 'var(--font-mono)' }}
                >
                    <Clock className="w-2.5 h-2.5" />
                    <span className="text-[0.52rem] tabular-nums font-bold">
                        {mins}:{String(secs).padStart(2, '0')}
                    </span>
                </div>
            )}
            {arrived && (
                <Badge
                    variant="outline"
                    className="text-[0.44rem] tracking-wider border-0 shrink-0"
                    style={{ background: 'rgba(80,200,120,0.15)', color: '#50c878' }}
                >
                    ON SCENE
                </Badge>
            )}
        </div>
    );
}

// ─── Icon Action Button ───────────────────────────────────────────────────────

function IconActionBtn({
                           label,
                           icon,
                           color,
                           pending,
                           disabled,
                           onClick,
                           muted,
                           tooltip,
                           flex,
                       }: {
    label:    string;
    icon:     React.ReactNode;
    color:    string;
    pending:  boolean;
    disabled: boolean;
    onClick:  () => void;
    muted?:   boolean;
    tooltip?: string;
    flex?:    boolean;
}) {
    const btn = (
        <Button
            size="sm"
            variant="ghost"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'h-6 text-[0.56rem] tracking-[0.04em] rounded-sm transition-all duration-150 gap-1',
                'flex items-center',
                flex ? 'flex-1 justify-center' : 'px-2 shrink-0',
                muted ? 'px-1.5' : 'px-2',
            )}
            style={{
                fontFamily: 'var(--font-mono)',
                background: pending ? `${color}20` : 'rgba(255,255,255,0.03)',
                border:     `1px solid ${pending ? `${color}50` : 'rgba(255,255,255,0.07)'}`,
                color:      pending ? color : muted ? 'var(--text-muted)' : color,
                opacity:    disabled && !pending ? 0.4 : 1,
                cursor:     disabled ? 'wait' : 'pointer',
            }}
        >
            {pending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : icon
            }
            {pending ? 'Sending…' : label}
        </Button>
    );

    if (!tooltip) return btn;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{btn}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{tooltip}</TooltipContent>
        </Tooltip>
    );
}