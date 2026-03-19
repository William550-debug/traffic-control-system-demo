'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Alert } from '@/types';
import {
    SEVERITY_COLORS,
    SEVERITY_BG,
    SEVERITY_BORDER,
    ALERT_TYPE_LABELS,
    formatRelativeTime,
    formatTime,
    confidenceLevel,
    CONFIDENCE_COLORS,
} from '@/lib/utils';
import { useAuth }    from '@/providers/auth-provider';
import { Button }     from '@/components/ui/button';
import { Badge }      from '@/components/ui/badge';
import { Progress }   from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ClaimBanner, ClaimButton } from '@/components/alerts/claim-banner';
import {
    X,
    CheckCircle2,
    ShieldAlert,
    HeartPulse,
    Truck,
    Car,
    Siren,
    ChevronUp,
    MapPin,
    Clock,
    Timer,
    Bot,
    Activity,
    AlertTriangle,
    Radio,
    Zap,
    LayoutList,
    ArrowRight,
    CheckCheck,
    XCircle,
    Info,
    Loader2,
    Signal,
    CalendarClock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DispatchService = 'police' | 'ambulance' | 'red_cross' | 'ntsa';

interface AlertDrawerProps {
    alert:        Alert | null;
    onClose:      () => void;
    onApprove:    (id: string) => void;
    onIgnore:     (id: string, reason: string) => void;
    onDispatch?:  (id: string, service?: DispatchService) => void;
    onEscalate?:  (id: string) => void;
    onClaim?:     (id: string) => void;
    onRelease?:   (id: string) => void;
    isClaiming?:  boolean;
    isReleasing?: boolean;
}

// ─── Dispatch options ─────────────────────────────────────────────────────────

const DISPATCH_OPTIONS: Array<{
    key:         DispatchService;
    label:       string;
    agency:      string;
    icon:        React.ReactNode;
    eta:         string;
    etaSeconds:  number;   // upper bound for countdown
    color:       string;
    description: string;
}> = [
    {
        key:        'police',
        label:      'Police',
        agency:     'Kenya Police Service',
        icon:       <ShieldAlert className="w-4 h-4" />,
        eta:        '4–7 min',
        etaSeconds: 7 * 60,
        color:      '#3b9eff',
        description:'Dispatch nearest police unit to the scene.',
    },
    {
        key:        'ambulance',
        label:      'Ambulance',
        agency:     'Emergency Medical Services',
        icon:       <HeartPulse className="w-4 h-4" />,
        eta:        '6–10 min',
        etaSeconds: 10 * 60,
        color:      '#ff5c5c',
        description:'Dispatch EMS for medical emergencies and casualties.',
    },
    {
        key:        'red_cross',
        label:      'Red Cross',
        agency:     'Kenya Red Cross Society',
        icon:       <Truck className="w-4 h-4" />,
        eta:        '8–12 min',
        etaSeconds: 12 * 60,
        color:      '#e63333',
        description:'Dispatch relief and humanitarian support team.',
    },
    {
        key:        'ntsa',
        label:      'NTSA',
        agency:     'Road Safety Authority',
        icon:       <Car className="w-4 h-4" />,
        eta:        '5–9 min',
        etaSeconds: 9 * 60,
        color:      '#f5c518',
        description:'Dispatch road safety officers for traffic incidents.',
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <div
            className="flex items-center gap-1.5 text-[0.52rem] tracking-[0.12em] uppercase mb-1.5"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
        >
            {icon && <span style={{ color: 'var(--text-disabled)' }}>{icon}</span>}
            {children}
        </div>
    );
}

function MetaCell({
                      label, value, sub, valueColor, icon,
                  }: {
    label:       string;
    value:       string;
    sub?:        string;
    valueColor?: string;
    icon?:       React.ReactNode;
}) {
    return (
        <div
            className="px-2.5 py-2.5 rounded-lg flex flex-col gap-1"
            style={{
                background: 'var(--bg-elevated)',
                border:     '1px solid var(--border-subtle)',
            }}
        >
            <div
                className="flex items-center gap-1 text-[0.48rem] tracking-widest uppercase"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            >
                {icon && <span className="opacity-70">{icon}</span>}
                {label}
            </div>
            <div
                className="text-[0.84rem] font-semibold leading-none tabular-nums"
                style={{ color: valueColor ?? 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
            >
                {value}
            </div>
            {sub && (
                <div
                    className="text-[0.48rem]"
                    style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                >
                    {sub}
                </div>
            )}
        </div>
    );
}

// ─── Live timer countdown (for alert.timer) ────────────────────────────────

function LiveTimer({ expiresAt, urgency }: { expiresAt: Date | string; urgency: string }) {
    const [diff, setDiff] = useState(0);

    useEffect(() => {
        const update = () => setDiff(new Date(expiresAt).getTime() - Date.now());
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    const expired  = diff <= 0;
    const mins     = Math.max(0, Math.floor(diff / 60000));
    const secs     = Math.max(0, Math.floor((diff % 60000) / 1000));
    const isCrit   = urgency === 'critical' && diff < 60000;
    const pct      = Math.max(0, Math.min(100, (diff / (15 * 60000)) * 100)); // assume 15min window

    const barColor = expired ? 'var(--severity-critical)' :
        isCrit  ? 'var(--severity-critical)' :
            diff < 3 * 60000 ? 'var(--severity-high)' :
                'var(--status-online)';

    return (
        <div
            className="rounded-lg p-3 flex flex-col gap-2"
            style={{
                background:  expired ? 'rgba(255,59,59,0.06)' : isCrit ? 'rgba(255,59,59,0.04)' : 'rgba(245,197,24,0.04)',
                border:      `1px solid ${expired ? 'rgba(255,59,59,0.3)' : isCrit ? 'rgba(255,59,59,0.2)' : 'rgba(245,197,24,0.2)'}`,
                animation:   isCrit || expired ? 'pulse-dot 1.4s ease infinite' : 'none',
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" style={{ color: barColor }} />
                    <span
                        className="text-[0.52rem] tracking-[0.1em] uppercase font-semibold"
                        style={{ color: barColor, fontFamily: 'var(--font-mono)' }}
                    >
                        {expired ? 'Timer Expired' : 'Response Timer'}
                    </span>
                </div>
                <span
                    className="text-[1.1rem] font-bold tabular-nums"
                    style={{ color: barColor, fontFamily: 'var(--font-mono)' }}
                >
                    {expired ? 'EXP' : `${mins}:${String(secs).padStart(2, '0')}`}
                </span>
            </div>
            <Progress
                value={expired ? 100 : 100 - pct}
                className="h-[3px]"
                style={
                    {
                        background: `${barColor}20`,
                        '--progress-foreground': barColor,
                    } as React.CSSProperties
                }
            />
        </div>
    );
}

// ─── Dispatch panel (tab 2 content) ──────────────────────────────────────────

function DispatchPanel({
                           alertId,
                           onDispatch,
                           dispatchedService,
                           dispatchEtaCountdown,
                       }: {
    alertId:              string;
    onDispatch:           (service: DispatchService) => void;
    dispatchedService:    DispatchService | null;
    dispatchEtaCountdown: number | null;
}) {
    const dispatched = DISPATCH_OPTIONS.find(o => o.key === dispatchedService);
    const arrived    = dispatchEtaCountdown !== null && dispatchEtaCountdown <= 0;
    const etaMins    = dispatchEtaCountdown !== null ? Math.floor(dispatchEtaCountdown / 60) : null;
    const etaSecs    = dispatchEtaCountdown !== null ? dispatchEtaCountdown % 60 : null;

    return (
        <div className="flex flex-col gap-3">
            {/* Active dispatch status banner */}
            {dispatchedService && dispatched && (
                <div
                    className="rounded-lg p-3 flex items-center gap-3"
                    style={{
                        background: arrived ? 'rgba(80,200,120,0.08)' : `${dispatched.color}08`,
                        border:     `1px solid ${arrived ? 'rgba(80,200,120,0.3)' : `${dispatched.color}30`}`,
                    }}
                >
                    <span
                        className="p-2 rounded-lg shrink-0"
                        style={{ background: arrived ? 'rgba(80,200,120,0.15)' : `${dispatched.color}15`, color: arrived ? '#50c878' : dispatched.color }}
                    >
                        {arrived ? <CheckCircle2 className="w-4 h-4" /> : dispatched.icon}
                    </span>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span
                            className="text-[0.66rem] font-bold"
                            style={{ color: arrived ? '#50c878' : dispatched.color, fontFamily: 'var(--font-mono)' }}
                        >
                            {arrived ? `${dispatched.label} On Scene` : `${dispatched.label} Dispatched`}
                        </span>
                        <span
                            className="text-[0.54rem]"
                            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                        >
                            {dispatched.agency}
                        </span>
                    </div>
                    {!arrived && etaMins !== null && (
                        <div className="flex flex-col items-end shrink-0 gap-0.5">
                            <span
                                className="text-[0.48rem] tracking-widest uppercase"
                                style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                            >
                                ETA
                            </span>
                            <span
                                className="text-[1rem] font-bold tabular-nums"
                                style={{ color: dispatched.color, fontFamily: 'var(--font-mono)' }}
                            >
                                {etaMins}:{String(etaSecs).padStart(2, '0')}
                            </span>
                        </div>
                    )}
                    {arrived && (
                        <Badge
                            variant="outline"
                            className="text-[0.44rem] tracking-widest border-0 shrink-0"
                            style={{ background: 'rgba(80,200,120,0.15)', color: '#50c878' }}
                        >
                            ON SCENE
                        </Badge>
                    )}
                </div>
            )}

            {/* Service selection grid */}
            <div>
                <SectionLabel icon={<Siren className="w-3 h-3" />}>
                    {dispatchedService ? 'Dispatch Additional Unit' : 'Select Service'}
                </SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                    {DISPATCH_OPTIONS.map(opt => {
                        const isActive = dispatchedService === opt.key;
                        return (
                            <button
                                key={opt.key}
                                onClick={() => onDispatch(opt.key)}
                                className="flex flex-col gap-2 p-3 rounded-lg text-left transition-all duration-200 group"
                                style={{
                                    background:   isActive ? `${opt.color}15` : 'var(--bg-elevated)',
                                    border:       `1px solid ${isActive ? `${opt.color}50` : 'var(--border-subtle)'}`,
                                    boxShadow:    isActive ? `0 0 10px ${opt.color}20` : 'none',
                                    transform:    isActive ? 'translateY(-1px)' : 'none',
                                    cursor:       'pointer',
                                    outline:      'none',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.background  = `${opt.color}08`;
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${opt.color}35`;
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) {
                                        (e.currentTarget as HTMLButtonElement).style.background  = 'var(--bg-elevated)';
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)';
                                    }
                                }}
                            >
                                {/* Icon + active check */}
                                <div className="flex items-center justify-between">
                                    <span
                                        className="p-1.5 rounded-md"
                                        style={{ background: `${opt.color}15`, color: opt.color }}
                                    >
                                        {opt.icon}
                                    </span>
                                    {isActive && (
                                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: opt.color }} />
                                    )}
                                </div>

                                {/* Label + agency */}
                                <div className="flex flex-col gap-0.5">
                                    <span
                                        className="text-[0.64rem] font-bold leading-none"
                                        style={{ color: isActive ? opt.color : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                                    >
                                        {opt.label}
                                    </span>
                                    <span
                                        className="text-[0.48rem] leading-tight"
                                        style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                                    >
                                        {opt.agency}
                                    </span>
                                </div>

                                {/* ETA + dispatch button row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" style={{ color: 'var(--text-disabled)' }} />
                                        <span
                                            className="text-[0.52rem] tabular-nums font-semibold"
                                            style={{ color: opt.color, fontFamily: 'var(--font-mono)' }}
                                        >
                                            {opt.eta}
                                        </span>
                                    </div>
                                    <ArrowRight
                                        className="w-3 h-3 transition-transform duration-150 group-hover:translate-x-0.5"
                                        style={{ color: isActive ? opt.color : 'var(--text-disabled)' }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Description of selected service */}
            {dispatchedService && dispatched && (
                <p
                    className="text-[0.58rem] leading-relaxed px-1"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                    {dispatched.description}
                </p>
            )}
        </div>
    );
}

// ─── Action result banner ─────────────────────────────────────────────────────

function ActedBanner({ label, at }: { label: string; at: string }) {
    return (
        <div
            className="flex items-center gap-2.5 p-3 rounded-lg"
            style={{
                background: 'rgba(34,197,94,0.08)',
                border:     '1px solid rgba(34,197,94,0.25)',
                animation:  'slide-in-up 200ms ease',
            }}
        >
            <CheckCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--status-online)' }} />
            <span
                className="text-[0.62rem] tracking-[0.05em]"
                style={{ color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}
            >
                Logged: {label.toUpperCase()} — {at}
            </span>
        </div>
    );
}

// ─── Footer action button ─────────────────────────────────────────────────────

function DrawerBtn({
                       label, icon, color, onClick, primary, disabled, danger,
                   }: {
    label:    string;
    icon?:    React.ReactNode;
    color:    string;
    onClick:  () => void;
    primary?: boolean;
    disabled?: boolean;
    danger?:  boolean;
}) {
    return (
        <Button
            variant="outline"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'h-9 text-[0.6rem] font-semibold tracking-[0.05em] rounded-md transition-all duration-150 gap-1.5',
                primary ? 'flex-[1.5]' : 'flex-1',
                'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            style={{
                fontFamily:  'var(--font-mono)',
                background:  primary ? `${color}14` : danger ? `${color}08` : 'rgba(255,255,255,0.03)',
                borderColor: primary ? `${color}40` : danger ? `${color}30` : 'rgba(255,255,255,0.09)',
                color:       disabled ? 'var(--text-disabled)' : color,
            }}
        >
            {icon}
            {label}
        </Button>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertDrawer({
                                alert,
                                onClose,
                                onApprove,
                                onIgnore,
                                onDispatch,
                                onEscalate,
                                onClaim,
                                onRelease,
                                isClaiming,
                                isReleasing,
                            }: AlertDrawerProps) {
    const { hasPermission } = useAuth();

    const [ignoreReason,  setIgnoreReason]  = useState('');
    const [showIgnoreBox, setShowIgnoreBox] = useState(false);
    const [acted, setActed]                 = useState<{ label: string; at: string } | null>(null);

    // Dispatch state
    const [dispatchedService,    setDispatchedService]    = useState<DispatchService | null>(null);
    const [dispatchEtaCountdown, setDispatchEtaCountdown] = useState<number | null>(null);

    // Live timer countdown
    useEffect(() => {
        if (dispatchEtaCountdown === null || dispatchEtaCountdown <= 0) return;
        const id = setInterval(() => setDispatchEtaCountdown(p => Math.max(0, (p ?? 1) - 1)), 1000);
        return () => clearInterval(id);
    }, [dispatchEtaCountdown]);

    // Reset all local state when alert changes
    const prevAlertId = useRef<string | undefined>(undefined);
    useLayoutEffect(() => {
        if (prevAlertId.current === alert?.id) return;
        prevAlertId.current = alert?.id;
        setIgnoreReason('');
        setActed(null);
        setDispatchedService(null);
        setDispatchEtaCountdown(null);
    });

    // ── Handlers ──
    const handleApprove = () => {
        if (!alert) return;
        onApprove(alert.id);
        setActed({ label: 'approved', at: formatTime(new Date()) });
    };

    const handleIgnore = () => {
        if (!alert) return;
        if (!showIgnoreBox) { setShowIgnoreBox(true); return; }
        if (ignoreReason.trim().length < 10) return;
        onIgnore(alert.id, ignoreReason.trim());
        setActed({ label: 'ignored', at: formatTime(new Date()) });
        setShowIgnoreBox(false);
    };

    const handleDispatch = (service: DispatchService) => {
        if (!alert) return;
        const opt = DISPATCH_OPTIONS.find(o => o.key === service);
        if (opt) {
            setDispatchedService(service);
            setDispatchEtaCountdown(opt.etaSeconds);
        }
        onDispatch?.(alert.id, service);
        setActed({ label: `dispatched ${opt?.label ?? service}`, at: formatTime(new Date()) });
    };

    const handleEscalate = () => {
        if (!alert || !onEscalate) return;
        onEscalate(alert.id);
        setActed({ label: 'escalated', at: formatTime(new Date()) });
    };

    const color = alert ? SEVERITY_COLORS[alert.severity] : 'var(--text-muted)';
    const confLevel = alert ? confidenceLevel(alert.confidence) : 'medium';

    return (
        <TooltipProvider delayDuration={300}>
            <Sheet open={alert !== null} onOpenChange={open => !open && onClose()}>
                <SheetContent
                    side="right"
                    className="p-0 flex flex-col border-0 outline-none"
                    style={{
                        width:      'min(420px, 100vw)',
                        background: 'var(--bg-raised)',
                        borderLeft: `1px solid ${alert ? SEVERITY_BORDER[alert.severity] : 'var(--border-default)'}`,
                        boxShadow:  alert
                            ? `-8px 0 40px ${SEVERITY_COLORS[alert.severity]}12, -2px 0 0 ${SEVERITY_COLORS[alert.severity]}30`
                            : '-8px 0 32px rgba(0,0,0,0.4)',
                    }}
                >
                    {alert && (
                        <>
                            {/* ══════════════════════════════════════════
                            HEADER
                        ══════════════════════════════════════════ */}
                            <SheetHeader
                                className="px-4 pt-4 pb-3.5 shrink-0 space-y-0"
                                style={{
                                    background:   SEVERITY_BG[alert.severity],
                                    borderBottom: `1px solid ${SEVERITY_BORDER[alert.severity]}`,
                                }}
                            >
                                <div className="flex gap-3 items-start">
                                    {/* Severity glow bar */}
                                    <div
                                        className="w-[3px] self-stretch rounded-full shrink-0"
                                        style={{
                                            background: color,
                                            boxShadow:  `0 0 12px ${color}80`,
                                            minHeight:  48,
                                        }}
                                    />

                                    <div className="flex-1 min-w-0">
                                        {/* Row 1: type · severity · status badges · close */}
                                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                                            {/* Severity pill */}
                                            <div
                                                className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                                                style={{
                                                    background: `${color}18`,
                                                    border:     `1px solid ${color}40`,
                                                }}
                                            >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{
                                                    background: color,
                                                    boxShadow:  alert.severity === 'critical' ? `0 0 5px ${color}` : 'none',
                                                    animation:  alert.severity === 'critical' ? 'pulse-dot 1.4s ease infinite' : 'none',
                                                }}
                                            />
                                                <span
                                                    className="text-[0.48rem] tracking-[0.1em] uppercase font-bold"
                                                    style={{ color, fontFamily: 'var(--font-mono)' }}
                                                >
                                                {alert.severity}
                                            </span>
                                            </div>

                                            {/* Type label */}
                                            <span
                                                className="text-[0.5rem] tracking-[0.1em] uppercase"
                                                style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                                            >
                                            {ALERT_TYPE_LABELS[alert.type]}
                                        </span>

                                            {/* Status badges */}
                                            {alert.status === 'acknowledged' && (
                                                <Badge
                                                    variant="outline"
                                                    className="h-[18px] px-1.5 text-[0.44rem] tracking-[0.1em] gap-1 shrink-0"
                                                    style={{
                                                        borderColor: 'var(--status-online)',
                                                        color:       'var(--status-online)',
                                                        fontFamily:  'var(--font-mono)',
                                                        background:  'rgba(34,197,94,0.08)',
                                                    }}
                                                >
                                                    <CheckCircle2 className="w-2 h-2" />
                                                    ACK
                                                </Badge>
                                            )}
                                            {alert.status === 'escalated' && (
                                                <Badge
                                                    variant="outline"
                                                    className="h-[18px] px-1.5 text-[0.44rem] tracking-[0.1em] gap-1 shrink-0"
                                                    style={{
                                                        borderColor: 'var(--accent-secondary)',
                                                        color:       'var(--accent-secondary)',
                                                        fontFamily:  'var(--font-mono)',
                                                        background:  'rgba(168,85,247,0.08)',
                                                    }}
                                                >
                                                    <ChevronUp className="w-2 h-2" />
                                                    ESCALATED
                                                </Badge>
                                            )}

                                            <div className="flex-1" />

                                            {/* Close button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={onClose}
                                                aria-label="Close drawer"
                                                className="h-6 w-6 rounded-md shrink-0"
                                                style={{
                                                    color:      'var(--text-muted)',
                                                    background: 'transparent',
                                                }}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        {/* Title */}
                                        <SheetTitle
                                            className="text-[0.96rem] font-bold leading-snug mb-2 text-left"
                                            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                                        >
                                            {alert.title}
                                        </SheetTitle>

                                        {/* Location + age */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 shrink-0" style={{ color: 'var(--text-disabled)' }} />
                                                <span
                                                    className="text-[0.58rem] truncate"
                                                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                                                >
                                                {alert.location.label}
                                                    {alert.location.zone && ` · ${alert.location.zone}`}
                                            </span>
                                            </div>
                                            <span
                                                className="text-[0.52rem] shrink-0"
                                                style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}
                                            >
                                            {formatRelativeTime(alert.detectedAt)}
                                        </span>
                                        </div>
                                    </div>
                                </div>
                            </SheetHeader>

                            {/* ══════════════════════════════════════════
                            TABS
                        ══════════════════════════════════════════ */}
                            <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden min-h-0">
                                {/* Tab bar */}
                                <div
                                    className="shrink-0 px-4 py-2"
                                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                >
                                    <TabsList
                                        className="w-full h-[30px] rounded-lg p-[3px] gap-[3px]"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            border:     '1px solid var(--border-default)',
                                        }}
                                    >
                                        <TabsTrigger
                                            value="overview"
                                            className="flex-1 h-[24px] flex items-center justify-center gap-1.5 text-[0.52rem] tracking-[0.06em] uppercase rounded-[7px] data-[state=active]:bg-[var(--bg-overlay)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-none text-[var(--text-muted)] transition-all duration-150"
                                            style={{ fontFamily: 'var(--font-mono)' }}
                                        >
                                            <LayoutList className="w-3 h-3" />
                                            Overview
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="dispatch"
                                            className="flex-1 h-[24px] flex items-center justify-center gap-1.5 text-[0.52rem] tracking-[0.06em] uppercase rounded-[7px] data-[state=active]:bg-[var(--bg-overlay)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:shadow-none text-[var(--text-muted)] transition-all duration-150"
                                            style={{ fontFamily: 'var(--font-mono)' }}
                                        >
                                            <Siren className="w-3 h-3" />
                                            Dispatch
                                            {dispatchedService && (
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                                    style={{ background: 'var(--status-online)' }}
                                                />
                                            )}
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* ── OVERVIEW TAB ── */}
                                <TabsContent value="overview" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
                                    <ScrollArea className="h-full">
                                        <div className="px-4 py-3.5 flex flex-col gap-4">

                                            {/* Description */}
                                            <section>
                                                <SectionLabel icon={<Info className="w-3 h-3" />}>Description</SectionLabel>
                                                <p
                                                    className="text-[0.7rem] leading-relaxed m-0"
                                                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
                                                >
                                                    {alert.description}
                                                </p>
                                            </section>

                                            {/* Claim banner */}
                                            {alert.claimedBy && (
                                                <ClaimBanner
                                                    alert={alert}
                                                    onRelease={id => onRelease?.(id)}
                                                    onClaim={id => onClaim?.(id)}
                                                    isReleasing={isReleasing ?? false}
                                                    isClaiming={isClaiming ?? false}
                                                    variant="drawer"
                                                />
                                            )}

                                            {/* Live alert timer */}
                                            {alert.timer && (
                                                <LiveTimer
                                                    expiresAt={alert.timer.expiresAt}
                                                    urgency={alert.timer.urgency}
                                                />
                                            )}

                                            {/* Impact metric */}
                                            {alert.impact && (
                                                <section>
                                                    <SectionLabel icon={<Activity className="w-3 h-3" />}>Impact</SectionLabel>
                                                    <div
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                                                        style={{
                                                            background: `${color}08`,
                                                            border:     `1px solid ${color}20`,
                                                        }}
                                                    >
                                                        <Activity className="w-4 h-4 shrink-0" style={{ color }} />
                                                        <span
                                                            className="text-[0.62rem] flex-1"
                                                            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                                                        >
                                                        {alert.impact.metric}
                                                    </span>
                                                        <span
                                                            className="text-[1rem] font-bold tabular-nums"
                                                            style={{ color, fontFamily: 'var(--font-mono)' }}
                                                        >
                                                        {alert.impact.value}{alert.impact.unit}
                                                    </span>
                                                    </div>
                                                </section>
                                            )}

                                            {/* Metadata grid */}
                                            <section>
                                                <SectionLabel icon={<CalendarClock className="w-3 h-3" />}>Details</SectionLabel>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <MetaCell
                                                        label="Detected"
                                                        value={formatTime(alert.detectedAt)}
                                                        sub={formatRelativeTime(alert.detectedAt)}
                                                        icon={<Clock className="w-2.5 h-2.5" />}
                                                    />
                                                    <MetaCell
                                                        label="Last Update"
                                                        value={formatTime(alert.updatedAt)}
                                                        sub={formatRelativeTime(alert.updatedAt)}
                                                        icon={<Clock className="w-2.5 h-2.5" />}
                                                    />
                                                    <MetaCell
                                                        label="AI Confidence"
                                                        value={`${alert.confidence}%`}
                                                        sub={confLevel.toUpperCase()}
                                                        valueColor={CONFIDENCE_COLORS[confLevel]}
                                                        icon={<Signal className="w-2.5 h-2.5" />}
                                                    />
                                                    <MetaCell
                                                        label="Affected Signals"
                                                        value={String(alert.affectedIntersections.length || '—')}
                                                        sub="intersections"
                                                        icon={<Radio className="w-2.5 h-2.5" />}
                                                    />
                                                </div>
                                            </section>

                                            {/* Confidence section */}
                                            <section>
                                                <div className="flex justify-between items-center mb-2">
                                                    <SectionLabel icon={<Bot className="w-3 h-3" />}>AI Confidence</SectionLabel>
                                                    <span
                                                        className="text-[0.58rem] font-semibold"
                                                        style={{
                                                            color:      CONFIDENCE_COLORS[confLevel],
                                                            fontFamily: 'var(--font-mono)',
                                                        }}
                                                    >
                                                    {confLevel.toUpperCase()} · {alert.confidence}%
                                                </span>
                                                </div>
                                                <Progress
                                                    value={alert.confidence}
                                                    className="h-[5px]"
                                                    style={
                                                        {
                                                            background: `${CONFIDENCE_COLORS[confLevel]}20`,
                                                            '--progress-foreground': CONFIDENCE_COLORS[confLevel],
                                                        } as React.CSSProperties
                                                    }
                                                />
                                                {alert.confidenceMetadata && (
                                                    <div className="flex gap-2 mt-2 flex-wrap">
                                                        {Object.entries(alert.confidenceMetadata).map(([k, v]) => (
                                                            <span
                                                                key={k}
                                                                className="text-[0.48rem] px-1.5 py-0.5 rounded-sm"
                                                                style={{
                                                                    background: 'var(--bg-elevated)',
                                                                    border:     '1px solid var(--border-subtle)',
                                                                    color:      'var(--text-muted)',
                                                                    fontFamily: 'var(--font-mono)',
                                                                }}
                                                            >
                                                            {k}: {String(v)}
                                                        </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </section>

                                            {/* AI suggestion */}
                                            {alert.suggestedAction && (
                                                <div
                                                    className="rounded-lg p-3"
                                                    style={{
                                                        background: 'rgba(59,158,255,0.05)',
                                                        border:     '1px solid rgba(59,158,255,0.18)',
                                                        borderLeft: '3px solid var(--accent-primary)',
                                                    }}
                                                >
                                                    <SectionLabel icon={<Zap className="w-3 h-3" />}>AI Suggestion</SectionLabel>
                                                    <p
                                                        className="text-[0.68rem] m-0 leading-relaxed"
                                                        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
                                                    >
                                                        {alert.suggestedAction}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Affected intersections */}
                                            {alert.affectedIntersections.length > 0 && (
                                                <section>
                                                    <SectionLabel icon={<Radio className="w-3 h-3" />}>
                                                        Affected Intersections
                                                    </SectionLabel>
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {alert.affectedIntersections.map(id => (
                                                            <Badge
                                                                key={id}
                                                                variant="outline"
                                                                className="text-[0.56rem] tracking-[0.06em] px-2 py-0.5 rounded-md"
                                                                style={{
                                                                    background:  'var(--bg-elevated)',
                                                                    borderColor: `${color}25`,
                                                                    color:       'var(--text-secondary)',
                                                                    fontFamily:  'var(--font-mono)',
                                                                }}
                                                            >
                                                                {id}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </section>
                                            )}

                                            {/* Action result */}
                                            {acted && <ActedBanner label={acted.label} at={acted.at} />}

                                            {/* Ignore reason box — in scroll area to keep footer clean */}
                                            {showIgnoreBox && (
                                                <section style={{ animation: 'slide-in-up 200ms ease' }}>
                                                    <SectionLabel icon={<AlertTriangle className="w-3 h-3" />}>
                                                        Reason for ignoring (required, min 10 chars)
                                                    </SectionLabel>
                                                    <textarea
                                                        value={ignoreReason}
                                                        onChange={e => setIgnoreReason(e.target.value)}
                                                        placeholder="Minimum 10 characters — logged to audit trail"
                                                        autoFocus
                                                        rows={3}
                                                        style={{
                                                            width:      '100%',
                                                            padding:    '8px 10px',
                                                            background: 'var(--bg-elevated)',
                                                            borderRadius: 6,
                                                            border:     `1px solid ${
                                                                ignoreReason.length > 0 && ignoreReason.length < 10
                                                                    ? 'var(--severity-high)'
                                                                    : 'var(--border-default)'
                                                            }`,
                                                            color:      'var(--text-primary)',
                                                            fontFamily: 'var(--font-mono)',
                                                            fontSize:   '0.68rem',
                                                            lineHeight: 1.5,
                                                            resize:     'vertical' as const,
                                                            outline:    'none',
                                                            boxSizing:  'border-box' as const,
                                                            marginTop:  4,
                                                        }}
                                                    />
                                                    <span
                                                        className="text-[0.52rem] mt-1 block"
                                                        style={{
                                                            color:      ignoreReason.length < 10
                                                                ? 'var(--severity-high)'
                                                                : 'var(--status-online)',
                                                            fontFamily: 'var(--font-mono)',
                                                        }}
                                                    >
                                                    {ignoreReason.length} / 10 minimum
                                                </span>
                                                </section>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                {/* ── DISPATCH TAB ── */}
                                <TabsContent value="dispatch" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
                                    <ScrollArea className="h-full">
                                        <div className="px-4 py-3.5">
                                            {hasPermission('dispatch_unit') && onDispatch ? (
                                                <DispatchPanel
                                                    alertId={alert.id}
                                                    onDispatch={handleDispatch}
                                                    dispatchedService={dispatchedService}
                                                    dispatchEtaCountdown={dispatchEtaCountdown}
                                                />
                                            ) : (
                                                <div
                                                    className="flex flex-col items-center justify-center gap-3 py-12 text-center"
                                                    style={{ color: 'var(--text-disabled)' }}
                                                >
                                                    <Siren className="w-8 h-8 opacity-30" />
                                                    <span
                                                        className="text-[0.6rem] tracking-[0.06em]"
                                                        style={{ fontFamily: 'var(--font-mono)' }}
                                                    >
                                                    Dispatch permission required
                                                </span>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>

                            {/* ══════════════════════════════════════════
                            ACTION FOOTER
                        ══════════════════════════════════════════ */}
                            {!acted && (
                                <div
                                    className="px-4 py-3 flex gap-2 shrink-0 flex-wrap"
                                    style={{
                                        borderTop:  '1px solid var(--border-default)',
                                        background: 'var(--bg-base)',
                                    }}
                                >
                                    {hasPermission('approve_signal') && (
                                        <DrawerBtn
                                            label="Approve"
                                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                            color="var(--status-online)"
                                            onClick={handleApprove}
                                            primary
                                        />
                                    )}

                                    {onEscalate && alert.status !== 'escalated' && (
                                        <DrawerBtn
                                            label="Escalate"
                                            icon={<ChevronUp className="w-3.5 h-3.5" />}
                                            color="var(--accent-secondary)"
                                            onClick={handleEscalate}
                                        />
                                    )}

                                    {onClaim && !alert.claimedBy && (
                                        <ClaimButton
                                            alert={alert}
                                            onClaim={onClaim}
                                            isClaiming={isClaiming ?? false}
                                            variant="drawer"
                                        />
                                    )}

                                    <DrawerBtn
                                        label={showIgnoreBox ? 'Confirm Ignore' : 'Ignore'}
                                        icon={showIgnoreBox
                                            ? <XCircle className="w-3.5 h-3.5" />
                                            : <X className="w-3.5 h-3.5" />
                                        }
                                        color={showIgnoreBox ? 'var(--severity-critical)' : 'var(--text-muted)'}
                                        onClick={handleIgnore}
                                        disabled={showIgnoreBox && ignoreReason.trim().length < 10}
                                        danger={showIgnoreBox}
                                    />
                                </div>
                            )}

                            {/* Post-action footer */}
                            {acted && (
                                <div
                                    className="px-4 py-3 shrink-0"
                                    style={{
                                        borderTop:  '1px solid var(--border-default)',
                                        background: 'var(--bg-base)',
                                    }}
                                >
                                    <Button
                                        variant="ghost"
                                        onClick={onClose}
                                        className="w-full h-9 text-[0.6rem] tracking-[0.05em] gap-1.5"
                                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Close
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </TooltipProvider>
    );
}