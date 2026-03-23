'use client';

/**
 * Incident Management Screen — v2 (Refined)
 * ───────────────────────────────────────────
 * Implements the "Select, Then Act" paradigm from the refined spec.
 *
 * Zone A  — IncidentHeader        (sticky, severity-tinted)
 * Zone B  — InteractiveMap        (60% width, map slot)
 * Zone C  — ContextualActionBar   (dynamic — 3 states driven by selectedEntity)
 * Zone D  — ResponderStrip        (horizontal scrollable cards)
 * Zone E  — LifecycleTimeline     (collapsed progress bar → expandable feed)
 *
 * Next.js API routes (Node.js backend):
 *   POST   /api/incidents/[id]/confirm
 *   POST   /api/incidents/[id]/recommendations/[recId]/approve
 *   POST   /api/incidents/[id]/recommendations/[recId]/reject
 *   POST   /api/incidents/[id]/traffic/reroute
 *   POST   /api/incidents/[id]/signals/adjust
 *   POST   /api/incidents/[id]/responders/[rspId]/dispatch
 *   PATCH  /api/incidents/[id]/responders/[rspId]/route
 *   PATCH  /api/incidents/[id]/status
 *   POST   /api/incidents/[id]/escalate
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    AlertTriangle, Flame, CheckCircle2, Clock, MapPin,
    ChevronUp, ChevronDown, ChevronRight, ArrowRight,
    Zap, Navigation, ShieldAlert, HeartPulse, Truck,
    Car, Radio, TrendingDown, Activity, BarChart3, Users,
    CircleDot, Check, X, Edit3, Siren, RefreshCw,
    Route, Signal, Timer, Loader2, Send, Phone,
    Crosshair, Eye, TriangleAlert, MapPinned, Gauge,
    ArrowUpRight, Star, WifiOff, Wifi, Bot,
    MoreHorizontal, Maximize2,
} from 'lucide-react';
import { Badge }      from '@/components/ui/badge';
import { Button }     from '@/components/ui/button';
import { Progress }   from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IncidentStatus   = 'detected' | 'confirmed' | 'responding' | 'resolving' | 'cleared';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ResponderStatus  = 'en_route' | 'arrived' | 'pending' | 'dispatched';
export type EntityType       = 'incident' | 'responder' | null;

export interface SelectedEntity {
    type: EntityType;
    id:   string | null;
}

export interface AIRecommendation {
    id:         string;
    type:       'route' | 'dispatch' | 'signal' | 'escalate';
    action:     string;
    detail:     string;
    confidence: number;
    impact:     string;
    eta:        string;
    status:     'pending' | 'approved' | 'rejected' | 'in_progress';
}

export interface Responder {
    id:       string;
    name:     string;
    type:     'police' | 'ambulance' | 'tow' | 'fire';
    status:   ResponderStatus;
    eta:      number | null;
    distance: string;
    badge:    string;
}

export interface TimelineEvent {
    id:        string;
    time:      Date;
    label:     string;
    detail?:   string;
    type:      'ai' | 'operator' | 'system' | 'responder';
    actor?:    string;
    completed: boolean;
}

export interface Incident {
    id:               string;
    name:             string;
    location:         string;
    zone:             string;
    severity:         IncidentSeverity;
    status:           IncidentStatus;
    detectedAt:       Date;
    confidence:       number;
    vehiclesAffected: number;
    avgDelay:         number;
    congestionIndex:  number;
    clearanceEta:     number;
    recommendations:  AIRecommendation[];
    responders:       Responder[];
    timeline:         TimelineEvent[];
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const SEV: Record<IncidentSeverity, { color: string; bg: string; border: string; label: string }> = {
    critical: { color: '#ff3b3b', bg: 'rgba(255,59,59,0.07)',  border: 'rgba(255,59,59,0.28)',  label: 'CRITICAL' },
    high:     { color: '#ff8800', bg: 'rgba(255,136,0,0.07)',  border: 'rgba(255,136,0,0.26)',  label: 'HIGH'     },
    medium:   { color: '#f5c518', bg: 'rgba(245,197,24,0.07)', border: 'rgba(245,197,24,0.26)', label: 'MEDIUM'   },
    low:      { color: '#50c878', bg: 'rgba(80,200,120,0.07)', border: 'rgba(80,200,120,0.22)', label: 'LOW'      },
};

const STA: Record<IncidentStatus, { color: string; label: string; step: number }> = {
    detected:   { color: '#ff3b3b', label: 'Detected',  step: 0 },
    confirmed:  { color: '#ff8800', label: 'Confirmed', step: 1 },
    responding: { color: '#f5c518', label: 'Responding',step: 2 },
    resolving:  { color: '#3b9eff', label: 'Resolving', step: 3 },
    cleared:    { color: '#50c878', label: 'Cleared',   step: 4 },
};

const RICON: Record<Responder['type'], React.ElementType> = {
    police: ShieldAlert, ambulance: HeartPulse, tow: Truck, fire: Flame,
};
const RCOLOR: Record<Responder['type'], string> = {
    police: '#3b9eff', ambulance: '#ff5c5c', tow: '#a78bfa', fire: '#ff8800',
};
const RSTATUS: Record<ResponderStatus, { color: string; label: string }> = {
    en_route:   { color: '#3b9eff', label: 'En Route'   },
    arrived:    { color: '#50c878', label: 'Arrived'    },
    dispatched: { color: '#f5c518', label: 'Dispatched' },
    pending:    { color: '#666',    label: 'Pending'    },
};
const REC_COLOR: Record<AIRecommendation['type'], string> = {
    route:    'var(--accent-primary)',
    dispatch: '#ff5c5c',
    signal:   '#f5c518',
    escalate: '#a78bfa',
};
const REC_ICON: Record<AIRecommendation['type'], React.ElementType> = {
    route: Route, dispatch: Siren, signal: Signal, escalate: ChevronUp,
};

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_INCIDENT: Incident = {
    id: 'INC-2026-0847', name: 'Multi-vehicle collision — Ngong Road',
    location: 'Ngong Road – Adams Arcade Junction', zone: 'Zone 4 · Southbound',
    severity: 'high', status: 'responding',
    detectedAt: new Date(Date.now() - 7 * 60_000), confidence: 87,
    vehiclesAffected: 134, avgDelay: 18, congestionIndex: 78, clearanceEta: 22,
    recommendations: [
        { id: 'r1', type: 'route',    action: 'Redirect via Mbagathi Way',   detail: 'Alternate route reduces queue by 22% over 15 min', confidence: 91, impact: '−22% congestion', eta: '2 min to effect', status: 'pending'  },
        { id: 'r2', type: 'dispatch', action: 'Dispatch tow truck KCC-03',   detail: 'Nearest unit 2.4 km away, ETA 8 min',              confidence: 96, impact: 'ETA 8 min',        eta: '8 min',          status: 'approved' },
        { id: 'r3', type: 'signal',   action: 'Adjust signals — 3 junctions',detail: 'Extend green on Mbagathi, Langata, James Gichuru', confidence: 84, impact: '+15% throughput', eta: '1 min to effect', status: 'pending'  },
    ],
    responders: [
        { id: 'rsp1', name: 'Police Unit A',   type: 'police',    status: 'en_route',  eta: 3,    distance: '1.1 km', badge: 'NBI-PA-01' },
        { id: 'rsp2', name: 'Ambulance KNH-2', type: 'ambulance', status: 'arrived',   eta: null, distance: '0 km',   badge: 'KNH-A-02'  },
        { id: 'rsp3', name: 'Tow Truck KCC-03',type: 'tow',       status: 'dispatched',eta: 8,    distance: '2.4 km', badge: 'KCC-T-03'  },
        { id: 'rsp4', name: 'Fire Unit B-1',   type: 'fire',      status: 'pending',   eta: null, distance: '4.2 km', badge: 'NBI-F-B1'  },
    ],
    timeline: [
        { id: 't1', time: new Date(Date.now()-7*60000), label: 'AI anomaly detected',          detail: 'Sensor cluster flagged velocity drop >60%',    type: 'ai',       actor: 'ATMS-AI',      completed: true  },
        { id: 't2', time: new Date(Date.now()-6*60000), label: 'Incident confirmed',            detail: 'Camera feed confirmed via operator',            type: 'operator', actor: 'Fatima Nkosi', completed: true  },
        { id: 't3', time: new Date(Date.now()-5*60000), label: 'Responders dispatched',         detail: 'Police Unit A + Ambulance KNH-2 en route',     type: 'system',   actor: 'System',       completed: true  },
        { id: 't4', time: new Date(Date.now()-2*60000), label: 'Ambulance KNH-2 on scene',      detail: 'Medical response active — 2 casualties treated',type: 'responder',actor: 'KNH-A-02',     completed: true  },
        { id: 't5', time: new Date(Date.now()),         label: 'Traffic redirect pending',       detail: 'Awaiting operator approval for Mbagathi route', type: 'ai',       actor: 'ATMS-AI',      completed: false },
        { id: 't6', time: new Date(Date.now()+8*60000), label: 'Tow truck arrival',              detail: 'KCC-T-03 ETA 8 min',                           type: 'system',   actor: 'KCC-T-03',     completed: false },
        { id: 't7', time: new Date(Date.now()+22*60000),label: 'Estimated clearance',            detail: 'AI projection based on responder ETAs',        type: 'ai',       actor: 'ATMS-AI',      completed: false },
    ],
};

// ─── API helpers (Next.js /api routes) ───────────────────────────────────────

const BASE = '/api/incidents';

async function apiPost<T = unknown>(path: string, body?: object): Promise<T> {
    const r = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
}
async function apiPatch<T = unknown>(path: string, body: object): Promise<T> {
    const r = await fetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
}

// ─── Utility hooks ────────────────────────────────────────────────────────────

function useLiveClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
    return now;
}

function useApiAction() {
    const [loading, setLoading] = useState<string | null>(null);
    const [error,   setError]   = useState<string | null>(null);

    const run = useCallback(async (key: string, fn: () => Promise<unknown>) => {
        setLoading(key); setError(null);
        try { await fn(); }
        catch (e) { setError((e as Error).message); }
        finally { setLoading(null); }
    }, []);

    return { loading, error, run };
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function fmtRelative(d: Date): string {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 0) return `in ~${Math.abs(Math.floor(s / 60))}m`;
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
}
function fmtTime(d: Date): string {
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
function fmtDuration(ms: number): string {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m ${s % 60}s`;
}

function SevBadge({ severity }: { severity: IncidentSeverity }) {
    const s = SEV[severity];
    return (
        <div className="flex items-center gap-1 px-2 py-[3px] rounded-lg" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color, animation: severity === 'critical' ? 'pulse-dot 1.2s ease infinite' : 'none' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', fontWeight: 800, letterSpacing: '0.1em', color: s.color }}>{s.label}</span>
        </div>
    );
}

function StatusPill({ status }: { status: IncidentStatus }) {
    const m = STA[status];
    return (
        <div className="flex items-center gap-1.5 px-2.5 py-[3px] rounded-full" style={{ background: `${m.color}12`, border: `1px solid ${m.color}28` }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.color, animation: 'pulse-dot 1.8s ease infinite' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700, color: m.color, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{m.label}</span>
        </div>
    );
}

function ConfBar({ value, color, label }: { value: number; color: string; label?: string }) {
    return (
        <div className="flex flex-col gap-1">
            {label && (
                <div className="flex items-center justify-between">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text-disabled)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700, color }}>{value}%</span>
                </div>
            )}
            <Progress value={value} className="h-[3px]"
                style={{ background: `${color}18`, '--progress-foreground': color } as React.CSSProperties} />
        </div>
    );
}

function ActionBtn({
    label, icon: Icon, color, onClick, primary, loading, disabled, size = 'sm',
}: {
    label: string; icon?: React.ElementType; color: string;
    onClick: () => void; primary?: boolean; loading?: boolean;
    disabled?: boolean; size?: 'sm' | 'md';
}) {
    const h = size === 'md' ? 36 : 30;
    return (
        <Button variant="outline" size="sm" onClick={onClick}
            disabled={disabled || loading}
            className={cn('gap-1.5 font-semibold tracking-wide transition-all duration-150 rounded-xl disabled:opacity-40', primary ? 'flex-[1.5]' : 'flex-1')}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', height: h, background: primary ? `${color}14` : `${color}08`, borderColor: `${color}30`, color }}>
            {loading ? <Loader2 size={11} className="animate-spin" /> : Icon ? <Icon size={11} strokeWidth={2} /> : null}
            {label}
        </Button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE A — IncidentHeader
// ─────────────────────────────────────────────────────────────────────────────

function IncidentHeader({
    incident, selectedEntity, onSelectIncident, onStatusChange, onClose,
}: {
    incident:       Incident;
    selectedEntity: SelectedEntity;
    onSelectIncident: () => void;
    onStatusChange: (s: IncidentStatus) => void;
    onClose?:       () => void;
}) {
    const now     = useLiveClock();
    const elapsed = fmtDuration(now.getTime() - incident.detectedAt.getTime());
    const s       = SEV[incident.severity];
    const isSelected = selectedEntity.type === 'incident';

    return (
        <div
            onClick={onSelectIncident}
            className="shrink-0 flex items-center gap-4 px-5 py-3 flex-wrap cursor-pointer transition-all duration-200"
            style={{
                background:   `linear-gradient(135deg, ${s.bg} 0%, var(--bg-raised) 60%)`,
                borderBottom: `1px solid ${isSelected ? `${s.color}40` : s.border}`,
                borderLeft:   `3px solid ${s.color}`,
                boxShadow:    isSelected ? `inset 0 0 24px ${s.color}06` : 'none',
                position:     'relative', overflow: 'hidden',
            }}
        >
            {/* Corner glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at left top, ${s.color}08 0%, transparent 60%)` }} />

            {/* Icon + ID + name */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: `${s.color}16`, border: `1px solid ${s.border}`, boxShadow: `0 0 16px ${s.color}14` }}>
                    <AlertTriangle size={18} strokeWidth={2} style={{ color: s.color, animation: incident.severity === 'critical' ? 'pulse-dot 1.4s ease infinite' : 'none' }} />
                </div>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--text-disabled)' }}>{incident.id}</span>
                        <SevBadge severity={incident.severity} />
                        <StatusPill status={incident.status} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.82rem,0.7rem+0.4vw,1rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {incident.name}
                    </span>
                </div>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-0.5 shrink-0">
                <div className="flex items-center gap-1">
                    <MapPin size={10} style={{ color: 'var(--text-disabled)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-secondary)' }}>{incident.location}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-disabled)' }}>{incident.zone}</span>
            </div>

            <div className="flex-1" />

            {/* KPI chips */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {[
                    { label: 'ELAPSED',   value: elapsed,              color: s.color    },
                    { label: 'AI CONF',   value: `${incident.confidence}%`, color: 'var(--accent-primary)' },
                    { label: 'EST CLEAR', value: `${incident.clearanceEta}m`, color: '#f5c518' },
                ].map(k => (
                    <div key={k.label} className="flex flex-col items-center gap-[2px] px-2.5 py-1.5 rounded-xl"
                        style={{ background: `${k.color}08`, border: `1px solid ${k.color}20` }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--text-disabled)', letterSpacing: '0.08em' }}>{k.label}</span>
                    </div>
                ))}

                {/* Status change */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="h-8 gap-1 text-[0.52rem] tracking-wide rounded-xl"
                            style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                            <Edit3 size={10} /> Status <ChevronDown size={9} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-overlay)', border: '1px solid var(--border-strong)', borderRadius: 10, minWidth: 160 }}>
                        <DropdownMenuLabel className="text-[0.46rem] tracking-widest uppercase px-2 py-1.5" style={{ color: 'var(--text-disabled)' }}>Change Status</DropdownMenuLabel>
                        <DropdownMenuSeparator style={{ background: 'var(--border-subtle)' }} />
                        {(Object.keys(STA) as IncidentStatus[]).map(st => (
                            <DropdownMenuItem key={st} onClick={() => onStatusChange(st)}
                                className="flex items-center gap-2 text-[0.54rem] cursor-pointer py-1.5 px-2">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STA[st].color }} />
                                <span style={{ color: incident.status === st ? STA[st].color : 'var(--text-secondary)', fontWeight: incident.status === st ? 700 : 400 }}>{STA[st].label}</span>
                                {incident.status === st && <Check size={9} className="ml-auto" style={{ color: STA[st].color }} />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {onClose && (
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onClose(); }} className="h-7 w-7 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                        <X size={14} />
                    </Button>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PROGRESS STRIP
// ─────────────────────────────────────────────────────────────────────────────

function StatusProgressStrip({ status }: { status: IncidentStatus }) {
    const steps = Object.keys(STA) as IncidentStatus[];
    const cur   = STA[status].step;
    return (
        <div className="shrink-0 flex items-center gap-0 px-5 py-2"
            style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            {steps.map((step, i) => {
                const m = STA[step], done = i < cur, active = i === cur;
                return (
                    <React.Fragment key={step}>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center justify-center rounded-full transition-all duration-400"
                                style={{ width: 18, height: 18, background: done || active ? `${m.color}16` : 'transparent', border: `1px solid ${done || active ? `${m.color}38` : 'var(--border-subtle)'}` }}>
                                {done
                                    ? <Check size={8} strokeWidth={3} style={{ color: m.color }} />
                                    : active
                                        ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color, animation: 'pulse-dot 1.4s ease infinite', display: 'block' }} />
                                        : <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border-default)', display: 'block' }} />
                                }
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', fontWeight: active ? 700 : 400, color: active ? m.color : done ? 'var(--text-muted)' : 'var(--text-disabled)', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
                                {m.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className="flex-1 h-px mx-2 min-w-[8px] transition-all duration-400"
                                style={{ background: done ? `${STA[steps[i+1]].color}28` : 'var(--border-subtle)' }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE C — ContextualActionBar (3 states)
// ─────────────────────────────────────────────────────────────────────────────

// ── State 1: No selection ──────────────────────────────────────────────────

function DefaultState({ incident, onSelectIncident }: { incident: Incident; onSelectIncident: () => void }) {
    const pending = incident.recommendations.filter(r => r.status === 'pending');
    return (
        <div className="flex flex-col gap-4 px-4 py-4">
            {/* Highest-priority AI recommendation */}
            {pending[0] && (
                <div className="flex flex-col gap-2 p-3 rounded-2xl"
                    style={{ background: 'rgba(59,158,255,0.05)', border: '1px solid rgba(59,158,255,0.18)', borderLeft: '3px solid var(--accent-primary)' }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Bot size={11} strokeWidth={2} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>Top AI Recommendation</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {pending[0].action}
                    </span>
                    <ConfBar value={pending[0].confidence} color="var(--accent-primary)" label="Confidence" />
                </div>
            )}

            {/* Prompt to select */}
            <button onClick={onSelectIncident}
                className="flex items-center gap-3 p-3 rounded-2xl w-full text-left transition-all duration-150 hover:bg-[rgba(255,255,255,0.03)]"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', cursor: 'pointer', outline: 'none' }}>
                <div className="flex items-center justify-center rounded-xl" style={{ width: 32, height: 32, background: `${SEV[incident.severity].color}12`, border: `1px solid ${SEV[incident.severity].border}` }}>
                    <AlertTriangle size={14} style={{ color: SEV[incident.severity].color }} />
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.64rem', fontWeight: 600, color: 'var(--text-primary)' }}>Review Incident</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>Click to view full actions &amp; AI suggestions</span>
                </div>
                <ChevronRight size={13} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
            </button>

            {/* System health KPIs */}
            <div className="flex flex-col gap-2">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Network Status</span>
                {[
                    { label: 'Active incidents',  value: '1',   color: '#ff8800' },
                    { label: 'Vehicles in CBD',   value: '18',  color: '#f5c518' },
                    { label: 'Signal coverage',   value: '94%', color: '#50c878' },
                ].map(k => (
                    <div key={k.label} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)' }}>{k.label}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 800, color: k.color }}>{k.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── State 2: Incident selected ──────────────────────────────────────────────

function RecCard({ rec, incidentId, onUpdate }: {
    rec: AIRecommendation; incidentId: string;
    onUpdate: (id: string, status: AIRecommendation['status']) => void;
}) {
    const { loading, run } = useApiAction();
    const color  = REC_COLOR[rec.type];
    const Icon   = REC_ICON[rec.type];
    const isDone = rec.status === 'approved' || rec.status === 'rejected';

    const approve = () => run('approve', async () => {
        await apiPost(`${BASE}/${incidentId}/recommendations/${rec.id}/approve`);
        onUpdate(rec.id, 'approved');
    });
    const reject = () => run('reject', async () => {
        await apiPost(`${BASE}/${incidentId}/recommendations/${rec.id}/reject`);
        onUpdate(rec.id, 'rejected');
    });

    return (
        <div className="flex flex-col gap-2.5 p-3 rounded-xl transition-all duration-200"
            style={{
                background: isDone ? (rec.status === 'approved' ? 'rgba(80,200,120,0.04)' : 'rgba(255,255,255,0.015)') : `${color}05`,
                border:     `1px solid ${isDone ? (rec.status === 'approved' ? 'rgba(80,200,120,0.18)' : 'var(--border-subtle)') : `${color}20`}`,
                opacity:    rec.status === 'rejected' ? 0.45 : 1,
            }}>
            {/* Header */}
            <div className="flex items-start gap-2">
                <div className="flex items-center justify-center rounded-lg shrink-0 mt-0.5"
                    style={{ width: 24, height: 24, background: `${color}14`, border: `1px solid ${color}26` }}>
                    <Icon size={11} strokeWidth={2} style={{ color }} />
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {rec.action}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{rec.detail}</span>
                </div>
                {isDone && (
                    <div className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                        style={{ background: rec.status === 'approved' ? 'rgba(80,200,120,0.12)' : 'rgba(255,59,59,0.08)', border: `1px solid ${rec.status === 'approved' ? 'rgba(80,200,120,0.25)' : 'rgba(255,59,59,0.2)'}` }}>
                        {rec.status === 'approved' ? <Check size={8} style={{ color: '#50c878' }} /> : <X size={8} style={{ color: '#ff3b3b' }} />}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', fontWeight: 700, color: rec.status === 'approved' ? '#50c878' : '#ff3b3b', letterSpacing: '0.06em' }}>
                            {rec.status.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Confidence + ETA + impact */}
            <ConfBar value={rec.confidence} color={color} label="Confidence" />
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: `${color}0e`, border: `1px solid ${color}20` }}>
                    <TrendingDown size={8} style={{ color }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', fontWeight: 700, color }}>{rec.impact}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                    <Timer size={8} style={{ color: 'var(--text-disabled)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-muted)' }}>{rec.eta}</span>
                </div>
            </div>

            {/* Actions — only when pending */}
            {!isDone && (
                <div className="flex gap-1.5">
                    <ActionBtn label="Approve" icon={CheckCircle2} color="#50c878" onClick={approve} loading={loading === 'approve'} primary />
                    <ActionBtn label="Preview" icon={Eye}          color="var(--accent-primary)" onClick={() => {}} />
                    <ActionBtn label=""        icon={X}            color="var(--text-muted)"     onClick={reject}  loading={loading === 'reject'}  size="sm" />
                </div>
            )}
        </div>
    );
}

function IncidentSelectedState({ incident, onRecUpdate, onAction }: {
    incident:    Incident;
    onRecUpdate: (id: string, status: AIRecommendation['status']) => void;
    onAction:    (action: string) => void;
}) {
    const { loading, run } = useApiAction();

    const quickActions = [
        { key: 'redirect',  label: 'Redirect Traffic', icon: Route,      color: 'var(--accent-primary)' },
        { key: 'dispatch',  label: 'Dispatch',          icon: Siren,      color: '#ff5c5c'               },
        { key: 'signals',   label: 'Adjust Signals',    icon: Signal,     color: '#f5c518'               },
        { key: 'escalate',  label: 'Escalate',          icon: ChevronUp,  color: '#a78bfa'               },
        { key: 'resolve',   label: 'Resolve',           icon: Check,      color: '#50c878'               },
        { key: 'confirm',   label: 'Confirm',           icon: CheckCircle2, color: '#3b9eff'             },
    ];

    return (
        <ScrollArea className="flex-1">
            <div className="px-4 py-4 flex flex-col gap-5">

                {/* AI Recommendations */}
                <section>
                    <div className="flex items-center gap-1.5 mb-3">
                        <Bot size={11} strokeWidth={2} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>AI Recommendations</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                        <span className="flex items-center justify-center rounded-full text-[0.44rem] font-bold"
                            style={{ width: 16, height: 16, background: 'rgba(59,158,255,0.14)', border: '1px solid rgba(59,158,255,0.3)', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                            {incident.recommendations.filter(r => r.status === 'pending').length}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {incident.recommendations.map(rec => (
                            <RecCard key={rec.id} rec={rec} incidentId={incident.id} onUpdate={onRecUpdate} />
                        ))}
                    </div>
                </section>

                {/* Quick Actions */}
                <section>
                    <div className="flex items-center gap-1.5 mb-3">
                        <Zap size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Quick Actions</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {quickActions.map(a => (
                            <Button key={a.key} variant="outline" size="sm"
                                onClick={() => {
                                    run(a.key, async () => {
                                        if (a.key === 'confirm') await apiPost(`${BASE}/${incident.id}/confirm`);
                                        if (a.key === 'redirect') await apiPost(`${BASE}/${incident.id}/traffic/reroute`);
                                        if (a.key === 'signals')  await apiPost(`${BASE}/${incident.id}/signals/adjust`);
                                        if (a.key === 'escalate') await apiPost(`${BASE}/${incident.id}/escalate`);
                                        onAction(a.key);
                                    });
                                }}
                                disabled={loading === a.key}
                                className="h-9 flex items-center justify-start gap-1.5 text-[0.54rem] tracking-wide font-semibold rounded-xl transition-all duration-150"
                                style={{ fontFamily: 'var(--font-mono)', background: `${a.color}08`, borderColor: `${a.color}22`, color: a.color }}>
                                {loading === a.key
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : <a.icon size={12} strokeWidth={2} />
                                }
                                {a.label}
                            </Button>
                        ))}
                    </div>
                </section>

                {/* Impact metrics */}
                <section>
                    <div className="flex items-center gap-1.5 mb-3">
                        <BarChart3 size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Impact Metrics</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Vehicles', value: incident.vehiclesAffected.toLocaleString(), unit: 'affected', icon: Car,       color: '#ff8800' },
                            { label: 'Avg Delay',value: `${incident.avgDelay}`,                     unit: 'min',      icon: Clock,     color: '#f5c518' },
                            { label: 'Congestion',value: `${incident.congestionIndex}`,              unit: '/ 100',    icon: BarChart3, color: incident.congestionIndex > 70 ? '#ff3b3b' : '#ff8800' },
                            { label: 'ETA Clear', value: `${incident.clearanceEta}`,                 unit: 'min',      icon: RefreshCw, color: '#50c878' },
                        ].map(m => (
                            <div key={m.label} className="flex flex-col gap-1.5 p-2.5 rounded-xl"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-1">
                                    <m.icon size={9} strokeWidth={2} style={{ color: 'var(--text-disabled)' }} />
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)', letterSpacing: '0.06em' }}>{m.label}</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>{m.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </ScrollArea>
    );
}

// ── State 3: Responder selected ────────────────────────────────────────────

function ResponderSelectedState({ responder, incidentId, onDispatch, onDeselect }: {
    responder:  Responder;
    incidentId: string;
    onDispatch: (id: string) => void;
    onDeselect: () => void;
}) {
    const { loading, run } = useApiAction();
    const Icon    = RICON[responder.type];
    const color   = RCOLOR[responder.type];
    const sMeta   = RSTATUS[responder.status];

    const dispatch = () => run('dispatch', async () => {
        await apiPost(`${BASE}/${incidentId}/responders/${responder.id}/dispatch`);
        onDispatch(responder.id);
    });
    const reroute = () => run('reroute', async () => {
        await apiPatch(`${BASE}/${incidentId}/responders/${responder.id}/route`, { optimize: true });
    });

    return (
        <div className="flex flex-col gap-4 px-4 py-4">
            {/* Responder identity card */}
            <div className="flex flex-col gap-3 p-4 rounded-2xl"
                style={{ background: `${color}08`, border: `1px solid ${color}22` }}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: `${color}18`, border: `1px solid ${color}32`, boxShadow: `0 0 14px ${color}18` }}>
                        <Icon size={20} strokeWidth={1.8} style={{ color }} />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{responder.name}</span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sMeta.color, animation: responder.status === 'en_route' ? 'pulse-dot 1.4s ease infinite' : 'none', display: 'inline-block' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', fontWeight: 700, color: sMeta.color }}>{sMeta.label}</span>
                        </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text-disabled)' }}>{responder.badge}</span>
                </div>

                {/* ETA + distance stats */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'ETA',      value: responder.eta !== null ? `${responder.eta} min` : 'On scene', color: responder.eta !== null && responder.eta <= 5 ? '#f5c518' : '#50c878' },
                        { label: 'Distance', value: responder.distance, color: 'var(--text-secondary)' },
                    ].map(s => (
                        <div key={s.label} className="flex flex-col gap-[3px] px-2.5 py-2 rounded-xl"
                            style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>{s.label}</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI route comparison */}
            <div className="flex flex-col gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(59,158,255,0.04)', border: '1px solid rgba(59,158,255,0.18)', borderLeft: '3px solid var(--accent-primary)' }}>
                <div className="flex items-center gap-1.5">
                    <Bot size={11} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>AI Optimised Route</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-[2px]">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>Current ETA</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {responder.eta !== null ? `${responder.eta} min` : 'On scene'}
                        </span>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                    <div className="flex flex-col gap-[2px]">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>AI optimised</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.84rem', fontWeight: 800, color: '#50c878' }}>
                            {responder.eta !== null ? `${Math.max(1, responder.eta - 2)} min` : 'On scene'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
                {responder.status === 'pending' && (
                    <ActionBtn label="Dispatch to Incident" icon={Send} color="#ff8800" onClick={dispatch} loading={loading === 'dispatch'} primary size="md" />
                )}
                <ActionBtn label="Reroute with AI" icon={Navigation} color="var(--accent-primary)" onClick={reroute} loading={loading === 'reroute'} size="md" />
                <div className="flex gap-2">
                    <ActionBtn label="Contact"     icon={Phone}    color="var(--text-muted)" onClick={() => {}} />
                    <ActionBtn label="Track on Map" icon={Crosshair} color="var(--text-muted)" onClick={() => {}} />
                </div>
            </div>

            <Button variant="ghost" size="sm" onClick={onDeselect}
                className="h-7 gap-1.5 text-[0.5rem] self-start"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)' }}>
                <X size={10} /> Back to incident
            </Button>
        </div>
    );
}

// ── Composed ContextualActionBar ───────────────────────────────────────────

function ContextualActionBar({
    incident, selectedEntity, onRecUpdate, onAction,
    onDispatch, onDeselect, onSelectIncident,
}: {
    incident:         Incident;
    selectedEntity:   SelectedEntity;
    onRecUpdate:      (id: string, status: AIRecommendation['status']) => void;
    onAction:         (action: string) => void;
    onDispatch:       (id: string) => void;
    onDeselect:       () => void;
    onSelectIncident: () => void;
}) {
    const selResponder = selectedEntity.type === 'responder'
        ? incident.responders.find(r => r.id === selectedEntity.id) ?? null
        : null;

    const title =
        selectedEntity.type === 'incident'  ? 'Incident Actions' :
        selectedEntity.type === 'responder' ? `${selResponder?.name ?? 'Responder'}` :
        'Command Overview';

    const titleColor =
        selectedEntity.type === 'incident'  ? SEV[incident.severity].color :
        selectedEntity.type === 'responder' ? RCOLOR[selResponder?.type ?? 'police'] :
        'var(--text-secondary)';

    return (
        <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-raised)', borderLeft: '1px solid var(--border-default)' }}>
            {/* Panel header */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: titleColor, animation: 'pulse-dot 1.8s ease infinite' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
                <div className="flex-1" />
                {selectedEntity.type !== null && (
                    <button onClick={onDeselect} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <X size={12} style={{ color: 'var(--text-disabled)' }} />
                    </button>
                )}
            </div>

            {/* Dynamic content */}
            {selectedEntity.type === null && (
                <DefaultState incident={incident} onSelectIncident={onSelectIncident} />
            )}
            {selectedEntity.type === 'incident' && (
                <IncidentSelectedState incident={incident} onRecUpdate={onRecUpdate} onAction={onAction} />
            )}
            {selectedEntity.type === 'responder' && selResponder && (
                <ResponderSelectedState responder={selResponder} incidentId={incident.id} onDispatch={onDispatch} onDeselect={onDeselect} />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE D — ResponderStrip (horizontal scrollable cards)
// ─────────────────────────────────────────────────────────────────────────────

function ResponderStrip({
    responders, selectedId, onSelect,
}: {
    responders: Responder[];
    selectedId: string | null;
    onSelect:   (id: string) => void;
}) {
    return (
        <div className="shrink-0 flex flex-col" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
            {/* Strip header */}
            <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <Users size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Responders</span>
                <span className="text-[0.44rem] px-1.5 py-[1px] rounded-full"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, background: 'rgba(59,158,255,0.1)', border: '1px solid rgba(59,158,255,0.22)', color: 'var(--accent-primary)' }}>
                    {responders.length}
                </span>
                <div className="flex-1" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>Click to select · ›› scroll</span>
            </div>

            {/* Horizontal card scroll */}
            <div className="flex gap-2.5 px-4 py-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {responders.map(r => {
                    const Icon    = RICON[r.type];
                    const color   = RCOLOR[r.type];
                    const sMeta   = RSTATUS[r.status];
                    const isSelected = r.id === selectedId;

                    return (
                        <button
                            key={r.id}
                            onClick={() => onSelect(r.id)}
                            className="flex flex-col gap-2 p-2.5 rounded-xl shrink-0 transition-all duration-200 text-left"
                            style={{
                                width:       112,
                                background:  isSelected ? `${color}14` : 'var(--bg-elevated)',
                                border:      `1px solid ${isSelected ? `${color}40` : 'var(--border-subtle)'}`,
                                boxShadow:   isSelected ? `0 0 12px ${color}18` : 'none',
                                transform:   isSelected ? 'translateY(-1px)' : 'none',
                                cursor:      'pointer',
                                outline:     'none',
                            }}
                        >
                            {/* Icon + status dot */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center justify-center rounded-lg"
                                    style={{ width: 28, height: 28, background: `${color}16`, border: `1px solid ${color}28` }}>
                                    <Icon size={13} strokeWidth={2} style={{ color }} />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: sMeta.color, animation: r.status === 'en_route' ? 'pulse-dot 1.4s ease infinite' : 'none', display: 'inline-block' }} />
                                </div>
                            </div>

                            {/* Name */}
                            <div className="flex flex-col gap-[2px]">
                                <span className="line-clamp-1" style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 700, color: isSelected ? color : 'var(--text-primary)', lineHeight: 1.2 }}>
                                    {r.name}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: sMeta.color, fontWeight: 600 }}>{sMeta.label}</span>
                            </div>

                            {/* ETA */}
                            <div className="flex items-center gap-1">
                                <Clock size={8} style={{ color: 'var(--text-disabled)' }} />
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700, color: r.eta !== null && r.eta <= 5 ? '#f5c518' : 'var(--text-muted)' }}>
                                    {r.eta !== null ? `${r.eta}m` : 'On scene'}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE E — LifecycleTimeline (collapsed progress bar → expandable)
// ─────────────────────────────────────────────────────────────────────────────

const TL_TYPE: Record<TimelineEvent['type'], { color: string; icon: React.ElementType }> = {
    ai:       { color: 'var(--accent-primary)', icon: Bot       },
    operator: { color: '#f5c518',               icon: Users     },
    system:   { color: 'var(--text-muted)',      icon: Radio     },
    responder:{ color: '#50c878',               icon: ShieldAlert },
};

function LifecycleTimeline({ incident }: { incident: Incident }) {
    const [open, setOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const pct = Math.round((incident.timeline.filter(e => e.completed).length / incident.timeline.length) * 100);
    const statusColor = STA[incident.status].color;

    return (
        <div className="shrink-0 flex flex-col" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
            {/* Collapsed — progress bar strip */}
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-3 px-4 py-2 w-full text-left transition-colors duration-150 hover:bg-[rgba(255,255,255,0.02)]"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}
            >
                <Activity size={11} strokeWidth={2} style={{ color: '#50c878', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>
                    Lifecycle
                </span>

                {/* Inline progress */}
                <div className="flex-1 flex items-center gap-2 mx-1">
                    <Progress value={pct} className="h-[3px] flex-1"
                        style={{ background: 'rgba(80,200,120,0.12)', '--progress-foreground': '#50c878' } as React.CSSProperties} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', fontWeight: 700, color: '#50c878', whiteSpace: 'nowrap' }}>{pct}%</span>
                </div>

                {/* Current status badge */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: `${statusColor}10`, border: `1px solid ${statusColor}25` }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: statusColor, display: 'inline-block' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', fontWeight: 700, color: statusColor }}>{STA[incident.status].label}</span>
                </div>

                {open
                    ? <ChevronDown size={12} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                    : <ChevronUp   size={12} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                }
            </button>

            {/* Expanded timeline */}
            {open && (
                <div style={{ animation: 'slide-in-up 180ms ease', borderTop: '1px solid var(--border-subtle)' }}>
                    <ScrollArea style={{ maxHeight: 200 }}>
                        <div className="px-4 py-3 flex flex-col">
                            {incident.timeline.map((evt, i) => {
                                const m      = TL_TYPE[evt.type];
                                const Icon   = m.icon;
                                const isLast = i === incident.timeline.length - 1;
                                const isFuture = !evt.completed;
                                const isExpanded = expandedId === evt.id;

                                return (
                                    <div key={evt.id} className="flex gap-2.5">
                                        {/* Spine */}
                                        <div className="flex flex-col items-center shrink-0" style={{ width: 18 }}>
                                            <div className="flex items-center justify-center rounded-full transition-all duration-300"
                                                style={{ width: 18, height: 18, background: evt.completed ? `${m.color}14` : 'var(--bg-elevated)', border: `1px solid ${evt.completed ? `${m.color}35` : 'var(--border-subtle)'}` }}>
                                                {evt.completed
                                                    ? <Icon size={8} strokeWidth={2.5} style={{ color: m.color }} />
                                                    : <span className="w-1 h-1 rounded-full" style={{ background: 'var(--border-default)', display: 'block' }} />
                                                }
                                            </div>
                                            {!isLast && <div className="w-px flex-1 my-0.5 min-h-[8px]" style={{ background: evt.completed ? `${m.color}18` : 'var(--border-subtle)' }} />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 pb-2.5 cursor-pointer" style={{ opacity: isFuture ? 0.5 : 1 }}
                                            onClick={() => setExpandedId(isExpanded ? null : evt.id)}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: evt.completed ? 600 : 400, color: evt.completed ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.3 }}>
                                                    {evt.label}
                                                </span>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    {isFuture ? `~${fmtTime(evt.time)}` : fmtTime(evt.time)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-[2px]">
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>
                                                    {isFuture ? 'Projected' : fmtRelative(evt.time)}
                                                </span>
                                                {evt.actor && (
                                                    <span className="px-1 py-px rounded-sm" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', background: `${m.color}0e`, color: m.color }}>
                                                        {evt.actor}
                                                    </span>
                                                )}
                                            </div>
                                            {isExpanded && evt.detail && (
                                                <div className="mt-1 px-2 py-1.5 rounded-lg"
                                                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', lineHeight: 1.5, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', animation: 'slide-in-up 120ms ease' }}>
                                                    {evt.detail}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSED PAGE — IncidentManagementScreen v2
// ─────────────────────────────────────────────────────────────────────────────

export default function IncidentManagementScreen() {
    const [incident, setIncident] = useState<Incident>(MOCK_INCIDENT);
    const [selected, setSelected] = useState<SelectedEntity>({ type: null, id: null });

    // ── Selectors ──
    const selectIncident  = () => setSelected({ type: 'incident', id: incident.id });
    const selectResponder = (id: string) => setSelected({ type: 'responder', id });
    const deselect        = () => setSelected({ type: null, id: null });

    // ── Incident mutations ──
    const handleRecUpdate = (id: string, status: AIRecommendation['status']) =>
        setIncident(prev => ({ ...prev, recommendations: prev.recommendations.map(r => r.id === id ? { ...r, status } : r) }));

    const handleDispatch = (id: string) =>
        setIncident(prev => ({ ...prev, responders: prev.responders.map(r => r.id === id ? { ...r, status: 'dispatched', eta: 12 } : r) }));

    const handleStatusChange = (s: IncidentStatus) => setIncident(prev => ({ ...prev, status: s }));

    const handleAction = (action: string) => {
        if (action === 'confirm')  handleStatusChange('confirmed');
        if (action === 'resolve')  handleStatusChange('cleared');
        if (action === 'escalate') handleStatusChange('responding');
    };

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: 'var(--bg-base)' }}>

                {/* ── A. Incident Header ── */}
                <IncidentHeader
                    incident={incident}
                    selectedEntity={selected}
                    onSelectIncident={selectIncident}
                    onStatusChange={handleStatusChange}
                />

                {/* ── Status progress strip ── */}
                <StatusProgressStrip status={incident.status} />

                {/* ── Main content ── */}
                <div className="flex-1 overflow-hidden min-h-0" style={{ display: 'grid', gridTemplateColumns: '1fr 320px' }}>

                    {/* ── B. Map + D. Responder Strip + E. Timeline ── */}
                    <div className="flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border-subtle)' }}>
                        {/* Map zone */}
                        <div className="flex-1 relative overflow-hidden min-h-0">
                            {/* ── Slot for MapContainer ── */}
                            {/*
                             * In production replace this div with:
                             *   <MapContainer alerts={[incident]} onAlertClick={selectIncident}
                             *     onCorridorClick={() => {}} selectedCorridorId={undefined} />
                             */}
                            <div className="w-full h-full flex items-center justify-center relative"
                                style={{
                                    background:     'var(--bg-void)',
                                    backgroundImage:`linear-gradient(var(--border-subtle) 1px,transparent 1px),linear-gradient(90deg,var(--border-subtle) 1px,transparent 1px)`,
                                    backgroundSize: '40px 40px',
                                }}>
                                {/* Incident pulsing marker */}
                                <div className="relative flex flex-col items-center gap-4">
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-5 h-5 rounded-full z-10 relative flex items-center justify-center"
                                            style={{ background: SEV[incident.severity].color, boxShadow: `0 0 20px ${SEV[incident.severity].color}` }}>
                                            <AlertTriangle size={10} style={{ color: '#000' }} />
                                        </div>
                                        {[1,2,3].map(n => (
                                            <div key={n} className="absolute rounded-full border-2"
                                                style={{ width: n*40, height: n*40, borderColor: `${SEV[incident.severity].color}${['40','25','10'][n-1]}`, animation: `pulse-dot ${1.2+n*0.3}s ease ${n*0.2}s infinite` }} />
                                        ))}
                                    </div>
                                    {/* Responder markers */}
                                    <div className="flex items-center gap-4">
                                        {incident.responders.filter(r => r.status !== 'pending').map(r => {
                                            const Icon = RICON[r.type];
                                            const c    = RCOLOR[r.type];
                                            const isSelected = selected.type === 'responder' && selected.id === r.id;
                                            return (
                                                <button key={r.id} onClick={() => selectResponder(r.id)}
                                                    className="flex flex-col items-center gap-1 transition-all duration-200"
                                                    style={{ cursor: 'pointer', transform: isSelected ? 'scale(1.15)' : 'scale(1)', background: 'none', border: 'none', outline: 'none' }}>
                                                    <div className="flex items-center justify-center rounded-full"
                                                        style={{ width: 28, height: 28, background: `${c}22`, border: `2px solid ${isSelected ? c : `${c}50`}`, boxShadow: isSelected ? `0 0 10px ${c}` : 'none' }}>
                                                        <Icon size={13} strokeWidth={2} style={{ color: c }} />
                                                    </div>
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: c, fontWeight: 700 }}>{r.eta !== null ? `${r.eta}m` : '●'}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="px-3 py-1.5 rounded-lg"
                                        style={{ background: 'rgba(10,12,18,0.9)', border: `1px solid ${SEV[incident.severity].border}`, backdropFilter: 'blur(8px)' }}>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', fontWeight: 700, color: SEV[incident.severity].color }}>{incident.location}</span>
                                    </div>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>
                                        ← MapContainer renders here
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── D. Responder Strip ── */}
                        <ResponderStrip
                            responders={incident.responders}
                            selectedId={selected.type === 'responder' ? selected.id : null}
                            onSelect={selectResponder}
                        />

                        {/* ── E. Lifecycle Timeline ── */}
                        <LifecycleTimeline incident={incident} />
                    </div>

                    {/* ── C. Contextual Action Bar ── */}
                    <ContextualActionBar
                        incident={incident}
                        selectedEntity={selected}
                        onRecUpdate={handleRecUpdate}
                        onAction={handleAction}
                        onDispatch={handleDispatch}
                        onDeselect={deselect}
                        onSelectIncident={selectIncident}
                    />
                </div>
            </div>
        </TooltipProvider>
    );
}