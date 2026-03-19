'use client';

/**
 * /operator/modes — Mode Control Panel  (redesigned)
 * ────────────────────────────────────────────────────
 *
 * New additions:
 *  ① Daily Traffic Summary   — KPI cards + 24h bar chart (canvas-free, CSS bars)
 *  ② Peak Hours Event Log    — timeline of high-activity windows with incident density
 *  ③ Incident Count          — running counters per severity with delta vs yesterday
 *  ④ Exportable PDF/CSV      — client-side generation, no server dependency
 *
 * Tab layout:
 *  [Status]  [Thresholds]  [History]  [Analytics ✦]
 */

import React, { useState, useEffect, useMemo, startTransition } from 'react';
import {
    Bot, ShieldCheck, ArrowRight, Clock, RefreshCw, User, Zap, History,
    Settings2, Gauge, Brain, CloudRain, Siren, CalendarDays, AlertTriangle,
    Save, RotateCcw, CheckCircle2, ArrowLeftRight, Cpu, ChevronDown,
    ChevronRight as ChevronRightIcon, Activity,
    BarChart3, FileDown, FileText, Car, AlertCircle, Flame, Info,
    Radio, Download, ArrowUpRight, ArrowDownRight,
    Calendar, Loader2,
} from 'lucide-react';
import { useMode }    from '@/providers/mode-provider';
import { useAuth }    from '@/providers/auth-provider';
import { Badge }      from '@/components/ui/badge';
import { Button }     from '@/components/ui/button';
import { Card }       from '@/components/ui/card';
import { Progress }   from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider }     from '@/components/ui/slider';
import {
    Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ModeTransition, OperatingMode, ModeThresholds } from '@/types';

// ─── Design tokens ────────────────────────────────────────────────────────────

const MODE_COLOR: Record<OperatingMode, string> = {
    'AI-Prioritized':  'var(--accent-primary)',
    'Human-Validated': '#f5c518',
};
const MODE_BG: Record<OperatingMode, string> = {
    'AI-Prioritized':  'rgba(59,158,255,0.07)',
    'Human-Validated': 'rgba(245,197,24,0.07)',
};
const MODE_BORDER: Record<OperatingMode, string> = {
    'AI-Prioritized':  'rgba(59,158,255,0.28)',
    'Human-Validated': 'rgba(245,197,24,0.28)',
};
const MODE_ICON: Record<OperatingMode, React.ElementType> = {
    'AI-Prioritized':  Bot,
    'Human-Validated': ShieldCheck,
};
const MODE_SHORT: Record<OperatingMode, string> = {
    'AI-Prioritized':  'AI',
    'Human-Validated': 'HV',
};

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ff3b3b',
    high:     '#ff8800',
    medium:   '#f5c518',
    low:      '#50c878',
    info:     '#64a0ff',
};

// ─── Mock analytics data (replace with real hook/API) ─────────────────────────

function useDailyTrafficData() {
    // 24-hour traffic volume bars (0–100 normalised)
    const hourlyVolume = useMemo<number[]>(() => [
        12, 9, 7, 6, 8, 18, 42, 78, 91, 85, 74, 70,
        75, 72, 68, 65, 72, 88, 95, 82, 60, 42, 28, 16,
    ], []);

    const summary = useMemo(() => ({
        totalVehicles:   142_830,
        avgSpeedKmh:     38,
        peakVolumeHour:  '07:00–08:00',
        peakVolumePct:   95,
        congestionIndex: 72,           // 0–100
        comparedYesterday: +8.4,       // % delta
    }), []);

    const incidentCounts = useMemo(() => ({
        critical: 2,
        high:     7,
        medium:   18,
        low:      43,
        info:     11,
        total:    81,
        deltaVsYesterday: -14,         // % delta
    }), []);

    const peakHours = useMemo(() => [
        { start: '07:00', end: '09:00', label: 'Morning Peak',   volume: 91, incidents: 12, mode: 'Human-Validated' as OperatingMode },
        { start: '12:00', end: '13:00', label: 'Midday Surge',   volume: 75, incidents: 5,  mode: 'AI-Prioritized'  as OperatingMode },
        { start: '17:00', end: '19:00', label: 'Evening Peak',   volume: 95, incidents: 21, mode: 'Human-Validated' as OperatingMode },
        { start: '22:00', end: '23:00', label: 'Night Incident', volume: 42, incidents: 8,  mode: 'Human-Validated' as OperatingMode },
    ], []);

    return { hourlyVolume, summary, incidentCounts, peakHours };
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const COOLDOWN_MS = 5 * 60 * 1000;

function fmtTime(d: Date): string {
    return new Date(d).toLocaleTimeString('en-KE', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
}
function fmtRelative(d: Date): string {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60)  return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60)  return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
}
function fmtDate(d: Date): string {
    const diff = Math.floor(
        (new Date().setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86_400_000
    );
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function useCooldown(transitions: ModeTransition[]): number {
    const [rem, setRem] = useState(0);
    useEffect(() => {
        const latest = transitions[0];
        if (!latest) { setRem(0); return; }
        const tick = () => setRem(Math.max(0, COOLDOWN_MS - (Date.now() - new Date(latest.triggeredAt).getTime())));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [transitions]);
    return rem;
}

// ─── Export utilities ─────────────────────────────────────────────────────────

function buildCSV(transitions: ModeTransition[]): string {
    const header = ['ID', 'From', 'To', 'Triggered By', 'Operator', 'Reason', 'Timestamp'].join(',');
    const rows = transitions.map(t => [
        t.id,
        t.from,
        t.to,
        t.triggeredBy,
        t.operatorId ?? 'System',
        `"${(t.reason ?? '').replace(/"/g, '""')}"`,
        new Date(t.triggeredAt).toISOString(),
    ].join(','));
    return [header, ...rows].join('\n');
}

function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadPDF(transitions: ModeTransition[], summary: ReturnType<typeof useDailyTrafficData>['summary'], incidentCounts: ReturnType<typeof useDailyTrafficData>['incidentCounts']) {
    // Build HTML document and print-to-PDF via window.print()
    const date = new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const rows = transitions.slice(0, 100).map(t => `
        <tr>
            <td>${new Date(t.triggeredAt).toLocaleTimeString('en-KE', { hour12: false })}</td>
            <td>${fmtDate(t.triggeredAt)}</td>
            <td>${t.from} → ${t.to}</td>
            <td>${t.triggeredBy}</td>
            <td>${t.operatorId ?? 'System'}</td>
            <td>${(t.reason ?? '').substring(0, 80)}</td>
        </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <title>Nairobi ATMS — Daily Traffic Report</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Courier New', monospace; font-size: 10px; color: #0a0a0a; padding: 32px; }
        h1 { font-family: sans-serif; font-size: 18px; font-weight: 800; margin-bottom: 4px; }
        .meta { color: #666; font-size: 9px; margin-bottom: 24px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .kpi { border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px; }
        .kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 4px; }
        .kpi-value { font-size: 18px; font-weight: 700; color: #0a0a0a; }
        .kpi-sub { font-size: 8px; color: #888; margin-top: 2px; }
        h2 { font-family: sans-serif; font-size: 12px; font-weight: 700; margin-bottom: 10px; margin-top: 20px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 8px; letter-spacing: .1em; text-transform: uppercase; color: #666; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }
        td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; font-size: 9px; color: #333; vertical-align: top; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 32px; font-size: 8px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 12px; }
        @media print { @page { margin: 20mm; } }
    </style>
</head>
<body>
    <h1>Nairobi ATMS — Daily Traffic Report</h1>
    <p class="meta">Generated: ${date} &nbsp;|&nbsp; Nairobi Advanced Traffic Management System &nbsp;|&nbsp; CONFIDENTIAL</p>

    <h2>Daily Traffic Summary</h2>
    <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Total Vehicles</div><div class="kpi-value">${summary.totalVehicles.toLocaleString()}</div><div class="kpi-sub">+${summary.comparedYesterday}% vs yesterday</div></div>
        <div class="kpi"><div class="kpi-label">Avg Speed</div><div class="kpi-value">${summary.avgSpeedKmh} km/h</div><div class="kpi-sub">City-wide average</div></div>
        <div class="kpi"><div class="kpi-label">Congestion Index</div><div class="kpi-value">${summary.congestionIndex}/100</div><div class="kpi-sub">Peak: ${summary.peakVolumeHour}</div></div>
        <div class="kpi"><div class="kpi-label">Total Incidents</div><div class="kpi-value">${incidentCounts.total}</div><div class="kpi-sub">Critical: ${incidentCounts.critical} &nbsp; High: ${incidentCounts.high}</div></div>
    </div>

    <h2>Mode Transition Log (${transitions.length} events)</h2>
    <table>
        <thead><tr><th>Time</th><th>Date</th><th>Transition</th><th>Trigger</th><th>Operator</th><th>Reason</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>

    <div class="footer">
        Nairobi ATMS · Audit Report · ${new Date().toISOString()} · Page 1
    </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (!win) { URL.revokeObjectURL(url); return; }
    setTimeout(() => {
        win.print();
        URL.revokeObjectURL(url);
    }, 400);
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ModePill({ mode, size = 'sm' }: { mode: OperatingMode; size?: 'sm' | 'md' }) {
    const Icon  = MODE_ICON[mode];
    const color = MODE_COLOR[mode];
    return (
        <div className="flex items-center gap-1.25 rounded-lg px-2 py-0.75"
             style={{ background: MODE_BG[mode], border: `1px solid ${MODE_BORDER[mode]}` }}>
            <Icon size={size === 'md' ? 11 : 9} strokeWidth={2.5} style={{ color }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: size === 'md' ? 'clamp(0.54rem, 0.48rem + 0.16vw, 0.62rem)' : '0.5rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color, whiteSpace: 'nowrap' }}>
                {MODE_SHORT[mode]}
            </span>
        </div>
    );
}

function SectionCard({ title, subtitle, icon: Icon, iconColor, children, noPad = false, action }: {
    title:      string;
    subtitle?:  string;
    icon:       React.ElementType;
    iconColor?: string;
    children:   React.ReactNode;
    noPad?:     boolean;
    action?:    React.ReactNode;
}) {
    return (
        <Card className="flex flex-col overflow-hidden h-full"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-3 px-5 py-4 shrink-0"
                 style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-center shrink-0 rounded-lg"
                     style={{ width: 30, height: 30, background: iconColor ? `${iconColor}14` : 'var(--bg-elevated)', border: `1px solid ${iconColor ? `${iconColor}32` : 'var(--border-default)'}` }}>
                    <Icon size={14} strokeWidth={2} style={{ color: iconColor ?? 'var(--text-muted)' }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.68rem, 0.6rem + 0.24vw, 0.78rem)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 3 }}>
                        {title}
                    </p>
                    {subtitle && (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.5rem, 0.44rem + 0.16vw, 0.56rem)', color: 'var(--text-muted)', lineHeight: 1 }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {action}
            </div>
            <div className={noPad ? '' : 'p-5 flex-1'}>{children}</div>
        </Card>
    );
}

function Toggle({ checked, onChange, color = 'var(--accent-primary)' }: { checked: boolean; onChange: (v: boolean) => void; color?: string }) {
    return (
        <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
                className="relative shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)"
                style={{ width: 42, height: 24, background: checked ? color : 'var(--bg-elevated)', border: `1px solid ${checked ? color : 'var(--border-strong)'}`, boxShadow: checked ? `0 0 10px ${color}40` : 'none' }}>
            <span className="absolute top-0.75 rounded-full bg-white transition-all duration-200"
                  style={{ width: 16, height: 16, left: checked ? 'calc(100% - 19px)' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE BAND
// ─────────────────────────────────────────────────────────────────────────────

function LiveBand() {
    const { currentMode, previousMode, autoTransitionEnabled, transitions } = useMode();
    const cooldownMs  = useCooldown(transitions);
    const inCooldown  = cooldownMs > 0;
    const cd          = `${Math.floor(Math.ceil(cooldownMs / 1000) / 60)}:${String(Math.ceil(cooldownMs / 1000) % 60).padStart(2, '0')}`;
    const CurrentIcon = MODE_ICON[currentMode];
    const color       = MODE_COLOR[currentMode];
    const latest      = transitions[0];

    return (
        <div className="shrink-0 w-full flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3"
             style={{ background: MODE_BG[currentMode], borderBottom: `1px solid ${MODE_BORDER[currentMode]}`, transition: 'all 500ms ease' }}>
            {/* Current mode */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center justify-center rounded-xl shrink-0"
                     style={{ width: 38, height: 38, background: `${color}18`, border: `1px solid ${color}38`, boxShadow: `0 0 14px ${color}22` }}>
                    <CurrentIcon size={18} strokeWidth={2} style={{ color }} />
                </div>
                <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)', letterSpacing: '0.12em', textTransform: 'uppercase', color, opacity: 0.65, lineHeight: 1, marginBottom: 3 }}>
                        Active mode
                    </p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.88rem, 0.74rem + 0.5vw, 1.1rem)', fontWeight: 800, color, lineHeight: 1 }}>
                        {currentMode}
                    </p>
                </div>
            </div>

            <div className="hidden sm:block w-px h-8 shrink-0" style={{ background: `${color}30` }} />

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 flex-1 min-w-0">
                {previousMode && (
                    <div className="flex items-center gap-2 shrink-0">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.48rem, 0.42rem + 0.14vw, 0.54rem)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                            Previously
                        </span>
                        <ModePill mode={previousMode} />
                    </div>
                )}
                {inCooldown && (
                    <div className="flex items-center gap-1.25 shrink-0">
                        <Clock size={11} strokeWidth={2} style={{ color: '#f5c518' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.5rem, 0.44rem + 0.16vw, 0.58rem)', color: '#f5c518', fontWeight: 700, letterSpacing: '0.06em' }}>
                            Cooldown {cd}
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-1.25 shrink-0">
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: autoTransitionEnabled ? 'var(--status-online)' : 'var(--text-disabled)', boxShadow: autoTransitionEnabled ? '0 0 4px var(--status-online)' : 'none', animation: autoTransitionEnabled ? 'pulse-dot 1.5s ease infinite' : 'none' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.48rem, 0.42rem + 0.14vw, 0.54rem)', color: autoTransitionEnabled ? 'var(--text-secondary)' : 'var(--text-disabled)', letterSpacing: '0.06em' }}>
                        Auto-transition {autoTransitionEnabled ? 'on' : 'off'}
                    </span>
                </div>
                {latest && (
                    <div className="flex items-center gap-1.25 shrink-0">
                        <Activity size={10} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.48rem, 0.42rem + 0.14vw, 0.54rem)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                            Last: {fmtRelative(latest.triggeredAt)}
                        </span>
                    </div>
                )}
            </div>

            <Badge variant="outline" className="shrink-0 h-5 px-2 tabular-nums"
                   style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.46rem, 0.4rem + 0.14vw, 0.52rem)', fontWeight: 700, background: `${color}10`, borderColor: `${color}30`, color }}>
                {transitions.length} transition{transitions.length !== 1 ? 's' : ''} this session
            </Badge>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: STATUS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// StatusTab — redesigned
// Drop-in replacement. All hooks, state, logic, and handlers are unchanged.
// Only the JSX + style layer is updated.
// ─────────────────────────────────────────────────────────────────────────────

function StatusTab() {
    const {
        currentMode, previousMode,
        autoTransitionEnabled, setAutoTransition,
        transitions, manualOverride, canOverride,
    } = useMode();
    const { user } = useAuth();

    const [overrideOpen,   setOverrideOpen]   = useState(false);
    const [overrideReason, setOverrideReason] = useState('');

    const cooldownMs  = useCooldown(transitions);
    const inCooldown  = cooldownMs > 0;
    const cdSecs      = Math.ceil(cooldownMs / 1000);
    const cdDisplay   = `${Math.floor(cdSecs / 60)}:${String(cdSecs % 60).padStart(2, '0')}`;

    const targetMode: OperatingMode = currentMode === 'AI-Prioritized'
        ? 'Human-Validated'
        : 'AI-Prioritized';

    const color        = MODE_COLOR[currentMode];
    const targetColor  = MODE_COLOR[targetMode];
    const CurrentIcon  = MODE_ICON[currentMode];
    const TargetIcon   = MODE_ICON[targetMode];

    const handleOverride = () => {
        if (!overrideReason.trim() || !user) return;
        manualOverride(targetMode, overrideReason.trim(), user.id);
        setOverrideReason('');
        setOverrideOpen(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ════════════════════════════════════════════════
                LEFT — Operating Mode
            ════════════════════════════════════════════════ */}
            <div
                className="flex flex-col overflow-hidden rounded-2xl"
                style={{
                    background: 'var(--bg-raised)',
                    border:     '1px solid var(--border-default)',
                    boxShadow:  '0 2px 16px rgba(0,0,0,0.18)',
                }}
            >
                {/* ── Card header ── */}
                <div
                    className="flex items-center gap-3 px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                    <div
                        className="flex items-center justify-center shrink-0 rounded-xl"
                        style={{
                            width:      34,
                            height:     34,
                            background: `${color}14`,
                            border:     `1px solid ${color}28`,
                        }}
                    >
                        <CurrentIcon size={15} strokeWidth={1.8} style={{ color }} />
                    </div>
                    <div className="flex flex-col gap-0.75 flex-1 min-w-0">
                        <p style={{
                            fontFamily:  'var(--font-display)',
                            fontSize:    'clamp(0.72rem, 0.64rem + 0.24vw, 0.84rem)',
                            fontWeight:  700,
                            color:       'var(--text-primary)',
                            lineHeight:  1,
                        }}>
                            Operating Mode
                        </p>
                        <p style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.5rem, 0.44rem + 0.14vw, 0.56rem)',
                            color:      'var(--text-disabled)',
                            lineHeight: 1,
                        }}>
                            Live system state and transition history
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-5 p-5">

                    {/* ── Hero mode display ── */}
                    <div
                        className="relative flex items-center gap-4 px-5 py-5 rounded-2xl overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${color}10 0%, ${color}04 100%)`,
                            border:     `1px solid ${color}28`,
                            transition: 'all 600ms ease',
                        }}
                    >
                        {/* Decorative corner glow */}
                        <div
                            className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                            style={{
                                background:    `radial-gradient(circle at top right, ${color}18 0%, transparent 70%)`,
                                borderRadius:  '0 1rem 0 0',
                            }}
                        />

                        {/* Mode icon */}
                        <div
                            className="flex items-center justify-center shrink-0 rounded-2xl"
                            style={{
                                width:     54,
                                height:    54,
                                background:`${color}18`,
                                border:    `1px solid ${color}32`,
                                boxShadow: `0 0 20px ${color}22`,
                            }}
                        >
                            <CurrentIcon size={24} strokeWidth={1.8} style={{ color }} />
                        </div>

                        {/* Mode label */}
                        <div className="flex flex-col gap-1.5 min-w-0">
                            <p style={{
                                fontFamily:    'var(--font-mono)',
                                fontSize:      'clamp(0.46rem, 0.4rem + 0.12vw, 0.52rem)',
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color,
                                opacity:       0.6,
                                lineHeight:    1,
                            }}>
                                Active mode
                            </p>
                            <p style={{
                                fontFamily: 'var(--font-display)',
                                fontSize:   'clamp(1.05rem, 0.88rem + 0.58vw, 1.32rem)',
                                fontWeight: 800,
                                color,
                                lineHeight: 1,
                                letterSpacing: '-0.01em',
                            }}>
                                {currentMode}
                            </p>
                        </div>

                        {/* Live pulse badge */}
                        <div className="ml-auto flex items-center gap-1.5 shrink-0">
                            <span
                                className="relative flex h-2 w-2"
                            >
                                <span
                                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                                    style={{ background: color }}
                                />
                                <span
                                    className="relative inline-flex rounded-full h-2 w-2"
                                    style={{ background: color }}
                                />
                            </span>
                            <span
                                style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      '0.48rem',
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color,
                                    opacity:       0.75,
                                }}
                            >
                                Live
                            </span>
                        </div>
                    </div>

                    {/* ── KPI stats ── */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            {
                                label: 'Previous',
                                value: previousMode ? MODE_SHORT[previousMode] : '—',
                                sub:   previousMode ? 'last mode' : 'no prior',
                                color: previousMode ? MODE_COLOR[previousMode] : 'var(--text-disabled)',
                            },
                            {
                                label: 'Transitions',
                                value: String(transitions.length),
                                sub:   'this session',
                                color: transitions.length > 0 ? 'var(--accent-primary)' : 'var(--text-primary)',
                            },
                            {
                                label: 'Cooldown',
                                value: inCooldown ? cdDisplay : 'Clear',
                                sub:   inCooldown ? 'remaining' : 'ready',
                                color: inCooldown ? '#f5c518' : 'var(--status-online)',
                            },
                        ].map(stat => (
                            <div
                                key={stat.label}
                                className="flex flex-col gap-2 px-3 pt-3 pb-3.5 rounded-xl"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    border:     '1px solid var(--border-subtle)',
                                }}
                            >
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      'clamp(0.44rem, 0.38rem + 0.1vw, 0.5rem)',
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color:         'var(--text-disabled)',
                                    lineHeight:    1,
                                }}>
                                    {stat.label}
                                </span>
                                <span style={{
                                    fontFamily:   'var(--font-display)',
                                    fontSize:     'clamp(0.88rem, 0.74rem + 0.46vw, 1.08rem)',
                                    fontWeight:   800,
                                    color:        stat.color,
                                    lineHeight:   1,
                                    transition:   'color 400ms ease',
                                    letterSpacing:'-0.01em',
                                }}>
                                    {stat.value}
                                </span>
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize:   '0.46rem',
                                    color:      'var(--text-disabled)',
                                    lineHeight: 1,
                                }}>
                                    {stat.sub}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* ── Recent transitions ── */}
                    {transitions.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {/* Section label */}
                            <div className="flex items-center gap-2">
                                <span style={{
                                    fontFamily:    'var(--font-mono)',
                                    fontSize:      'clamp(0.46rem, 0.4rem + 0.1vw, 0.52rem)',
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color:         'var(--text-disabled)',
                                    lineHeight:    1,
                                }}>
                                    Recent transitions
                                </span>
                                <div
                                    className="flex-1 h-px"
                                    style={{ background: 'var(--border-subtle)' }}
                                />
                            </div>

                            {/* Transition rows */}
                            {transitions.slice(0, 3).map((t, i) => (
                                <div
                                    key={`${t.id}-${i}`}
                                    className="flex items-start gap-3 px-3.5 py-3 rounded-xl transition-colors duration-150"
                                    style={{
                                        background:  i === 0
                                            ? `${MODE_COLOR[t.to]}06`
                                            : 'var(--bg-elevated)',
                                        border:      `1px solid ${i === 0 ? `${MODE_COLOR[t.to]}18` : 'var(--border-subtle)'}`,
                                    }}
                                >
                                    {/* Transition pills — stacked vertically to avoid truncation */}
                                    <div className="flex items-center gap-1.5 shrink-0 pt-px">
                                        <ModePill mode={t.from} />
                                        <ArrowRight
                                            size={9}
                                            style={{ color: 'var(--text-disabled)', flexShrink: 0 }}
                                        />
                                        <ModePill mode={t.to} />
                                    </div>

                                    {/* Reason + time */}
                                    <div className="flex flex-col gap-1.25 flex-1 min-w-0">
                                        <span
                                            className="leading-snug line-clamp-2"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   'clamp(0.52rem, 0.46rem + 0.14vw, 0.6rem)',
                                                color:      'var(--text-secondary)',
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            {t.reason}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <Clock
                                                size={9}
                                                style={{ color: 'var(--text-disabled)', flexShrink: 0 }}
                                            />
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   'clamp(0.44rem, 0.38rem + 0.1vw, 0.5rem)',
                                                color:      'var(--text-disabled)',
                                                lineHeight: 1,
                                            }}>
                                                {fmtRelative(t.triggeredAt)}
                                            </span>
                                            {i === 0 && (
                                                <span
                                                    className="text-[0.42rem] tracking-[0.08em] uppercase font-bold px-1 py-0.5 rounded-full"
                                                    style={{
                                                        background: `${MODE_COLOR[t.to]}14`,
                                                        color:      MODE_COLOR[t.to],
                                                        fontFamily: 'var(--font-mono)',
                                                        border:     `1px solid ${MODE_COLOR[t.to]}28`,
                                                    }}
                                                >
                                                    Latest
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════
                RIGHT — Mode Controls
            ════════════════════════════════════════════════ */}
            <div
                className="flex flex-col overflow-hidden rounded-2xl"
                style={{
                    background: 'var(--bg-raised)',
                    border:     '1px solid var(--border-default)',
                    boxShadow:  '0 2px 16px rgba(0,0,0,0.18)',
                }}
            >
                {/* ── Card header ── */}
                <div
                    className="flex items-center gap-3 px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                    <div
                        className="flex items-center justify-center shrink-0 rounded-xl"
                        style={{
                            width:      34,
                            height:     34,
                            background: 'rgba(255,255,255,0.05)',
                            border:     '1px solid var(--border-default)',
                        }}
                    >
                        <Settings2 size={15} strokeWidth={1.8} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="flex flex-col gap-0.75 flex-1 min-w-0">
                        <p style={{
                            fontFamily:  'var(--font-display)',
                            fontSize:    'clamp(0.72rem, 0.64rem + 0.24vw, 0.84rem)',
                            fontWeight:  700,
                            color:       'var(--text-primary)',
                            lineHeight:  1,
                        }}>
                            Mode Controls
                        </p>
                        <p style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.5rem, 0.44rem + 0.14vw, 0.56rem)',
                            color:      'var(--text-disabled)',
                            lineHeight: 1,
                        }}>
                            Auto-transition settings and manual override
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 p-5">

                    {/* ── Auto-transition toggle ── */}
                    <div
                        className="flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300"
                        style={{
                            background: autoTransitionEnabled
                                ? 'linear-gradient(135deg, rgba(59,158,255,0.08) 0%, rgba(59,158,255,0.03) 100%)'
                                : 'var(--bg-elevated)',
                            border: `1px solid ${autoTransitionEnabled
                                ? 'rgba(59,158,255,0.25)'
                                : 'var(--border-subtle)'}`,
                            boxShadow: autoTransitionEnabled
                                ? '0 0 20px rgba(59,158,255,0.06)'
                                : 'none',
                        }}
                    >
                        <div
                            className="flex items-center justify-center shrink-0 rounded-xl transition-all duration-300"
                            style={{
                                width:      38,
                                height:     38,
                                background: autoTransitionEnabled
                                    ? 'rgba(59,158,255,0.14)'
                                    : 'var(--bg-raised)',
                                border: `1px solid ${autoTransitionEnabled
                                    ? 'rgba(59,158,255,0.32)'
                                    : 'var(--border-subtle)'}`,
                                boxShadow: autoTransitionEnabled
                                    ? '0 0 12px rgba(59,158,255,0.18)'
                                    : 'none',
                            }}
                        >
                            <RefreshCw
                                size={15}
                                strokeWidth={autoTransitionEnabled ? 2 : 1.6}
                                style={{
                                    color:      autoTransitionEnabled
                                        ? 'var(--accent-primary)'
                                        : 'var(--text-muted)',
                                    transition: 'color 300ms ease',
                                }}
                            />
                        </div>

                        <div className="flex flex-col gap-1.25 flex-1 min-w-0">
                            <p style={{
                                fontFamily:  'var(--font-display)',
                                fontSize:    'clamp(0.64rem, 0.58rem + 0.2vw, 0.74rem)',
                                fontWeight:  700,
                                color:       'var(--text-primary)',
                                lineHeight:  1,
                            }}>
                                Auto-transition
                            </p>
                            <p style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.5rem, 0.44rem + 0.13vw, 0.56rem)',
                                color:      autoTransitionEnabled
                                    ? 'var(--text-muted)'
                                    : 'var(--text-disabled)',
                                lineHeight: 1.4,
                                transition: 'color 300ms ease',
                            }}>
                                {autoTransitionEnabled
                                    ? 'System switches mode based on thresholds'
                                    : 'Manual control only — no auto-switch'}
                            </p>
                        </div>

                        <Toggle
                            checked={autoTransitionEnabled}
                            onChange={setAutoTransition}
                            color="var(--accent-primary)"
                        />
                    </div>

                    {/* ── Manual override block ── */}
                    {canOverride ? (
                        <div
                            className="flex flex-col overflow-hidden rounded-2xl transition-all duration-300"
                            style={{
                                border: `1px solid ${overrideOpen
                                    ? `${targetColor}28`
                                    : 'var(--border-default)'}`,
                                boxShadow: overrideOpen
                                    ? `0 0 20px ${targetColor}08`
                                    : 'none',
                            }}
                        >
                            {/* Trigger row */}
                            <button
                                onClick={() => setOverrideOpen(v => !v)}
                                aria-expanded={overrideOpen}
                                className="w-full flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-150"
                                style={{
                                    background: overrideOpen
                                        ? `${targetColor}06`
                                        : 'var(--bg-elevated)',
                                    outline: 'none',
                                }}
                                onMouseEnter={e => {
                                    if (!overrideOpen) {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!overrideOpen) {
                                        (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)';
                                    }
                                }}
                            >
                                {/* Zap icon */}
                                <div
                                    className="flex items-center justify-center shrink-0 rounded-lg transition-all duration-200"
                                    style={{
                                        width:      32,
                                        height:     32,
                                        background: overrideOpen
                                            ? `${targetColor}14`
                                            : 'var(--bg-raised)',
                                        border: `1px solid ${overrideOpen
                                            ? `${targetColor}30`
                                            : 'var(--border-subtle)'}`,
                                    }}
                                >
                                    <Zap
                                        size={13}
                                        strokeWidth={overrideOpen ? 2.2 : 1.8}
                                        style={{
                                            color:      overrideOpen ? targetColor : 'var(--text-muted)',
                                            transition: 'color 200ms ease',
                                        }}
                                    />
                                </div>

                                {/* Labels */}
                                <div className="flex flex-col gap-1.25 flex-1 min-w-0 text-left">
                                    <p style={{
                                        fontFamily:  'var(--font-display)',
                                        fontSize:    'clamp(0.64rem, 0.58rem + 0.18vw, 0.72rem)',
                                        fontWeight:  700,
                                        color:       'var(--text-primary)',
                                        lineHeight:  1,
                                    }}>
                                        Manual Override
                                    </p>
                                    <p style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize:   'clamp(0.48rem, 0.42rem + 0.13vw, 0.54rem)',
                                        color:      'var(--text-muted)',
                                        lineHeight: 1,
                                    }}>
                                        Switch to{' '}
                                        <strong style={{ color: targetColor, fontWeight: 700 }}>
                                            {targetMode}
                                        </strong>
                                    </p>
                                </div>

                                {/* Supervisor badge */}
                                <span
                                    className="hidden sm:flex items-center text-[0.46rem] tracking-[0.08em] uppercase font-bold px-2 py-0.75 rounded-full shrink-0"
                                    style={{
                                        fontFamily:  'var(--font-mono)',
                                        background:  'rgba(245,197,24,0.1)',
                                        borderColor: 'rgba(245,197,24,0.28)',
                                        border:      '1px solid rgba(245,197,24,0.28)',
                                        color:       '#f5c518',
                                    }}
                                >
                                    Supervisor
                                </span>

                                <ArrowLeftRight
                                    size={13}
                                    style={{
                                        color:      overrideOpen ? targetColor : 'var(--text-disabled)',
                                        flexShrink: 0,
                                        transition: 'color 200ms ease',
                                    }}
                                />
                            </button>

                            {/* Override form */}
                            {overrideOpen && (
                                <div
                                    className="flex flex-col gap-4 px-4 pt-4 pb-4"
                                    style={{
                                        borderTop:  `1px solid ${targetColor}18`,
                                        background: `linear-gradient(180deg, ${targetColor}04 0%, transparent 60%)`,
                                        animation:  'slide-in-up 160ms ease',
                                    }}
                                >
                                    {/* Framed from → to confirmation */}
                                    <div
                                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                                        style={{
                                            background: 'var(--bg-elevated)',
                                            border:     '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <div
                                            className="flex items-center justify-center rounded-lg shrink-0"
                                            style={{
                                                width:      22,
                                                height:     22,
                                                background: `${color}14`,
                                                border:     `1px solid ${color}28`,
                                            }}
                                        >
                                            <CurrentIcon size={11} strokeWidth={2} style={{ color }} />
                                        </div>
                                        <ModePill mode={currentMode} size="md" />
                                        <ArrowRight
                                            size={11}
                                            style={{ color: 'var(--text-disabled)', flexShrink: 0 }}
                                        />
                                        <ModePill mode={targetMode} size="md" />
                                        <div
                                            className="flex items-center justify-center rounded-lg shrink-0 ml-auto"
                                            style={{
                                                width:      22,
                                                height:     22,
                                                background: `${targetColor}14`,
                                                border:     `1px solid ${targetColor}28`,
                                            }}
                                        >
                                            <TargetIcon size={11} strokeWidth={2} style={{ color: targetColor }} />
                                        </div>
                                    </div>

                                    {/* Reason textarea */}
                                    <div className="flex flex-col gap-1.5">
                                        <label style={{
                                            fontFamily:    'var(--font-mono)',
                                            fontSize:      '0.5rem',
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            color:         'var(--text-muted)',
                                        }}>
                                            Reason{' '}
                                            <span style={{ color: 'var(--severity-high)' }}>*</span>
                                            {' '}— required for audit trail
                                        </label>
                                        <textarea
                                            autoFocus
                                            value={overrideReason}
                                            onChange={e => setOverrideReason(e.target.value)}
                                            placeholder="Describe the reason for this mode switch…"
                                            rows={3}
                                            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleOverride(); }}
                                            style={{
                                                width:        '100%',
                                                padding:      '10px 12px',
                                                background:   'var(--bg-elevated)',
                                                border:       `1px solid ${overrideReason.trim()
                                                    ? `${targetColor}45`
                                                    : 'var(--border-default)'}`,
                                                borderRadius: 10,
                                                fontFamily:   'var(--font-mono)',
                                                fontSize:     'clamp(0.58rem, 0.52rem + 0.18vw, 0.66rem)',
                                                lineHeight:   1.55,
                                                color:        'var(--text-primary)',
                                                resize:       'none',
                                                outline:      'none',
                                                boxSizing:    'border-box',
                                                transition:   'border-color 180ms ease',
                                            }}
                                        />
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={handleOverride}
                                            disabled={!overrideReason.trim()}
                                            className="flex-1 h-9 rounded-xl disabled:opacity-35 gap-1.5 transition-all duration-150"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   'clamp(0.54rem, 0.48rem + 0.16vw, 0.62rem)',
                                                fontWeight: 700,
                                                background: overrideReason.trim()
                                                    ? `${targetColor}18`
                                                    : 'transparent',
                                                border:     `1px solid ${overrideReason.trim()
                                                    ? `${targetColor}45`
                                                    : 'var(--border-default)'}`,
                                                color:      overrideReason.trim()
                                                    ? targetColor
                                                    : 'var(--text-disabled)',
                                                boxShadow:  overrideReason.trim()
                                                    ? `0 0 14px ${targetColor}18`
                                                    : 'none',
                                            }}
                                        >
                                            <ArrowLeftRight size={11} strokeWidth={2.5} />
                                            Confirm Override
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setOverrideOpen(false); setOverrideReason(''); }}
                                            className="h-9 px-4 rounded-xl"
                                            style={{
                                                fontFamily:  'var(--font-mono)',
                                                fontSize:    'clamp(0.54rem, 0.48rem + 0.16vw, 0.62rem)',
                                                color:       'var(--text-muted)',
                                                background:  'rgba(255,255,255,0.04)',
                                                border:      '1px solid var(--border-subtle)',
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>

                                    <p style={{
                                        fontFamily:    'var(--font-mono)',
                                        fontSize:      '0.46rem',
                                        letterSpacing: '0.04em',
                                        color:         'var(--text-disabled)',
                                        textAlign:     'center',
                                    }}>
                                        ⌘↵ to confirm
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ── No-permission state ── */
                        <div
                            className="flex items-center gap-3.5 px-4 py-4 rounded-2xl"
                            style={{
                                background: 'var(--bg-elevated)',
                                border:     '1px solid var(--border-subtle)',
                            }}
                        >
                            <div
                                className="flex items-center justify-center shrink-0 rounded-xl"
                                style={{
                                    width:      36,
                                    height:     36,
                                    background: 'rgba(255,255,255,0.03)',
                                    border:     '1px solid var(--border-subtle)',
                                }}
                            >
                                <Zap
                                    size={15}
                                    strokeWidth={1.6}
                                    style={{ color: 'var(--text-disabled)' }}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p style={{
                                    fontFamily:  'var(--font-display)',
                                    fontSize:    'clamp(0.62rem, 0.56rem + 0.18vw, 0.72rem)',
                                    fontWeight:  600,
                                    color:       'var(--text-secondary)',
                                    lineHeight:  1,
                                }}>
                                    Manual Override
                                </p>
                                <p style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize:   'clamp(0.5rem, 0.44rem + 0.13vw, 0.56rem)',
                                    color:      'var(--text-disabled)',
                                    lineHeight: 1.35,
                                }}>
                                    Requires supervisor access to switch modes
                                </p>
                            </div>
                            <span
                                className="ml-auto text-[0.44rem] tracking-[0.08em] uppercase font-bold px-2 py-0.75 rounded-full shrink-0"
                                style={{
                                    fontFamily:  'var(--font-mono)',
                                    background:  'rgba(255,255,255,0.04)',
                                    border:      '1px solid var(--border-subtle)',
                                    color:       'var(--text-disabled)',
                                }}
                            >
                                Locked
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

const NUMERIC_FIELDS = [
    { key: 'trafficVolume' as const, label: 'Traffic Volume', hint: 'Switches to Human-Validated when flow exceeds this', icon: Gauge, min: 500, max: 10_000, step: 500, unit: 'veh/h', danger: (v: number) => v >= 8000 },
    { key: 'aiConfidenceMin' as const, label: 'Min AI Confidence', hint: 'Drops to Human-Validated below this confidence level', icon: Brain, min: 10, max: 95, step: 5, unit: '%', danger: (v: number) => v >= 85 },
];
const BOOL_FIELDS = [
    { key: 'incidentActive'  as const, label: 'Active Incident',    hint: 'Force HV when any incident is active',      icon: AlertTriangle, color: 'var(--severity-high)'     },
    { key: 'weatherImpact'   as const, label: 'Weather Impact',     hint: 'Force HV during adverse weather',            icon: CloudRain,     color: 'var(--severity-medium)'   },
    { key: 'eventActive'     as const, label: 'Scheduled Event',    hint: 'Force HV during planned city events',        icon: CalendarDays,  color: 'var(--accent-primary)'    },
    { key: 'emergencyActive' as const, label: 'Emergency Declared', hint: 'Always force HV — overrides all thresholds', icon: Siren,         color: 'var(--severity-critical)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ThresholdsTab — redesigned
// Drop-in replacement. All props, state, and API call logic are unchanged.
// Only the JSX + style layer is updated.
// ─────────────────────────────────────────────────────────────────────────────

function ThresholdsTab({
                           thresholds,
                           onSaved,
                       }: {
    thresholds: ModeThresholds;
    onSaved:    (t: ModeThresholds) => void;
}) {
    const [local,  setLocal]  = useState({ ...thresholds });
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);
    const [error,  setError]  = useState<string | null>(null);

    useEffect(() => { startTransition(() => setLocal({ ...thresholds })); }, [thresholds]);
    const isDirty = JSON.stringify(local) !== JSON.stringify(thresholds);

    const save = async () => {
        setSaving(true); setError(null);
        try {
            const res = await fetch('/api/modes', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ thresholds: local }),
            });
            if (!res.ok) {
                setError(`HTTP ${res.status}`);
                return;
            }
            onSaved(local);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">

            {/* ══════════════════════════════════════════════════════════
                MAIN GRID — Sliders left · Conditions right
            ══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* ── Numeric Thresholds ── */}
                <div
                    className="flex flex-col overflow-hidden rounded-2xl"
                    style={{
                        background:  'var(--bg-raised)',
                        border:      '1px solid var(--border-default)',
                        boxShadow:   '0 2px 16px rgba(0,0,0,0.18)',
                    }}
                >
                    {/* Card header */}
                    <div
                        className="flex items-center gap-3 px-5 py-4"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                        <div
                            className="flex items-center justify-center shrink-0 rounded-xl"
                            style={{
                                width:      34,
                                height:     34,
                                background: 'rgba(59,158,255,0.10)',
                                border:     '1px solid rgba(59,158,255,0.22)',
                            }}
                        >
                            <Gauge size={15} strokeWidth={1.8} style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div className="flex flex-col gap-0.75 flex-1 min-w-0">
                            <p style={{
                                fontFamily:  'var(--font-display)',
                                fontSize:    'clamp(0.72rem, 0.64rem + 0.24vw, 0.84rem)',
                                fontWeight:  700,
                                color:       'var(--text-primary)',
                                lineHeight:  1,
                            }}>
                                Numeric Thresholds
                            </p>
                            <p style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.5rem, 0.44rem + 0.14vw, 0.56rem)',
                                color:      'var(--text-disabled)',
                                lineHeight: 1,
                            }}>
                                Quantitative trigger values for auto-transition
                            </p>
                        </div>
                    </div>

                    {/* Slider fields */}
                    <div className="flex flex-col gap-0 divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                        {NUMERIC_FIELDS.map((f, idx) => {
                            const val      = local[f.key] as number;
                            const isDanger = f.danger(val);
                            const Icon     = f.icon;
                            const pct      = ((val - f.min) / (f.max - f.min)) * 100;
                            const accentColor = isDanger ? 'var(--severity-high)' : 'var(--accent-primary)';

                            return (
                                <div
                                    key={f.key}
                                    className="flex flex-col gap-4 px-5 py-5 transition-colors duration-300"
                                    style={{
                                        background:  isDanger
                                            ? 'rgba(255,136,0,0.025)'
                                            : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                                        borderColor: 'var(--border-subtle)',
                                    }}
                                >
                                    {/* Label row */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Icon
                                                size={14}
                                                strokeWidth={isDanger ? 2.5 : 1.8}
                                                style={{
                                                    color:      accentColor,
                                                    flexShrink: 0,
                                                    transition: 'color 300ms ease',
                                                }}
                                            />
                                            <div className="flex flex-col gap-0.75 min-w-0">
                                                <span style={{
                                                    fontFamily: 'var(--font-display)',
                                                    fontSize:   'clamp(0.66rem, 0.6rem + 0.2vw, 0.76rem)',
                                                    fontWeight: 600,
                                                    color:      'var(--text-primary)',
                                                    lineHeight: 1,
                                                }}>
                                                    {f.label}
                                                </span>
                                                <span style={{
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize:   'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)',
                                                    color:      'var(--text-disabled)',
                                                    lineHeight: 1,
                                                }}>
                                                    {f.hint}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Value badge — single accent color, not double orange */}
                                        <div
                                            className="shrink-0 flex items-baseline gap-0.75 px-3 py-1.5 rounded-lg tabular-nums"
                                            style={{
                                                background:  isDanger
                                                    ? 'rgba(255,136,0,0.10)'
                                                    : 'rgba(59,158,255,0.08)',
                                                border:      `1px solid ${isDanger ? 'rgba(255,136,0,0.28)' : 'rgba(59,158,255,0.2)'}`,
                                                transition:  'all 300ms ease',
                                            }}
                                        >
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   'clamp(0.72rem, 0.64rem + 0.2vw, 0.84rem)',
                                                fontWeight: 800,
                                                color:      accentColor,
                                                lineHeight: 1,
                                                transition: 'color 300ms ease',
                                            }}>
                                                {val.toLocaleString()}
                                            </span>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   'clamp(0.44rem, 0.38rem + 0.1vw, 0.5rem)',
                                                color:      isDanger ? 'rgba(255,136,0,0.65)' : 'rgba(59,158,255,0.65)',
                                                lineHeight: 1,
                                            }}>
                                                {f.unit}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Slider + range labels */}
                                    <div className="flex flex-col gap-2">
                                        <Slider
                                            min={f.min}
                                            max={f.max}
                                            step={f.step}
                                            value={[val]}
                                            onValueChange={([v]) => setLocal(p => ({ ...p, [f.key]: v }))}
                                            className="w-full"
                                        />
                                        <div className="flex items-center justify-between">
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   'clamp(0.44rem, 0.38rem + 0.1vw, 0.5rem)',
                                                color:      'var(--text-disabled)',
                                            }}>
                                                {f.min.toLocaleString()} {f.unit}
                                            </span>
                                            {/* Midpoint fill indicator */}
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   '0.44rem',
                                                color:      'var(--text-disabled)',
                                            }}>
                                                {Math.round(pct)}%
                                            </span>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   'clamp(0.44rem, 0.38rem + 0.1vw, 0.5rem)',
                                                color:      'var(--text-disabled)',
                                            }}>
                                                {f.max.toLocaleString()} {f.unit}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Danger warning strip — only appears when triggered */}
                                    {isDanger && (
                                        <div
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                                            style={{
                                                background: 'rgba(255,136,0,0.06)',
                                                border:     '1px solid rgba(255,136,0,0.18)',
                                                animation:  'slide-in-up 200ms ease',
                                            }}
                                        >
                                            <AlertTriangle size={11} strokeWidth={2} style={{ color: 'var(--severity-high)', flexShrink: 0 }} />
                                            <span style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize:   'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)',
                                                color:      'var(--severity-high)',
                                                lineHeight: 1.4,
                                            }}>
                                                Value is in the high-risk range — verify intent before saving
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Condition Overrides ── */}
                <div
                    className="flex flex-col overflow-hidden rounded-2xl"
                    style={{
                        background: 'var(--bg-raised)',
                        border:     '1px solid var(--border-default)',
                        boxShadow:  '0 2px 16px rgba(0,0,0,0.18)',
                    }}
                >
                    {/* Card header */}
                    <div
                        className="flex items-center gap-3 px-5 py-4"
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                        <div
                            className="flex items-center justify-center shrink-0 rounded-xl"
                            style={{
                                width:      34,
                                height:     34,
                                background: 'rgba(255,136,0,0.10)',
                                border:     '1px solid rgba(255,136,0,0.22)',
                            }}
                        >
                            <AlertTriangle size={15} strokeWidth={1.8} style={{ color: 'var(--severity-high)' }} />
                        </div>
                        <div className="flex flex-col gap-0.75 flex-1 min-w-0">
                            <p style={{
                                fontFamily:  'var(--font-display)',
                                fontSize:    'clamp(0.72rem, 0.64rem + 0.24vw, 0.84rem)',
                                fontWeight:  700,
                                color:       'var(--text-primary)',
                                lineHeight:  1,
                            }}>
                                Condition Overrides
                            </p>
                            <p style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.5rem, 0.44rem + 0.14vw, 0.56rem)',
                                color:      'var(--text-disabled)',
                                lineHeight: 1,
                            }}>
                                Force Human-Validated when these conditions are active
                            </p>
                        </div>
                    </div>

                    {/* Condition rows */}
                    <div className="flex flex-col gap-0 divide-y p-3" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                        {BOOL_FIELDS.map(f => {
                            const val    = local[f.key] as boolean;
                            const Icon   = f.icon;
                            const isLast = BOOL_FIELDS[BOOL_FIELDS.length - 1].key === f.key;

                            return (
                                <div
                                    key={f.key}
                                    className="flex items-center gap-3.5 px-3 py-3.5 rounded-xl transition-all duration-300 cursor-pointer group"
                                    onClick={() => setLocal(p => ({ ...p, [f.key]: !val }))}
                                    style={{
                                        background:   val
                                            ? `linear-gradient(135deg, ${f.color}0a 0%, ${f.color}04 100%)`
                                            : 'transparent',
                                        border:       `1px solid ${val ? `${f.color}22` : 'transparent'}`,
                                        marginBottom: isLast ? 0 : 4,
                                    }}
                                >
                                    {/* Icon box */}
                                    <div
                                        className="flex items-center justify-center shrink-0 rounded-xl transition-all duration-300"
                                        style={{
                                            width:      38,
                                            height:     38,
                                            background: val
                                                ? `${f.color}16`
                                                : 'var(--bg-elevated)',
                                            border:     `1px solid ${val ? `${f.color}32` : 'var(--border-subtle)'}`,
                                            boxShadow:  val ? `0 0 12px ${f.color}20` : 'none',
                                        }}
                                    >
                                        <Icon
                                            size={16}
                                            strokeWidth={val ? 2.2 : 1.6}
                                            style={{
                                                color:      val ? f.color : 'var(--text-muted)',
                                                transition: 'all 300ms ease',
                                            }}
                                        />
                                    </div>

                                    {/* Text */}
                                    <div className="flex flex-col gap-1.25 flex-1 min-w-0">
                                        <p style={{
                                            fontFamily:  'var(--font-display)',
                                            fontSize:    'clamp(0.64rem, 0.58rem + 0.18vw, 0.74rem)',
                                            fontWeight:  600,
                                            color:       val ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            lineHeight:  1,
                                            transition:  'color 300ms ease',
                                        }}>
                                            {f.label}
                                        </p>
                                        <p style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize:   'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)',
                                            color:      'var(--text-disabled)',
                                            lineHeight: 1.4,
                                        }}>
                                            {f.hint}
                                        </p>
                                    </div>

                                    {/* Status chip + toggle */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Active label — only when on */}
                                        {val && (
                                            <span
                                                className="text-[0.44rem] tracking-widest uppercase font-bold px-1.5 py-0.5 rounded-full"
                                                style={{
                                                    background: `${f.color}14`,
                                                    color:      f.color,
                                                    fontFamily: 'var(--font-mono)',
                                                    border:     `1px solid ${f.color}28`,
                                                    animation:  'slide-in-up 200ms ease',
                                                }}
                                            >
                                                Active
                                            </span>
                                        )}
                                        <Toggle
                                            checked={val}
                                            onChange={v => setLocal(p => ({ ...p, [f.key]: v }))}
                                            color={f.color}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Active count footer */}
                    {(() => {
                        const activeCount = BOOL_FIELDS.filter(f => local[f.key]).length;
                        return activeCount > 0 ? (
                            <div
                                className="mx-3 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                                style={{
                                    background: 'rgba(255,136,0,0.05)',
                                    border:     '1px solid rgba(255,136,0,0.14)',
                                }}
                            >
                                <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                                     style={{ background: 'var(--severity-high)' }} />
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize:   'clamp(0.5rem, 0.44rem + 0.12vw, 0.56rem)',
                                    color:      'var(--severity-high)',
                                    lineHeight: 1,
                                }}>
                                    {activeCount} override{activeCount !== 1 ? 's' : ''} forcing Human-Validated mode
                                </span>
                            </div>
                        ) : null;
                    })()}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SAVE / RESET BAR
            ══════════════════════════════════════════════════════════ */}

            {/* Unsaved / error bar */}
            {(isDirty || error) && (
                <div
                    className="flex flex-wrap items-center gap-3 px-4 py-3.5 rounded-2xl"
                    style={{
                        background: error
                            ? 'rgba(255,59,59,0.05)'
                            : 'linear-gradient(135deg, rgba(59,158,255,0.06) 0%, rgba(59,158,255,0.02) 100%)',
                        border:     `1px solid ${error ? 'rgba(255,59,59,0.22)' : 'rgba(59,158,255,0.2)'}`,
                        boxShadow:  error ? 'none' : '0 0 20px rgba(59,158,255,0.06)',
                        animation:  'slide-in-up 180ms ease',
                    }}
                >
                    {/* Status icon + label */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {error ? (
                            <AlertTriangle size={13} strokeWidth={2} style={{ color: 'var(--severity-critical)', flexShrink: 0 }} />
                        ) : (
                            <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                    background: 'var(--accent-primary)',
                                    boxShadow:  '0 0 6px rgba(59,158,255,0.6)',
                                    animation:  'pulse-dot 1.8s ease infinite',
                                }}
                            />
                        )}
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.54rem, 0.48rem + 0.14vw, 0.62rem)',
                            color:      error ? 'var(--severity-critical)' : 'var(--accent-primary)',
                            fontWeight: 600,
                        }}>
                            {error ?? 'Unsaved changes'}
                        </span>
                        {!error && (
                            <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize:   'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)',
                                color:      'var(--text-disabled)',
                            }}>
                                — review before saving
                            </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setLocal({ ...thresholds }); setError(null); }}
                            disabled={saving}
                            className="h-8.5 px-3 gap-1.5 rounded-xl transition-all duration-150"
                            style={{
                                fontFamily:  'var(--font-mono)',
                                fontSize:    'clamp(0.52rem, 0.46rem + 0.13vw, 0.6rem)',
                                color:       'var(--text-muted)',
                                background:  'rgba(255,255,255,0.04)',
                                border:      '1px solid var(--border-subtle)',
                            }}
                        >
                            <RotateCcw size={11} strokeWidth={2} />
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            onClick={save}
                            disabled={saving || !isDirty}
                            className="h-8.5 px-4 gap-1.5 rounded-xl disabled:opacity-40 transition-all duration-150"
                            style={{
                                fontFamily:  'var(--font-mono)',
                                fontSize:    'clamp(0.52rem, 0.46rem + 0.13vw, 0.6rem)',
                                background:  'rgba(59,158,255,0.14)',
                                border:      '1px solid rgba(59,158,255,0.38)',
                                color:       'var(--accent-primary)',
                                boxShadow:   saving ? 'none' : '0 0 12px rgba(59,158,255,0.18)',
                            }}
                        >
                            {saving
                                ? <><Loader2 size={11} strokeWidth={2} className="animate-spin" /> Saving…</>
                                : <><Save size={11} strokeWidth={2} /> Save thresholds</>
                            }
                        </Button>
                    </div>
                </div>
            )}

            {/* Saved confirmation banner */}
            {saved && (
                <div
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                    style={{
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 100%)',
                        border:     '1px solid rgba(34,197,94,0.24)',
                        boxShadow:  '0 0 20px rgba(34,197,94,0.07)',
                        animation:  'slide-in-up 180ms ease',
                    }}
                >
                    <div
                        className="flex items-center justify-center shrink-0 rounded-lg"
                        style={{
                            width:      28,
                            height:     28,
                            background: 'rgba(34,197,94,0.14)',
                            border:     '1px solid rgba(34,197,94,0.28)',
                        }}
                    >
                        <CheckCircle2 size={14} strokeWidth={2.2} style={{ color: 'var(--status-online)' }} />
                    </div>
                    <div className="flex flex-col gap-0.75">
                        <span style={{
                            fontFamily: 'var(--font-display)',
                            fontSize:   'clamp(0.62rem, 0.56rem + 0.18vw, 0.72rem)',
                            fontWeight: 600,
                            color:      'var(--status-online)',
                            lineHeight: 1,
                        }}>
                            Thresholds saved
                        </span>
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize:   'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)',
                            color:      'rgba(34,197,94,0.6)',
                            lineHeight: 1,
                        }}>
                            Takes effect on next evaluation cycle
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: HISTORY
// ─────────────────────────────────────────────────────────────────────────────

function HistoryTab({ transitions }: { transitions: ModeTransition[] }) {
    const [filter,   setFilter]   = useState<'all' | 'auto' | 'manual'>('all');
    const [expanded, setExpanded] = useState<string | null>(null);

    const filtered = useMemo(() => (filter === 'all' ? transitions : transitions.filter(t => t.triggeredBy === filter)).slice(0, 100), [transitions, filter]);

    if (transitions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-24" style={{ color: 'var(--text-disabled)' }}>
                <div className="flex items-center justify-center w-12 h-12 rounded-full"
                     style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                    <History size={20} strokeWidth={1.5} style={{ opacity: 0.4 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.58rem, 0.52rem + 0.18vw, 0.66rem)', letterSpacing: '0.06em' }}>
                    No transitions recorded this session
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.25">
                    {(['all', 'auto', 'manual'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className="rounded-lg transition-all duration-150 whitespace-nowrap"
                                style={{ height: 26, padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.5rem, 0.44rem + 0.14vw, 0.56rem)', letterSpacing: '0.07em', textTransform: 'uppercase', background: filter === f ? 'rgba(59,158,255,0.12)' : 'transparent', border: `1px solid ${filter === f ? 'rgba(59,158,255,0.35)' : 'var(--border-default)'}`, color: filter === f ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
                            {f}
                        </button>
                    ))}
                </div>
                <Badge variant="outline" style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.46rem, 0.4rem + 0.12vw, 0.52rem)', fontWeight: 700, background: 'transparent', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                    {filtered.length} of {transitions.length}
                </Badge>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 480 }}>
                    <Table style={{ minWidth: 580 }}>
                        <TableHeader className="sticky top-0 z-10">
                            <TableRow className="hover:bg-transparent" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                                {[{ label: 'Time', w: 96 }, { label: 'Transition', w: 140 }, { label: 'Trigger', w: 90 }, { label: 'Reason' }, { label: 'Operator', w: 100 }].map(col => (
                                    <TableHead key={col.label} className="py-3 px-4 whitespace-nowrap" style={{ width: col.w, fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.46rem, 0.4rem + 0.12vw, 0.52rem)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                        {col.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((t, i) => {
                                const isOpen = expanded === `${t.id}-${i}`;
                                const isLast = i === filtered.length - 1;
                                return (
                                    <React.Fragment key={`${t.id}-${i}`}>
                                        <TableRow className="group cursor-pointer transition-colors duration-150 hover:bg-[rgba(255,255,255,0.025)]"
                                                  onClick={() => setExpanded(isOpen ? null : `${t.id}-${i}`)}
                                                  style={{ borderBottom: isLast && !isOpen ? 'none' : '1px solid var(--border-subtle)', background: i === 0 ? 'rgba(59,158,255,0.015)' : 'transparent' }}>
                                            <TableCell className="py-2.5 pl-4 pr-3 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.75">
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.52rem, 0.46rem + 0.14vw, 0.6rem)', color: 'var(--text-secondary)', lineHeight: 1 }}>{fmtTime(t.triggeredAt)}</span>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.44rem, 0.38rem + 0.12vw, 0.5rem)', color: 'var(--text-disabled)', lineHeight: 1 }}>{fmtDate(t.triggeredAt)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <ModePill mode={t.from} /><ArrowRight size={10} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} /><ModePill mode={t.to} />
                                                    {i === 0 && <Badge variant="outline" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', background: 'rgba(59,158,255,0.08)', borderColor: 'rgba(59,158,255,0.22)', color: 'var(--accent-primary)' }}>Latest</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-3 whitespace-nowrap">
                                                <Badge variant="outline" className="flex items-center gap-1 h-4.75 px-1.75"
                                                       style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.44rem, 0.38rem + 0.12vw, 0.5rem)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: t.triggeredBy === 'auto' ? 'rgba(124,106,247,0.08)' : 'rgba(34,197,94,0.08)', borderColor: t.triggeredBy === 'auto' ? 'rgba(124,106,247,0.22)' : 'rgba(34,197,94,0.22)', color: t.triggeredBy === 'auto' ? 'var(--accent-secondary)' : 'var(--status-online)' }}>
                                                    {t.triggeredBy === 'auto' ? <Cpu size={8} strokeWidth={2} /> : <User size={8} strokeWidth={2} />}
                                                    {t.triggeredBy}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`flex-1 min-w-0 leading-snug ${!isOpen ? 'line-clamp-1' : ''}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.52rem, 0.46rem + 0.14vw, 0.6rem)', color: 'var(--text-secondary)' }}>
                                                        {t.reason}
                                                    </span>
                                                    {isOpen ? <ChevronDown size={11} className="shrink-0" style={{ color: 'var(--text-disabled)' }} /> : <ChevronRightIcon size={11} className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-disabled)' }} />}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-3 pr-4 whitespace-nowrap">
                                                {t.operatorId
                                                    ? <div className="flex items-center gap-1.25"><User size={10} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.5rem, 0.44rem + 0.14vw, 0.58rem)', color: 'var(--text-secondary)' }}>{t.operatorId}</span></div>
                                                    : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.5rem, 0.44rem + 0.14vw, 0.58rem)', color: 'var(--text-disabled)' }}>System</span>
                                                }
                                            </TableCell>
                                        </TableRow>
                                        {isOpen && (
                                            <TableRow className="hover:bg-transparent" style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                                                <TableCell className="py-0 pl-4 pr-3" />
                                                <TableCell colSpan={4} className="py-0 pl-0 pr-4 pb-3">
                                                    <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl"
                                                         style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid var(--border-subtle)', borderLeft: `2px solid ${MODE_COLOR[t.to]}50`, animation: 'slide-in-up 150ms ease' }}>
                                                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.58rem, 0.52rem + 0.16vw, 0.66rem)', color: 'var(--text-primary)', lineHeight: 1.45, margin: 0 }}>{t.reason}</p>
                                                        <div className="flex flex-wrap gap-x-5">
                                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.44rem, 0.38rem + 0.12vw, 0.5rem)', color: 'var(--text-disabled)' }}>ID: {t.id}</span>
                                                            {t.operatorId && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.44rem, 0.38rem + 0.12vw, 0.5rem)', color: 'var(--text-disabled)' }}>Operator: {t.operatorId}</span>}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: ANALYTICS — Daily Traffic Summary + Peak Hours + Incident Count + Export
// ─────────────────────────────────────────────────────────────────────────────

function DeltaBadge({ value }: { value: number }) {
    const isPos = value >= 0;
    const Icon  = isPos ? ArrowUpRight : ArrowDownRight;
    return (
        <span className="flex items-center gap-0.5 text-[0.48rem] font-semibold"
              style={{ color: isPos ? 'var(--severity-high)' : 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>
            <Icon size={9} strokeWidth={2.5} />
            {Math.abs(value)}% vs yesterday
        </span>
    );
}

function KpiCard({ label, value, sub, color, icon: Icon, delta }: {
    label:  string;
    value:  string;
    sub?:   string;
    color?: string;
    icon:   React.ElementType;
    delta?: number;
}) {
    return (
        <div className="flex flex-col gap-2 p-4 rounded-xl"
             style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center justify-center rounded-lg"
                     style={{ width: 28, height: 28, background: color ? `${color}14` : 'var(--bg-elevated)', border: `1px solid ${color ? `${color}28` : 'var(--border-subtle)'}` }}>
                    <Icon size={13} strokeWidth={2} style={{ color: color ?? 'var(--text-muted)' }} />
                </div>
                {delta !== undefined && <DeltaBadge value={delta} />}
            </div>
            <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 0.9rem + 0.7vw, 1.4rem)', fontWeight: 800, color: color ?? 'var(--text-primary)', lineHeight: 1 }}>
                    {value}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.48rem, 0.42rem + 0.14vw, 0.54rem)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 3, lineHeight: 1 }}>
                    {label}
                </p>
                {sub && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.46rem, 0.4rem + 0.12vw, 0.52rem)', color: 'var(--text-disabled)', marginTop: 2 }}>
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

function HourlyChart({ data }: { data: number[] }) {
    const peak = Math.max(...data);
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}`);

    return (
        <div>
            <div className="flex items-end gap-0.75 h-20">
                {data.map((v, i) => {
                    const pct        = v / peak;
                    const isPeak     = v === peak;
                    const isEvening  = i >= 17 && i <= 18;
                    const isMorning  = i >= 7 && i <= 8;
                    const barColor   = isPeak || isMorning || isEvening ? 'var(--severity-high)' : v > 60 ? 'var(--severity-medium)' : 'var(--accent-primary)';

                    return (
                        <Tooltip key={i}>
                            <TooltipTrigger asChild>
                                <div className="flex-1 rounded-sm transition-all duration-300 cursor-default relative group"
                                     style={{ height: `${Math.max(4, pct * 100)}%`, background: barColor, opacity: 0.7 }}>
                                    {isPeak && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: 'var(--severity-critical)' }} />
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                                {hours[i]}:00 — {v}% volume
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
            {/* Hour labels — show every 4h */}
            <div className="flex items-center mt-1" style={{ gap: 0 }}>
                {hours.map((h, i) => (
                    <div key={i} className="flex-1 text-center">
                        {i % 4 === 0 && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--text-disabled)' }}>{h}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function IncidentCountCard({ counts }: { counts: ReturnType<typeof useDailyTrafficData>['incidentCounts'] }) {
    const severities: Array<{ key: keyof typeof counts; label: string; icon: React.ElementType }> = [
        { key: 'critical', label: 'Critical', icon: AlertTriangle },
        { key: 'high',     label: 'High',     icon: Flame         },
        { key: 'medium',   label: 'Medium',   icon: AlertCircle   },
        { key: 'low',      label: 'Low',      icon: Info          },
        { key: 'info',     label: 'Info',     icon: Radio         },
    ];

    return (
        <div className="flex flex-col gap-2">
            {severities.map(({ key, label, icon: Icon }) => {
                const count = counts[key] as number;
                const pct   = Math.round((count / counts.total) * 100);
                const color = SEVERITY_COLORS[key];
                return (
                    <div key={key} className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-20 shrink-0">
                            <Icon size={11} strokeWidth={2} style={{ color, flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.5rem, 0.44rem + 0.12vw, 0.56rem)', color: 'var(--text-muted)' }}>
                                {label}
                            </span>
                        </div>
                        <div className="flex-1">
                            <Progress value={pct}
                                      className="h-1.25"
                                      style={{ background: `${color}18`, '--progress-foreground': color } as React.CSSProperties} />
                        </div>
                        <span className="w-8 text-right tabular-nums shrink-0"
                              style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.54rem, 0.48rem + 0.14vw, 0.62rem)', fontWeight: 700, color }}>
                            {count}
                        </span>
                        <span className="w-8 text-right shrink-0"
                              style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.44rem, 0.38rem + 0.12vw, 0.5rem)', color: 'var(--text-disabled)' }}>
                            {pct}%
                        </span>
                    </div>
                );
            })}
            <div className="mt-1 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Total incidents today
                </span>
                <span className="flex items-center gap-1.5">
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.9rem, 0.78rem + 0.4vw, 1.1rem)', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {counts.total}
                    </span>
                    <DeltaBadge value={counts.deltaVsYesterday} />
                </span>
            </div>
        </div>
    );
}

function PeakHoursLog({ peaks }: { peaks: ReturnType<typeof useDailyTrafficData>['peakHours'] }) {
    return (
        <div className="flex flex-col gap-2">
            {peaks.map((peak, i) => {
                const modeColor = MODE_COLOR[peak.mode];
                const severity  = peak.incidents > 15 ? 'critical' : peak.incidents > 8 ? 'high' : 'medium';
                const incColor  = SEVERITY_COLORS[severity];

                return (
                    <div key={i} className="flex items-stretch gap-3 p-3 rounded-xl"
                         style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderLeft: `3px solid ${incColor}` }}>
                        {/* Time badge */}
                        <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 px-2 rounded-lg"
                             style={{ background: `${incColor}08`, border: `1px solid ${incColor}20`, minWidth: 60 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 700, color: incColor, lineHeight: 1 }}>
                                {peak.start}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>
                                –{peak.end}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.62rem, 0.56rem + 0.18vw, 0.72rem)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {peak.label}
                                </span>
                                <ModePill mode={peak.mode} />
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1">
                                    <Car size={9} strokeWidth={2} style={{ color: 'var(--text-disabled)' }} />
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)', color: 'var(--text-muted)' }}>
                                        Volume: <strong style={{ color: 'var(--text-primary)' }}>{peak.volume}%</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <AlertCircle size={9} strokeWidth={2} style={{ color: incColor }} />
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)', color: incColor, fontWeight: 600 }}>
                                        {peak.incidents} incidents
                                    </span>
                                </div>
                            </div>
                            {/* Volume bar */}
                            <Progress value={peak.volume} className="h-0.75"
                                      style={{ background: `${modeColor}15`, '--progress-foreground': modeColor } as React.CSSProperties} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function AnalyticsTab({ transitions }: { transitions: ModeTransition[] }) {
    const { hourlyVolume, summary, incidentCounts, peakHours } = useDailyTrafficData();
    const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

    const handleCSV = () => {
        setExporting('csv');
        const csv = buildCSV(transitions);
        downloadCSV(csv, `atms-audit-${new Date().toISOString().slice(0, 10)}.csv`);
        setTimeout(() => setExporting(null), 800);
    };

    const handlePDF = () => {
        setExporting('pdf');
        downloadPDF(transitions, summary, incidentCounts);
        setTimeout(() => setExporting(null), 800);
    };

    const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="flex flex-col gap-4">

            {/* ── Header row: date + export buttons ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Calendar size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.52rem, 0.46rem + 0.14vw, 0.6rem)', color: 'var(--text-muted)' }}>
                        {today}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleCSV} disabled={exporting !== null}
                            className="h-7.5 gap-1.5 text-[0.56rem] tracking-[0.05em] font-semibold transition-all"
                            style={{ fontFamily: 'var(--font-mono)', background: 'rgba(80,200,120,0.08)', borderColor: 'rgba(80,200,120,0.3)', color: 'var(--status-online)' }}>
                        {exporting === 'csv' ? <CheckCircle2 size={11} strokeWidth={2.5} /> : <FileDown size={11} strokeWidth={2} />}
                        Export CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePDF} disabled={exporting !== null}
                            className="h-7.5 gap-1.5 text-[0.56rem] tracking-[0.05em] font-semibold transition-all"
                            style={{ fontFamily: 'var(--font-mono)', background: 'rgba(59,158,255,0.08)', borderColor: 'rgba(59,158,255,0.3)', color: 'var(--accent-primary)' }}>
                        {exporting === 'pdf' ? <CheckCircle2 size={11} strokeWidth={2.5} /> : <FileText size={11} strokeWidth={2} />}
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* ── KPI cards row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard label="Vehicles Today"  value={summary.totalVehicles.toLocaleString()} icon={Car}           color="var(--accent-primary)"    delta={summary.comparedYesterday} />
                <KpiCard label="Avg Speed"        value={`${summary.avgSpeedKmh} km/h`}          icon={Activity}      color="var(--status-online)"                                       sub="City-wide" />
                <KpiCard label="Congestion Index" value={`${summary.congestionIndex}`}            icon={Gauge}         color={summary.congestionIndex > 70 ? 'var(--severity-high)' : 'var(--severity-medium)'} sub="out of 100" />
                <KpiCard label="Total Incidents"  value={String(incidentCounts.total)}            icon={AlertTriangle} color="var(--severity-high)"     delta={incidentCounts.deltaVsYesterday} />
            </div>

            {/* ── Two-column middle ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* 24-hour traffic chart */}
                <SectionCard title="24-Hour Traffic Volume" subtitle={`Peak: ${summary.peakVolumeHour} · ${summary.peakVolumePct}% capacity`} icon={BarChart3} iconColor="var(--accent-primary)">
                    <HourlyChart data={hourlyVolume} />
                    <div className="flex items-center gap-4 mt-4 flex-wrap">
                        {[
                            { color: 'var(--severity-high)',   label: 'High volume'   },
                            { color: 'var(--severity-medium)', label: 'Moderate'      },
                            { color: 'var(--accent-primary)',  label: 'Normal'        },
                        ].map(l => (
                            <div key={l.label} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: l.color, opacity: 0.8 }} />
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-disabled)' }}>{l.label}</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Incident breakdown */}
                <SectionCard title="Incident Count" subtitle={`${incidentCounts.total} total · ${incidentCounts.critical} critical`} icon={AlertTriangle} iconColor="var(--severity-high)">
                    <IncidentCountCard counts={incidentCounts} />
                </SectionCard>
            </div>

            {/* ── Peak hours event log (full width) ── */}
            <SectionCard title="Peak Hours Log" subtitle="High-activity windows with incident density and operating mode" icon={Clock} iconColor="var(--severity-medium)">
                <PeakHoursLog peaks={peakHours} />
            </SectionCard>

            {/* ── Audit export note ── */}
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
                 style={{ background: 'rgba(59,158,255,0.04)', border: '1px solid rgba(59,158,255,0.15)' }}>
                <Download size={13} strokeWidth={2} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 1 }} />
                <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.52rem, 0.46rem + 0.14vw, 0.6rem)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <strong style={{ color: 'var(--accent-primary)' }}>Audit exports</strong> include all mode transitions for this session, daily KPIs, and incident counts.
                        CSV exports are suitable for spreadsheet analysis. PDF opens in a new tab for direct printing.
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.48rem, 0.42rem + 0.12vw, 0.54rem)', color: 'var(--text-disabled)', marginTop: 4 }}>
                        {transitions.length} transition record{transitions.length !== 1 ? 's' : ''} available · Report date: {today}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ModesPage() {
    const { thresholds, transitions, currentMode } = useMode();
    const [localThresholds, setLocalThresholds]    = useState(thresholds);
    const color = MODE_COLOR[currentMode];

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>

                {/* ── Page header ── */}
                <header className="shrink-0 w-full px-5 pt-5 pb-4 flex items-center gap-4"
                        style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-center shrink-0 rounded-xl"
                         style={{ width: 40, height: 40, background: `${color}12`, border: `1px solid ${color}30`, boxShadow: `0 0 14px ${color}14` }}>
                        <Settings2 size={18} strokeWidth={2} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 0.85rem + 0.5vw, 1.2rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>
                            Mode Control
                        </h1>
                        <p className="truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.52rem, 0.46rem + 0.16vw, 0.6rem)', color: 'var(--text-muted)' }}>
                            Configure thresholds, auto-transition rules, manual overrides · Daily traffic analytics &amp; audit exports
                        </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg shrink-0"
                         style={{ background: MODE_BG[currentMode], border: `1px solid ${MODE_BORDER[currentMode]}` }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, animation: 'pulse-dot 1.5s ease infinite' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.5rem, 0.44rem + 0.14vw, 0.56rem)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color, whiteSpace: 'nowrap' }}>
                        {currentMode === 'AI-Prioritized' ? 'AI' : 'HV'} Active
                    </span>
                    </div>
                </header>

                {/* ── Live status band ── */}
                <LiveBand />

                {/* ── Tabs ── */}
                <Tabs defaultValue="status" className="flex flex-col flex-1 overflow-hidden min-h-0">
                    <div className="shrink-0 px-5 pt-3 pb-0"
                         style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border-default)' }}>
                        <TabsList className="w-full h-9 rounded-xl p-0.75 gap-0.75"
                                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                            {[
                                { value: 'status',     label: 'Status',     Icon: Activity,  badge: undefined },
                                { value: 'thresholds', label: 'Thresholds', Icon: Settings2, badge: undefined },
                                { value: 'history',    label: 'History',    Icon: History,   badge: transitions.length },
                                { value: 'analytics',  label: 'Analytics',  Icon: BarChart3, badge: undefined, accent: true },
                            ].map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value}
                                             className="flex-1 h-7.5 flex items-center justify-center gap-1.5 tracking-[0.06em] uppercase rounded-[9px] data-[state=active]:bg-(--bg-overlay) data-[state=active]:text-(--text-primary) data-[state=active]:shadow-[0_1px_6px_rgba(0,0,0,0.35)] text-(--text-muted) transition-all duration-200"
                                             style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(0.54rem, 0.48rem + 0.18vw, 0.64rem)' }}>
                                    <tab.Icon size={12} strokeWidth={2} style={tab.accent ? { color: 'var(--severity-medium)' } : {}} />
                                    <span className="hidden xs:inline">{tab.label}</span>
                                    {tab.badge !== undefined && tab.badge > 0 && (
                                        <Badge variant="outline" className="h-3.75 px-1.5 leading-none rounded-full"
                                               style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', fontWeight: 700, background: 'rgba(59,158,255,0.12)', borderColor: 'rgba(59,158,255,0.3)', color: 'var(--accent-primary)' }}>
                                            {tab.badge}
                                        </Badge>
                                    )}
                                    {tab.accent && (
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--severity-medium)', boxShadow: '0 0 4px var(--severity-medium)' }} />
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden min-h-0">
                        <TabsContent value="status" className="h-full mt-0 data-[state=inactive]:hidden">
                            <ScrollArea className="h-full">
                                <div className="px-5 py-5 w-full"><StatusTab /></div>
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="thresholds" className="h-full mt-0 data-[state=inactive]:hidden">
                            <ScrollArea className="h-full">
                                <div className="px-5 py-5 w-full">
                                    <ThresholdsTab thresholds={localThresholds} onSaved={setLocalThresholds} />
                                </div>
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="history" className="h-full mt-0 data-[state=inactive]:hidden">
                            <ScrollArea className="h-full">
                                <div className="px-5 py-5 w-full"><HistoryTab transitions={transitions} /></div>
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="analytics" className="h-full mt-0 data-[state=inactive]:hidden">
                            <ScrollArea className="h-full">
                                <div className="px-5 py-5 w-full"><AnalyticsTab transitions={transitions} /></div>
                            </ScrollArea>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </TooltipProvider>
    );
}