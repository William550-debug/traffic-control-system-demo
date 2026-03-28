'use client';

/**
 * Incident Command Center — v3 (Full Rebuild)
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds directly on top of v2's "Select, Then Act" architecture.
 *
 * Preserved from v2 (zero changes):
 *   Zone A  — IncidentHeader           (severity-tinted, live clock)
 *   Zone B  — StatusProgressStrip      (5-step lifecycle)
 *   Zone D  — ResponderStrip           (horizontal scrollable)
 *   Zone E  — LifecycleTimeline        (collapsible event feed)
 *   Zone C  — RecCard, DefaultState, IncidentSelectedState, ResponderSelectedState
 *
 * New in v3:
 *   Zone 0  — ProactiveForecastBanner  (AI anomaly detection strip)
 *   Zone Q  — IncidentQueuePanel       (left sidebar, all active incidents)
 *   Zone B+ — CorridorImpactOverlay    (green corridor + reroute rings on map)
 *   Zone C+ — CommandPanel with 3 tabs:
 *               · Actions    (existing ContextualActionBar content)
 *               · Coordinate (multi-agency assignments)
 *               · Metrics    (response times, corridor density, clearance prediction)
 *
 * API contract (unchanged from v2):
 *   POST  /api/incidents/[id]/confirm
 *   POST  /api/incidents/[id]/recommendations/[recId]/approve
 *   POST  /api/incidents/[id]/recommendations/[recId]/reject
 *   POST  /api/incidents/[id]/traffic/reroute
 *   POST  /api/incidents/[id]/signals/adjust
 *   POST  /api/incidents/[id]/responders/[rspId]/dispatch
 *   PATCH /api/incidents/[id]/responders/[rspId]/route
 *   PATCH /api/incidents/[id]/status
 *   POST  /api/incidents/[id]/escalate
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, Flame, CheckCircle2, Clock, MapPin,
    ChevronUp, ChevronDown, ChevronRight, ArrowRight,
    Zap, Navigation, ShieldAlert, HeartPulse, Truck,
    Car, Radio, TrendingDown, Activity, BarChart3, Users,
    Check, X, Edit3, Siren, RefreshCw,
    Route, Signal, Timer, Loader2, Send, Phone,
    Crosshair, Eye, Bot,
    // v3 additions
    Layers, Network,
    Radar, GitBranch as _GitBranch,
    ListChecks, BadgeAlert, Cpu,
    CloudRain,
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

// ─── Map integration ──────────────────────────────────────────────────────────
// IncidentMap is a self-contained component that handles all Google Maps
// integration for the incident view. It is loaded dynamically (ssr: false)
// because @vis.gl/react-google-maps requires browser globals.
import dynamic from 'next/dynamic';

const IncidentMap = dynamic(
    () => import('@/components/map/IncidentMap').then(m => ({ default: m.IncidentMap })),
    { ssr: false, loading: () => <MapLoadingSlot /> },
);

// ─── Shared domain types (from @/types — zero redeclaration) ─────────────────
import type {
    Incident,
    Recommendation,
    Responder,
    TimelineEvent,
    IncidentStatus,
    IncidentSeverity,
    ResponderStatus,
} from '@/types';
import { useIncidents } from '@/hooks/use-incidents';

// ─── UI-only types ────────────────────────────────────────────────────────────

export type EntityType = 'incident' | 'responder' | null;
export interface SelectedEntity { type: EntityType; id: string | null; }

// ─── Map loading slot ─────────────────────────────────────────────────────────
// Rendered by the dynamic() fallback while IncidentMap JS bundle is loading.
function MapLoadingSlot() {
    const GRID = 'rgba(255,255,255,0.06)';
    return (
        <div style={{
            width:'100%', height:'100%', background:'#080b0f',
            backgroundImage:`linear-gradient(${GRID} 1px,transparent 1px),linear-gradient(90deg,${GRID} 1px,transparent 1px)`,
            backgroundSize:'40px 40px',
            display:'flex', alignItems:'center', justifyContent:'center',
        }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.54rem', color:'var(--text-disabled)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
                Loading map…
            </span>
        </div>
    );
}

// v3: Multi-incident queue entry (lightweight — not the full Incident type)
interface QueueEntry {
    id:         string;
    name:       string;
    location:   string;
    severity:   IncidentSeverity;
    status:     IncidentStatus;
    elapsed:    string;   // pre-formatted
    responders: number;
    aiConf:     number;
}

// v3: Agency coordination record
interface AgencyAssignment {
    agency:    string;
    label:     string;
    icon:      React.ElementType;
    color:     string;
    role:      string;
    contact:   string;
    status:    'active' | 'en_route' | 'standby' | 'completed';
    lastUpdate:string;
}

// v3: Corridor impact record
interface CorridorImpact {
    id:         string;
    name:       string;
    density:    number;   // 0-100
    deltaVeh:   number;   // extra vehicles caused by incident
    rerouted:   boolean;
    signalAdj:  boolean;
}

// v3: Proactive forecast alert
interface ForecastAlert {
    id:       string;
    type:     'congestion' | 'accident_risk' | 'weather' | 'cluster';
    message:  string;
    location: string;
    risk:     'critical' | 'high' | 'medium';
    eta:      string;    // e.g. "in ~8 min"
    conf:     number;
}
interface IncidentCoordinates {
    lat?: number;
    lng?: number;
    geo?: {
        lat: number;
        lng: number;
    };
}
type MapReadyIncident = Incident & IncidentCoordinates;




// ─── Design tokens (all from v2 — zero changes) ───────────────────────────────

const SEV: Record<IncidentSeverity, { color: string; bg: string; border: string; label: string }> = {
    critical: { color: '#ff3b3b', bg: 'rgba(255,59,59,0.07)',  border: 'rgba(255,59,59,0.28)',  label: 'CRITICAL' },
    high:     { color: '#ff8800', bg: 'rgba(255,136,0,0.07)',  border: 'rgba(255,136,0,0.26)',  label: 'HIGH'     },
    medium:   { color: '#f5c518', bg: 'rgba(245,197,24,0.07)', border: 'rgba(245,197,24,0.26)', label: 'MEDIUM'   },
    low:      { color: '#50c878', bg: 'rgba(80,200,120,0.07)', border: 'rgba(80,200,120,0.22)', label: 'LOW'      },
};

const STA: Record<IncidentStatus, { color: string; label: string; step: number }> = {
    detected:   { color: '#ff3b3b', label: 'Detected',   step: 0 },
    confirmed:  { color: '#ff8800', label: 'Confirmed',  step: 1 },
    responding: { color: '#f5c518', label: 'Responding', step: 2 },
    resolving:  { color: '#3b9eff', label: 'Resolving',  step: 3 },
    cleared:    { color: '#50c878', label: 'Cleared',    step: 4 },
};

const RICON: Record<Responder['type'], React.ElementType> = {
    police: ShieldAlert, ambulance: HeartPulse, tow: Truck, fire: Flame,
};
const RCOLOR: Record<Responder['type'], string> = {
    police: '#3b9eff', ambulance: '#ff5c5c', tow: '#a78bfa', fire: '#ff8800',
};

function getRoleLabel(type: Responder['type']): string {
    const roles: Record<Responder['type'], string> = {
        police:    'Scene security + lane management',
        ambulance: 'Medical response + casualty assessment',
        tow:       'Emergency towing + road clearance',
        fire:      'Fire suppression + hazard containment',
    };
    return roles[type];
}
const RSTATUS: Record<ResponderStatus, { color: string; label: string }> = {
    en_route:   { color: '#3b9eff', label: 'En Route'   },
    arrived:    { color: '#50c878', label: 'Arrived'    },
    dispatched: { color: '#f5c518', label: 'Dispatched' },
    pending:    { color: '#666',    label: 'Pending'    },
};
const REC_COLOR: Record<Recommendation['type'], string> = {
    route:    'var(--accent-primary)',
    dispatch: '#ff5c5c',
    signal:   '#f5c518',
    escalate: '#a78bfa',
};
const REC_ICON: Record<Recommendation['type'], React.ElementType> = {
    route: Route, dispatch: Siren, signal: Signal, escalate: ChevronUp,
};

// ─── v3 design tokens ─────────────────────────────────────────────────────────

const AGENCY_CFG: Record<string, { color: string; bg: string; border: string }> = {
    'Traffic Control': { color: '#3b9eff', bg: 'rgba(59,158,255,0.07)', border: 'rgba(59,158,255,0.22)' },
    'Nairobi Police':  { color: '#a78bfa', bg: 'rgba(167,139,250,0.07)',border: 'rgba(167,139,250,0.22)' },
    'KENHA':           { color: '#f5c518', bg: 'rgba(245,197,24,0.07)', border: 'rgba(245,197,24,0.22)' },
    'NTSA':            { color: '#50c878', bg: 'rgba(80,200,120,0.07)', border: 'rgba(80,200,120,0.22)' },
    'Emergency Svcs':  { color: '#ff5c5c', bg: 'rgba(255,92,92,0.07)',  border: 'rgba(255,92,92,0.22)'  },
};

const FORECAST_CFG: Record<ForecastAlert['type'], { icon: React.ElementType; label: string }> = {
    congestion:    { icon: Activity,     label: 'Congestion Risk' },
    accident_risk: { icon: AlertTriangle,label: 'Accident Risk'   },
    weather:       { icon: CloudRain,    label: 'Weather Impact'  },
    cluster:       { icon: Radar,        label: 'Vehicle Cluster' },
};

// ─── Mock queue data (v3 — multi-incident context) ────────────────────────────

const MOCK_QUEUE: QueueEntry[] = [
    { id: 'INC-2026-0847', name: 'Multi-vehicle collision',         location: 'Thika Rd / Pangani',        severity: 'critical', status: 'responding', elapsed: '18m',  responders: 4, aiConf: 94 },
    { id: 'INC-2026-0843', name: 'Road obstruction — fallen tree',  location: 'Ngong Rd, Adams Arcade',    severity: 'high',     status: 'confirmed',  elapsed: '34m',  responders: 2, aiConf: 88 },
    { id: 'INC-2026-0840', name: 'Fuel spill — lane closure',       location: 'Mombasa Rd near JKIA',      severity: 'high',     status: 'detected',   elapsed: '6m',   responders: 1, aiConf: 81 },
    { id: 'INC-2026-0836', name: 'Minor collision — PSV vs sedan',  location: 'Uhuru Hwy, Globe R\'about', severity: 'medium',   status: 'resolving',  elapsed: '52m',  responders: 2, aiConf: 91 },
    { id: 'INC-2026-0829', name: 'Pedestrian incident — crosswalk', location: 'Jogoo Rd, Makadara',        severity: 'medium',   status: 'responding', elapsed: '1h 4m',responders: 3, aiConf: 76 },
    { id: 'INC-2026-0821', name: 'Broken-down HGV — 2 lanes',       location: 'Waiyaki Way, Westlands',    severity: 'low',      status: 'cleared',    elapsed: '2h 1m',responders: 1, aiConf: 97 },
];

const MOCK_FORECAST: ForecastAlert[] = [
    { id: 'FC-01', type: 'accident_risk', message: 'Abnormal vehicle clustering detected — high rear-end risk', location: 'Thika Rd near Muthaiga', risk: 'critical', eta: 'in ~4 min', conf: 87 },
    { id: 'FC-02', type: 'congestion',    message: 'Evening peak surge — Ngong Rd predicted at 93% capacity',  location: 'Ngong Rd, Dagoretti',    risk: 'high',     eta: 'in ~18 min',conf: 82 },
    { id: 'FC-03', type: 'weather',       message: 'Rain onset reducing visibility — braking distance up 40%', location: 'Mombasa Rd corridor',    risk: 'high',     eta: 'in ~12 min',conf: 79 },
];

const MOCK_AGENCIES: AgencyAssignment[] = [
    { agency: 'Traffic Control', label: 'Traffic Control Ops',   icon: Signal,     color: '#3b9eff', role: 'Signal coordination + traffic redirection',   contact: 'Kamau N. · Ext 212',   status: 'active',    lastUpdate: '2 min ago' },
    { agency: 'Nairobi Police',  label: 'NPS — Traffic Unit',    icon: ShieldAlert,color: '#a78bfa', role: 'Scene security + lane management',             contact: 'Sgt. Otieno · 0722 …', status: 'en_route',  lastUpdate: '5 min ago' },
    { agency: 'Emergency Svcs',  label: 'Kenya Red Cross EMS',   icon: HeartPulse, color: '#ff5c5c', role: 'Medical response + casualty assessment',       contact: 'Unit KRC-04 · Radio',  status: 'active',    lastUpdate: 'Live'      },
    { agency: 'KENHA',           label: 'KENHA — Roads Ops',     icon: Route,      color: '#f5c518', role: 'Emergency towing + road clearance',            contact: 'Wanjiru M. · Ext 341', status: 'en_route',  lastUpdate: '8 min ago' },
    { agency: 'NTSA',            label: 'NTSA Enforcement',      icon: BadgeAlert, color: '#50c878', role: 'Incident documentation + PSV compliance',      contact: 'Achieng P. · 0733 …',  status: 'standby',   lastUpdate: '12 min ago'},
];

const MOCK_CORRIDORS: CorridorImpact[] = [
    { id: 'C1', name: 'Thika Rd Inbound',    density: 93, deltaVeh: +340, rerouted: true,  signalAdj: true  },
    { id: 'C2', name: 'Thika Rd Outbound',   density: 47, deltaVeh: -80,  rerouted: false, signalAdj: true  },
    { id: 'C3', name: 'Muranga Rd bypass',   density: 61, deltaVeh: +210, rerouted: true,  signalAdj: false },
    { id: 'C4', name: 'Ngara Rd diversion',  density: 72, deltaVeh: +140, rerouted: true,  signalAdj: true  },
    { id: 'C5', name: 'Limuru Rd alt',       density: 38, deltaVeh: +90,  rerouted: false, signalAdj: false },
];

// ─── API helpers (unchanged from v2) ─────────────────────────────────────────

const BASE = '/api/incidents';

async function apiPost<T = unknown>(path: string, body?: object): Promise<T> {
    const r = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
}

async function apiPatch<T = unknown>(path: string, body: object): Promise<T> {
    const r = await fetch(path, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
}

// ─── Utility hooks (unchanged from v2) ───────────────────────────────────────

function useLiveClock() {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
}

function useApiAction() {
    const [loading, setLoading] = useState<string | null>(null);
    const [error,   setError]   = useState<string | null>(null);
    const run = useCallback(async (key: string, fn: () => Promise<unknown>) => {
        setLoading(key); setError(null);
        try   { await fn(); }
        catch (e) { setError((e as Error).message); }
        finally   { setLoading(null); }
    }, []);
    return { loading, error, run };
}

// ─── Shared formatting (unchanged from v2) ────────────────────────────────────

function fmtRelative(d: Date): string {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 0)  return `in ~${Math.abs(Math.floor(s / 60))}m`;
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

// ─── Shared primitives (unchanged from v2) ────────────────────────────────────

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
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.color, animation: 'pulse-dot 1.8s ease infinite', display: 'inline-block' }} />
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

function ActionBtn({ label, icon: Icon, color, onClick, primary, loading, disabled, size = 'sm' }: {
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
// LOADING SKELETON (unchanged from v2)
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: 'var(--bg-base)' }}>
            <div className="shrink-0 flex items-center gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', borderLeft: '3px solid var(--border-default)', background: 'var(--bg-raised)' }}>
                <div className="rounded-xl animate-pulse" style={{ width: 40, height: 40, background: 'var(--bg-elevated)' }} />
                <div className="flex flex-col gap-2">
                    <div className="rounded animate-pulse" style={{ width: 180, height: 10, background: 'var(--bg-elevated)' }} />
                    <div className="rounded animate-pulse" style={{ width: 120, height: 8, background: 'var(--bg-elevated)' }} />
                </div>
                <div className="flex-1" />
                {[80, 60, 70].map((w, i) => <div key={i} className="rounded-xl animate-pulse" style={{ width: w, height: 40, background: 'var(--bg-elevated)' }} />)}
            </div>
            <div className="shrink-0 px-5 py-2 animate-pulse" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', height: 38 }} />
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-disabled)' }}>Loading incident data…</span>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR STATE (unchanged from v2)
// ─────────────────────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="flex flex-col overflow-hidden items-center justify-center gap-4" style={{ height: '100dvh', background: 'var(--bg-base)' }}>
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 52, height: 52, background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.25)' }}>
                <AlertTriangle size={22} style={{ color: '#ff3b3b' }} />
            </div>
            <div className="flex flex-col items-center gap-1">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Failed to load incident</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)' }}>{message}</span>
            </div>
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 rounded-xl"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.54rem', borderColor: 'rgba(255,59,59,0.3)', color: '#ff3b3b' }}>
                <RefreshCw size={11} /> Retry
            </Button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE A — IncidentHeader (unchanged from v2)
// ─────────────────────────────────────────────────────────────────────────────

function IncidentHeader({ incident, selectedEntity, onSelectIncident, onStatusChange, onClose }: {
    incident: Incident; selectedEntity: SelectedEntity;
    onSelectIncident: () => void; onStatusChange: (s: IncidentStatus) => void; onClose?: () => void;
}) {
    const now      = useLiveClock();
    const elapsed  = fmtDuration(now.getTime() - new Date(incident.detectedAt).getTime());
    const s        = SEV[incident.severity];
    const isSelected = selectedEntity.type === 'incident';

    return (
        <div onClick={onSelectIncident}
             className="shrink-0 flex items-center gap-4 px-5 py-3 flex-wrap cursor-pointer transition-all duration-200"
             style={{ background: `linear-gradient(135deg, ${s.bg} 0%, var(--bg-raised) 60%)`, borderBottom: `1px solid ${isSelected ? `${s.color}40` : s.border}`, borderLeft: `3px solid ${s.color}`, boxShadow: isSelected ? `inset 0 0 24px ${s.color}06` : 'none', position: 'relative', overflow: 'hidden' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at left top, ${s.color}08 0%, transparent 60%)` }} />

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
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.82rem,0.7rem+0.4vw,1rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{incident.name}</span>
                </div>
            </div>

            <div className="flex flex-col gap-0.5 shrink-0">
                <div className="flex items-center gap-1">
                    <MapPin size={10} style={{ color: 'var(--text-disabled)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: 'var(--text-secondary)' }}>{incident.location}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-disabled)' }}>{incident.zone}</span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {[
                    { label: 'ELAPSED',   value: elapsed,                    color: s.color                 },
                    { label: 'AI CONF',   value: `${incident.confidence}%`,  color: 'var(--accent-primary)' },
                    { label: 'EST CLEAR', value: `${incident.clearanceEta}m`,color: '#f5c518'               },
                ].map(k => (
                    <div key={k.label} className="flex flex-col items-center gap-[2px] px-2.5 py-1.5 rounded-xl" style={{ background: `${k.color}08`, border: `1px solid ${k.color}20` }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--text-disabled)', letterSpacing: '0.08em' }}>{k.label}</span>
                    </div>
                ))}

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
                            <DropdownMenuItem key={st} onClick={() => onStatusChange(st)} className="flex items-center gap-2 text-[0.54rem] cursor-pointer py-1.5 px-2">
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
// STATUS PROGRESS STRIP (unchanged from v2)
// ─────────────────────────────────────────────────────────────────────────────

function StatusProgressStrip({ status }: { status: IncidentStatus }) {
    const steps = Object.keys(STA) as IncidentStatus[];
    const cur   = STA[status].step;
    return (
        <div className="shrink-0 flex items-center gap-0 px-5 py-2" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
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
                            <div className="flex-1 h-px mx-2 min-w-[8px] transition-all duration-400" style={{ background: done ? `${STA[steps[i + 1]].color}28` : 'var(--border-subtle)' }} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — ZONE 0: ProactiveForecastBanner
// AI anomaly detection strip — lives above everything else
// ─────────────────────────────────────────────────────────────────────────────

function ProactiveForecastBanner({ alerts }: { alerts: ForecastAlert[] }) {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [expanded, setExpanded]   = useState(false);

    const visible = alerts.filter(a => !dismissed.includes(a.id));
    if (visible.length === 0) return null;

    const top = visible[0];
    const riskColor = top.risk === 'critical' ? '#ff3b3b' : top.risk === 'high' ? '#ff8800' : '#f5c518';
    const TopIcon   = FORECAST_CFG[top.type].icon;

    return (
        <div className="shrink-0 overflow-hidden transition-all duration-300" style={{ background: `${riskColor}06`, borderBottom: `1px solid ${riskColor}22` }}>
            {/* Collapsed row */}
            <button onClick={() => setExpanded(v => !v)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.01)]"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}>
                <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 24, height: 24, background: `${riskColor}14`, border: `1px solid ${riskColor}28` }}>
                    <TopIcon size={11} strokeWidth={2} style={{ color: riskColor }} />
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: riskColor, whiteSpace: 'nowrap' }}>
                        {FORECAST_CFG[top.type].label}
                    </span>
                    <span className="flex-1 truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-secondary)' }}>{top.message}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>{top.location} · {top.eta}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="px-1.5 py-[2px] rounded-full" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', fontWeight: 700, background: `${riskColor}14`, color: riskColor }}>
                        {visible.length} proactive alert{visible.length > 1 ? 's' : ''}
                    </span>
                    {expanded ? <ChevronDown size={11} style={{ color: 'var(--text-disabled)' }} /> : <ChevronRight size={11} style={{ color: 'var(--text-disabled)' }} />}
                </div>
            </button>

            {/* Expanded — all alerts */}
            {expanded && (
                <div className="px-4 pb-3 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${riskColor}12` }}>
                    {visible.map(alert => {
                        const rColor = alert.risk === 'critical' ? '#ff3b3b' : alert.risk === 'high' ? '#ff8800' : '#f5c518';
                        const AIcon  = FORECAST_CFG[alert.type].icon;
                        return (
                            <div key={alert.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                                 style={{ background: `${rColor}06`, border: `1px solid ${rColor}18` }}>
                                <AIcon size={11} strokeWidth={2} style={{ color: rColor, flexShrink: 0 }} />
                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-secondary)' }}>{alert.message}</span>
                                    <div className="flex items-center gap-3">
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>{alert.location}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: rColor }}>{alert.eta}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>AI conf: {alert.conf}%</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button size="sm" variant="outline" className="h-6 text-[0.48rem] gap-1 rounded-lg"
                                            style={{ fontFamily: 'var(--font-mono)', background: `${rColor}10`, borderColor: `${rColor}28`, color: rColor }}>
                                        <Eye size={9} /> Pre-empt
                                    </Button>
                                    <button onClick={() => setDismissed(d => [...d, alert.id])}
                                            className="flex items-center justify-center rounded-lg transition-colors"
                                            style={{ width: 22, height: 22, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', cursor: 'pointer', color: 'var(--text-disabled)' }}>
                                        <X size={9} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — ZONE Q: IncidentQueuePanel (left sidebar)
// ─────────────────────────────────────────────────────────────────────────────

function IncidentQueueCard({ entry, isActive, onClick }: {
    entry: QueueEntry; isActive: boolean; onClick: () => void;
}) {
    const s = SEV[entry.severity];
    const t = STA[entry.status];
    return (
        <button onClick={onClick}
                className="w-full flex flex-col gap-1.5 p-2.5 rounded-xl text-left transition-all duration-200"
                style={{
                    background:  isActive ? `${s.color}10` : 'var(--bg-elevated)',
                    border:      `1px solid ${isActive ? `${s.color}38` : 'var(--border-subtle)'}`,
                    borderLeft:  `2px solid ${isActive ? s.color : 'transparent'}`,
                    boxShadow:   isActive ? `0 0 12px ${s.color}14` : 'none',
                    cursor:      'pointer', outline: 'none',
                    transform:   isActive ? 'translateX(1px)' : 'none',
                }}>
            {/* Top row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: s.color, animation: entry.severity === 'critical' ? 'pulse-dot 1.2s ease infinite' : 'none' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>{entry.id}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: t.color, fontWeight: 600 }}>{t.label}</span>
            </div>
            {/* Incident name */}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 700, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}>
                {entry.name}
            </span>
            {/* Location */}
            <div className="flex items-center gap-1">
                <MapPin size={9} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text-muted)' }}>{entry.location}</span>
            </div>
            {/* Footer chips */}
            <div className="flex items-center gap-2 mt-0.5">
                <SevBadge severity={entry.severity} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>{entry.elapsed}</span>
                <div className="flex-1" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-1.5 py-[2px] rounded-md" style={{ background: 'rgba(59,158,255,0.08)', border: '1px solid rgba(59,158,255,0.18)' }}>
                            <Users size={8} style={{ color: 'var(--accent-primary)' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--accent-primary)', fontWeight: 700 }}>{entry.responders}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem' }}>
                        {entry.responders} responders assigned
                    </TooltipContent>
                </Tooltip>
            </div>
        </button>
    );
}

function IncidentQueuePanel({
                                activeId,
                                incidents,
                                onSelect,
                            }: {
    activeId:  string;
    incidents: Incident[] | null;
    onSelect:  (id: string) => void;
}) {
    // 1. Get a stable 'now' object from your existing hook
    const now = useLiveClock();

    // 2. Wrap the queue mapping in useMemo for performance and purity
    const queue: QueueEntry[] = React.useMemo(() => {
        return (incidents ?? []).map(inc => ({
            id:         inc.id,
            name:       inc.name,
            location:   inc.location,
            severity:   inc.severity,
            status:     inc.status,
            // Use now.getTime() instead of Date.now()
            elapsed:    fmtDuration(now.getTime() - new Date(inc.detectedAt).getTime()),
            responders: inc.responders.length,
            aiConf:     inc.confidence,
        }));
    }, [incidents, now]); // Only recalculates when incidents change or the clock ticks

    const criticalCount = queue.filter(q => q.severity === 'critical' && q.status !== 'cleared').length;
    const openCount     = queue.filter(q => q.status !== 'cleared').length;

    return (
        <div className="h-full flex flex-col overflow-hidden"
             style={{ background: 'var(--bg-raised)', borderRight: '1px solid var(--border-default)' }}>

            {/* Panel header */}
            <div className="shrink-0 px-3 py-2.5 flex flex-col gap-1.5"
                 style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Layers size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>
                            Incident Queue
                        </span>
                    </div>
                    <span className="flex items-center justify-center rounded-full"
                          style={{ width: 18, height: 18, background: 'rgba(255,59,59,0.12)', border: '1px solid rgba(255,59,59,0.28)', fontFamily: 'var(--font-mono)', fontSize: '0.44rem', fontWeight: 800, color: '#ff3b3b' }}>
                        {incidents === null ? '…' : openCount}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {incidents === null ? (
                        // Skeleton chips while loading
                        <>
                            <div className="rounded animate-pulse" style={{ width: 48, height: 8, background: 'var(--bg-elevated)' }} />
                            <div className="rounded animate-pulse" style={{ width: 36, height: 8, background: 'var(--bg-elevated)' }} />
                        </>
                    ) : (
                        <>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: '#ff3b3b', fontWeight: 600 }}>
                                {criticalCount} critical
                            </span>
                            <span style={{ color: 'var(--text-disabled)', fontSize: '0.44rem' }}>·</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-muted)' }}>
                                {openCount} open
                            </span>
                        </>
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1.5 p-2">
                    {incidents === null
                        // Loading skeletons — same count as a typical queue
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="rounded-xl animate-pulse p-2.5"
                                 style={{ height: 80, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                        ))
                        : queue.map(entry => (
                            <IncidentQueueCard
                                key={entry.id}
                                entry={entry}
                                isActive={entry.id === activeId}
                                onClick={() => onSelect(entry.id)}
                            />
                        ))
                    }
                </div>
            </ScrollArea>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE C — Action panel components (all preserved from v2)
// ─────────────────────────────────────────────────────────────────────────────

function RecCard({ rec, incidentId, onUpdate }: {
    rec: Recommendation; incidentId: string;
    onUpdate: (id: string, status: Recommendation['status']) => void;
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
            <div className="flex items-start gap-2">
                <div className="flex items-center justify-center rounded-lg shrink-0 mt-0.5" style={{ width: 24, height: 24, background: `${color}14`, border: `1px solid ${color}26` }}>
                    <Icon size={11} strokeWidth={2} style={{ color }} />
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{rec.title}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{rec.description}</span>
                </div>
                {isDone && (
                    <div className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: rec.status === 'approved' ? 'rgba(80,200,120,0.12)' : 'rgba(255,59,59,0.08)', border: `1px solid ${rec.status === 'approved' ? 'rgba(80,200,120,0.25)' : 'rgba(255,59,59,0.2)'}` }}>
                        {rec.status === 'approved' ? <Check size={8} style={{ color: '#50c878' }} /> : <X size={8} style={{ color: '#ff3b3b' }} />}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', fontWeight: 700, color: rec.status === 'approved' ? '#50c878' : '#ff3b3b', letterSpacing: '0.06em' }}>
                            {rec.status.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
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
            {!isDone && (
                <div className="flex gap-1.5">
                    <ActionBtn label="Approve" icon={CheckCircle2} color="#50c878"             onClick={approve} loading={loading === 'approve'} primary />
                    <ActionBtn label="Preview" icon={Eye}          color="var(--accent-primary)" onClick={() => {}} />
                    <ActionBtn label=""        icon={X}            color="var(--text-muted)"    onClick={reject}  loading={loading === 'reject'} size="sm" />
                </div>
            )}
        </div>
    );
}

function DefaultState({ incident, allIncidents , onSelectIncident }: {
    incident: Incident;
    allIncidents: Incident[] | null;
    onSelectIncident: () => void;
}) {
    const pending = incident.recommendations.filter(r => r.status === 'pending');
    return (
        <div className="flex flex-col gap-4 px-4 py-4">
            {pending[0] && (
                <div className="flex flex-col gap-2 p-3 rounded-2xl" style={{ background: 'rgba(59,158,255,0.05)', border: '1px solid rgba(59,158,255,0.18)', borderLeft: '3px solid var(--accent-primary)' }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Bot size={11} strokeWidth={2} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>Top AI Recommendation</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{pending[0].title}</span>
                    <ConfBar value={pending[0].confidence} color="var(--accent-primary)" label="Confidence" />
                </div>
            )}
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
            <div className="flex flex-col gap-2">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Network Status</span>
                {[
                    { label: 'Active incidents', value: allIncidents ? `${allIncidents.filter(i => i.status !== 'cleared').length}` : '…', color: '#ff8800' },
                    { label: 'Vehicles in CBD',   value: '18k',  color: '#f5c518' },
                    { label: 'Signal coverage',   value: '94%',  color: '#50c878' },
                ].map(k => (
                    <div key={k.label} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text-muted)' }}>{k.label}</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 800, color: k.color }}>{k.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function IncidentSelectedState({ incident, onRecUpdate, onAction }: {
    incident: Incident; onRecUpdate: (id: string, status: Recommendation['status']) => void; onAction: (action: string) => void;
}) {
    const { loading, run } = useApiAction();
    const quickActions = [
        { key: 'redirect',  label: 'Redirect Traffic', icon: Route,        color: 'var(--accent-primary)' },
        { key: 'dispatch',  label: 'Dispatch',          icon: Siren,        color: '#ff5c5c'               },
        { key: 'signals',   label: 'Adjust Signals',    icon: Signal,       color: '#f5c518'               },
        { key: 'escalate',  label: 'Escalate',          icon: ChevronUp,    color: '#a78bfa'               },
        { key: 'resolve',   label: 'Resolve',           icon: Check,        color: '#50c878'               },
        { key: 'confirm',   label: 'Confirm',           icon: CheckCircle2, color: '#3b9eff'               },
    ];
    return (
        <ScrollArea className="flex-1">
            <div className="px-4 py-4 flex flex-col gap-5">
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
                <section>
                    <div className="flex items-center gap-1.5 mb-3">
                        <Zap size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Quick Actions</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {quickActions.map(a => (
                            <Button key={a.key} variant="outline" size="sm" disabled={loading === a.key}
                                    onClick={() => run(a.key, async () => {
                                        if (a.key === 'redirect') await apiPost(`${BASE}/${incident.id}/traffic/reroute`);
                                        if (a.key === 'signals')  await apiPost(`${BASE}/${incident.id}/signals/adjust`);
                                        if (a.key === 'confirm')  await apiPost(`${BASE}/${incident.id}/confirm`);
                                        if (a.key === 'escalate') await apiPost(`${BASE}/${incident.id}/escalate`);
                                        if (a.key === 'resolve')  await apiPost(`${BASE}/${incident.id}/resolve`);
                                        onAction(a.key);
                                    })}
                                    className="h-8 gap-1.5 text-[0.54rem] font-semibold tracking-wide rounded-xl transition-all duration-150"
                                    style={{ fontFamily: 'var(--font-mono)', background: `${a.color}08`, borderColor: `${a.color}28`, color: a.color }}>
                                {loading === a.key ? <Loader2 size={11} className="animate-spin" /> : <a.icon size={12} strokeWidth={2} />}
                                {a.label}
                            </Button>
                        ))}
                    </div>
                </section>
                <section>
                    <div className="flex items-center gap-1.5 mb-3">
                        <BarChart3 size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Impact Metrics</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Vehicles',  value: incident.vehiclesAffected.toLocaleString(), unit: 'affected', icon: Car,       color: '#ff8800' },
                            { label: 'Avg Delay', value: `${incident.avgDelay}`,                     unit: 'min',      icon: Clock,     color: '#f5c518' },
                            { label: 'Congestion',value: `${incident.congestionIndex}`,              unit: '/ 100',    icon: BarChart3, color: incident.congestionIndex > 70 ? '#ff3b3b' : '#ff8800' },
                            { label: 'ETA Clear', value: `${incident.clearanceEta}`,                 unit: 'min',      icon: RefreshCw, color: '#50c878' },
                        ].map(m => (
                            <div key={m.label} className="flex flex-col gap-1.5 p-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
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

function ResponderSelectedState({ responder, incidentId, onDispatch, onDeselect }: {
    responder: Responder; incidentId: string; onDispatch: (id: string) => void; onDeselect: () => void;
}) {
    const { loading, run } = useApiAction();
    const Icon   = RICON[responder.type];
    const color  = RCOLOR[responder.type];
    const sMeta  = RSTATUS[responder.status];

    const dispatch = () => run('dispatch', async () => {
        await apiPost(`${BASE}/${incidentId}/responders/${responder.id}/dispatch`);
        onDispatch(responder.id);
    });
    const reroute = () => run('reroute', async () => {
        await apiPatch(`${BASE}/${incidentId}/responders/${responder.id}/route`, { optimize: true });
    });

    return (
        <div className="flex flex-col gap-4 px-4 py-4">
            <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: `${color}08`, border: `1px solid ${color}22` }}>
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
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'ETA',      value: responder.eta !== null ? `${responder.eta} min` : 'On scene', color: responder.eta !== null && responder.eta <= 5 ? '#f5c518' : '#50c878' },
                        { label: 'Distance', value: responder.distance, color: 'var(--text-secondary)' },
                    ].map(s => (
                        <div key={s.label} className="flex flex-col gap-[3px] px-2.5 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>{s.label}</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'rgba(59,158,255,0.04)', border: '1px solid rgba(59,158,255,0.18)', borderLeft: '3px solid var(--accent-primary)' }}>
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
            <div className="flex flex-col gap-2">
                {responder.status === 'pending' && (
                    <ActionBtn label="Dispatch to Incident" icon={Send} color="#ff8800" onClick={dispatch} loading={loading === 'dispatch'} primary size="md" />
                )}
                <ActionBtn label="Reroute with AI" icon={Navigation} color="var(--accent-primary)" onClick={reroute} loading={loading === 'reroute'} size="md" />
                <div className="flex gap-2">
                    <ActionBtn label="Contact"      icon={Phone}     color="var(--text-muted)" onClick={() => {}} />
                    <ActionBtn label="Track on Map" icon={Crosshair} color="var(--text-muted)" onClick={() => {}} />
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onDeselect} className="h-7 gap-1.5 text-[0.5rem] self-start"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)' }}>
                <X size={10} /> Back to incident
            </Button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — CoordinationTab (multi-agency panel)
// ─────────────────────────────────────────────────────────────────────────────


function CoordinationTab({ incident }: { incident: Incident }) {
    const { loading, run } = useApiAction();

    const statusColors = {
        active:    { color: '#50c878', label: 'Active'    },
        en_route:  { color: '#3b9eff', label: 'En Route'  },
        standby:   { color: '#f5c518', label: 'Standby'   },
        completed: { color: '#666',    label: 'Completed' },
    };

    // Map responder status → agency card status
    const responderToAgencyStatus = (s: Responder['status']): keyof typeof statusColors => {
        if (s === 'arrived')    return 'active';
        if (s === 'en_route')   return 'en_route';
        if (s === 'dispatched') return 'en_route';
        return 'standby';
    };

    // Derive agency cards from real responders — no more MOCK_AGENCIES
    const agencies = incident.responders.map(r => {
        const Icon  = RICON[r.type];
        const color = RCOLOR[r.type];
        const agencyStatus = responderToAgencyStatus(r.status);
        return {
            id:         r.id,
            badge:      r.badge,
            name:       r.name,
            type:       r.type,
            icon:       Icon,
            color,
            role:       getRoleLabel(r.type),
            contact:    r.badge,
            status:     agencyStatus as keyof typeof statusColors,
            eta:        r.eta,
        };
    });

    // Derive green corridors from dispatched/en-route responders
    const activeCorridors = incident.responders
        .filter(r => r.status === 'en_route' || r.status === 'dispatched')
        .map(r => ({
            id:     r.id,
            label:  `${r.name}`,
            route:  `${r.distance} from scene`,
            eta:    r.eta !== null ? `${r.eta} min` : 'On scene',
            active: r.status === 'en_route',
        }));

    const activeAgencyCount = agencies.filter(a => a.status === 'active' || a.status === 'en_route').length;

    return (
        <ScrollArea className="flex-1">
            <div className="px-4 py-4 flex flex-col gap-4">

                {/* Section header */}
                <div className="flex items-center gap-1.5">
                    <Network size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>
                        Responder Assignments
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    <span className="flex items-center justify-center rounded-full"
                          style={{ width: 16, height: 16, background: 'rgba(59,158,255,0.12)', border: '1px solid rgba(59,158,255,0.28)', fontFamily: 'var(--font-mono)', fontSize: '0.44rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        {activeAgencyCount}
                    </span>
                </div>

                {/* Agency/responder cards */}
                {agencies.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6">
                        <Users size={20} style={{ color: 'var(--text-disabled)' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-disabled)' }}>
                            No responders assigned yet
                        </span>
                    </div>
                ) : (
                    agencies.map(ag => {
                        const sc   = statusColors[ag.status];
                        const AIcon = ag.icon;
                        const cfg   = { color: ag.color, bg: `${ag.color}07`, border: `${ag.color}22` };
                        return (
                            <div key={ag.id} className="flex flex-col gap-2.5 p-3 rounded-xl"
                                 style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                {/* Top row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center justify-center rounded-lg"
                                             style={{ width: 28, height: 28, background: `${ag.color}16`, border: `1px solid ${ag.color}28` }}>
                                            <AIcon size={13} strokeWidth={2} style={{ color: ag.color }} />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                                                {ag.name}
                                            </span>
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: 'var(--text-muted)' }}>
                                                {ag.contact}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                                         style={{ background: `${sc.color}10`, border: `1px solid ${sc.color}25` }}>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                              style={{ background: sc.color, animation: ag.status === 'active' || ag.status === 'en_route' ? 'pulse-dot 1.6s ease infinite' : 'none' }} />
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', fontWeight: 700, color: sc.color }}>
                                            {sc.label}
                                        </span>
                                    </div>
                                </div>
                                {/* Role */}
                                <div className="flex items-start gap-1.5">
                                    <ListChecks size={9} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0, marginTop: 1 }} />
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                        {ag.role}
                                    </span>
                                </div>
                                {/* ETA row */}
                                {ag.eta !== null && (
                                    <div className="flex items-center gap-1.5">
                                        <Timer size={9} style={{ color: 'var(--text-disabled)' }} />
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: ag.eta <= 5 ? '#f5c518' : 'var(--text-muted)' }}>
                                            ETA {ag.eta} min
                                        </span>
                                    </div>
                                )}
                                {/* Footer actions */}
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-1.5">
                                        <Button size="sm" variant="outline" className="h-6 px-2 text-[0.46rem] rounded-lg gap-1"
                                                style={{ fontFamily: 'var(--font-mono)', background: `${ag.color}08`, borderColor: `${ag.color}22`, color: ag.color }}>
                                            <Phone size={8} /> Contact
                                        </Button>
                                        {/* Dispatch button for pending responders */}
                                        {ag.status === 'standby' && (
                                            <Button size="sm" variant="outline"
                                                    disabled={loading === `dispatch-${ag.id}`}
                                                    onClick={() => run(`dispatch-${ag.id}`, async () => {
                                                        await apiPost(`${BASE}/${incident.id}/responders/${ag.id}/dispatch`);
                                                    })}
                                                    className="h-6 px-2 text-[0.46rem] rounded-lg gap-1"
                                                    style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,136,0,0.08)', borderColor: 'rgba(255,136,0,0.25)', color: '#ff8800' }}>
                                                {loading === `dispatch-${ag.id}` ? <Loader2 size={8} className="animate-spin" /> : <Send size={8} />}
                                                Dispatch
                                            </Button>
                                        )}
                                        {/* Reroute for en-route responders */}
                                        {ag.status === 'en_route' && (
                                            <Button size="sm" variant="outline"
                                                    disabled={loading === `reroute-${ag.id}`}
                                                    onClick={() => run(`reroute-${ag.id}`, async () => {
                                                        await apiPatch(`${BASE}/${incident.id}/responders/${ag.id}/route`, { optimize: true });
                                                    })}
                                                    className="h-6 px-2 text-[0.46rem] rounded-lg gap-1"
                                                    style={{ fontFamily: 'var(--font-mono)', background: 'rgba(59,158,255,0.08)', borderColor: 'rgba(59,158,255,0.22)', color: 'var(--accent-primary)' }}>
                                                {loading === `reroute-${ag.id}` ? <Loader2 size={8} className="animate-spin" /> : <Navigation size={8} />}
                                                Reroute
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Green corridors — derived from en-route responders */}
                {activeCorridors.length > 0 && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <Route size={11} strokeWidth={2} style={{ color: '#50c878', flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>
                                Active Corridors
                            </span>
                            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                        </div>
                        {activeCorridors.map(gc => (
                            <div key={gc.id} className="flex items-center gap-3 px-3 py-2 rounded-xl mb-1.5 last:mb-0"
                                 style={{ background: gc.active ? 'rgba(80,200,120,0.05)' : 'var(--bg-elevated)', border: `1px solid ${gc.active ? 'rgba(80,200,120,0.2)' : 'var(--border-subtle)'}` }}>
                                <span className="w-2 h-2 rounded-full shrink-0"
                                      style={{ background: gc.active ? '#50c878' : 'var(--border-default)', animation: gc.active ? 'pulse-dot 1.8s ease infinite' : 'none' }} />
                                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.56rem', fontWeight: 600, color: gc.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {gc.label}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {gc.route}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end shrink-0 gap-0.5">
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700, color: gc.active ? '#50c878' : 'var(--text-disabled)' }}>
                                        {gc.eta}
                                    </span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: gc.active ? 'rgba(80,200,120,0.6)' : 'var(--text-disabled)' }}>
                                        {gc.active ? 'EN ROUTE' : 'DISPATCHED'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — MetricsTab (operational insights)
// ─────────────────────────────────────────────────────────────────────────────

function MetricsTab({ incident }: { incident: Incident }) {
    const now     = useLiveClock();
    const elapsed = Math.floor((now.getTime() - new Date(incident.detectedAt).getTime()) / 60000);

    const responseTimes = [
        { label: 'Detection → Confirm',   value: 3,   unit: 'min', target: 5,  color: '#50c878' },
        { label: 'Confirm → First Resp.',  value: 8,   unit: 'min', target: 10, color: '#50c878' },
        { label: 'Dispatch → Arrival',     value: elapsed > 12 ? 12 : elapsed, unit: 'min', target: 15, color: elapsed > 12 ? '#50c878' : '#f5c518' },
        { label: 'Total Elapsed',          value: elapsed, unit: 'min', target: 45, color: elapsed > 35 ? '#ff3b3b' : elapsed > 20 ? '#ff8800' : '#f5c518' },
    ];

    return (
        <ScrollArea className="flex-1">
            <div className="px-4 py-4 flex flex-col gap-5">

                {/* Response time chain */}
                <section>
                    <div className="flex items-center gap-1.5 mb-3">
                        <Timer size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Response Time Chain</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                        {responseTimes.map((rt, i) => (
                            <div key={i} className="flex flex-col gap-1 p-2.5 rounded-xl"
                                 style={{ background: `${rt.color}06`, border: `1px solid ${rt.color}18` }}>
                                <div className="flex items-center justify-between">
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-muted)' }}>{rt.label}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', fontWeight: 800, color: rt.color, lineHeight: 1 }}>{rt.value}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>{rt.unit}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', color: 'var(--text-disabled)' }}>/ target {rt.target}</span>
                                    </div>
                                </div>
                                <Progress value={Math.min(100, (rt.value / rt.target) * 100)} className="h-[3px]"
                                          style={{ background: `${rt.color}14`, '--progress-foreground': rt.color } as React.CSSProperties} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Corridor density */}
                <section>
                    <div className="flex items-center gap-1.5 mb-3">
                        <Activity size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>Surrounding Corridors</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {MOCK_CORRIDORS.map(c => {
                            const dColor = c.density >= 80 ? '#ff3b3b' : c.density >= 60 ? '#ff8800' : '#f5c518';
                            return (
                                <div key={c.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                                     style={{ background: `${dColor}06`, border: `1px solid ${dColor}14` }}>
                                    <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.56rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{c.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: c.deltaVeh > 0 ? '#ff8800' : '#50c878' }}>
                                                {c.deltaVeh > 0 ? `+${c.deltaVeh}` : `${c.deltaVeh}`} veh
                                            </span>
                                            {c.rerouted  && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4rem', color: '#3b9eff' }}>rerouted</span>}
                                            {c.signalAdj && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4rem', color: '#f5c518' }}>signals adj.</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.76rem', fontWeight: 800, color: dColor, lineHeight: 1 }}>{c.density}%</span>
                                        <div className="h-[3px] rounded-full overflow-hidden" style={{ width: 48, background: 'rgba(255,255,255,0.06)' }}>
                                            <div style={{ width: `${c.density}%`, height: '100%', background: dColor, borderRadius: 9999 }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Clearance prediction */}
                <section>
                    <div className="flex items-center gap-1.5 mb-3">
                        <Cpu size={11} strokeWidth={2} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-disabled)' }}>AI Clearance Prediction</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                    </div>
                    <div className="flex flex-col gap-2 p-3 rounded-2xl"
                         style={{ background: 'rgba(59,158,255,0.04)', border: '1px solid rgba(59,158,255,0.18)', borderLeft: '3px solid var(--accent-primary)' }}>
                        <div className="flex items-center gap-1.5">
                            <Bot size={11} style={{ color: 'var(--accent-primary)' }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.1em', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Prediction Engine</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: 'Est. Clearance',  value: `${incident.clearanceEta}m`, color: '#f5c518' },
                                { label: 'Severity Factor', value: 'HIGH',      color: '#ff8800' },
                                { label: 'AI Confidence',   value: `${incident.confidence}%`, color: 'var(--accent-primary)' },
                            ].map(p => (
                                <div key={p.label} className="flex flex-col items-center gap-[3px] p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 800, color: p.color, lineHeight: 1 }}>{p.value}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4rem', color: 'var(--text-disabled)', textAlign: 'center', lineHeight: 1.3 }}>{p.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                Based on <strong style={{ color: 'var(--text-secondary)' }}>12 historical incidents</strong> of similar severity at this location.
                                Road clearance probable within <strong style={{ color: '#f5c518' }}>{incident.clearanceEta} min</strong> if all 4 responders remain engaged.
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </ScrollArea>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW — CommandPanel (replaces ContextualActionBar with 3-tab interface)
// Tabs: Actions (v2 content) | Coordinate (new) | Metrics (new)
// ─────────────────────────────────────────────────────────────────────────────

type CommandTab = 'actions' | 'coordinate' | 'metrics';

function CommandPanel({
                          incident, allIncidents, selectedEntity, onRecUpdate, onAction, onDispatch, onDeselect, onSelectIncident
                      }: {
    incident:         Incident;
    allIncidents:     Incident[] | null;
    selectedEntity:   SelectedEntity;
    onRecUpdate:      (id: string, status: Recommendation['status']) => void;
    onAction:         (action: string) => void;
    onDispatch:       (id: string) => void;
    onDeselect:       () => void;
    onSelectIncident: () => void;
}) {
    const [activeTab, setActiveTab] = useState<CommandTab>('actions');

    const selResponder = selectedEntity.type === 'responder'
        ? incident.responders.find(r => r.id === selectedEntity.id) ?? null
        : null;

    const panelTitle =
        selectedEntity.type === 'incident'  ? 'Incident Actions' :
            selectedEntity.type === 'responder' ? (selResponder?.name ?? 'Responder') :
                'Command Overview';

    const titleColor =
        selectedEntity.type === 'incident'  ? SEV[incident.severity].color :
            selectedEntity.type === 'responder' ? RCOLOR[selResponder?.type ?? 'police'] :
                'var(--text-secondary)';

    const pendingRecs    = incident.recommendations.filter(r => r.status === 'pending').length;
    const activeAgencies = MOCK_AGENCIES.filter(a => a.status === 'active' || a.status === 'en_route').length;

    const tabs: { id: CommandTab; label: string; icon: React.ElementType; badge?: number }[] = [
        { id: 'actions',    label: 'Actions',    icon: Zap,     badge: pendingRecs > 0 ? pendingRecs : undefined },
        { id: 'coordinate', label: 'Coordinate', icon: Network, badge: activeAgencies },
        { id: 'metrics',    label: 'Metrics',    icon: BarChart3 },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-raised)', borderLeft: '1px solid var(--border-default)' }}>
            {/* Panel header */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: titleColor, animation: 'pulse-dot 1.8s ease infinite' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{panelTitle}</span>
                <div className="flex-1" />
                {selectedEntity.type !== null && (
                    <button onClick={onDeselect} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <X size={12} style={{ color: 'var(--text-disabled)' }} />
                    </button>
                )}
            </div>

            {/* Tab switcher */}
            <div className="shrink-0 flex items-center gap-0 px-3 py-1.5"
                 style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
                {tabs.map(tab => {
                    const TIcon  = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg relative transition-all duration-150"
                                style={{
                                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                                    border:     `1px solid ${isActive ? 'var(--border-default)' : 'transparent'}`,
                                    cursor:     'pointer', outline: 'none',
                                }}>
                            <TIcon size={10} strokeWidth={2}
                                   style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-disabled)' }} />
                            <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: '0.48rem', fontWeight: isActive ? 700 : 400,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-disabled)', whiteSpace: 'nowrap',
                            }}>{tab.label}</span>
                            {tab.badge !== undefined && (
                                <span className="flex items-center justify-center rounded-full"
                                      style={{ width: 14, height: 14, background: isActive ? 'rgba(59,158,255,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isActive ? 'rgba(59,158,255,0.4)' : 'var(--border-subtle)'}`, fontFamily: 'var(--font-mono)', fontSize: '0.4rem', fontWeight: 800, color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            {activeTab === 'actions' && (
                <>
                    {selectedEntity.type === null && <DefaultState incident={incident} allIncidents={allIncidents} onSelectIncident={onSelectIncident} />}

                    {selectedEntity.type === 'incident' && <IncidentSelectedState incident={incident} onRecUpdate={onRecUpdate} onAction={onAction} />}
                    {selectedEntity.type === 'responder' && selResponder && (
                        <ResponderSelectedState responder={selResponder} incidentId={incident.id} onDispatch={onDispatch} onDeselect={onDeselect} />
                    )}
                </>
            )}
            {activeTab === 'coordinate' && <CoordinationTab incident={incident} />}
            {activeTab === 'metrics'    && <MetricsTab incident={incident} />}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE D — ResponderStrip (unchanged from v2)
// ─────────────────────────────────────────────────────────────────────────────

function ResponderStrip({ responders, selectedId, onSelect }: {
    responders: Responder[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
    return (
        <div className="shrink-0 flex flex-col" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
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
            <div className="flex gap-2.5 px-4 py-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {responders.map(r => {
                    const Icon       = RICON[r.type];
                    const color      = RCOLOR[r.type];
                    const sMeta      = RSTATUS[r.status];
                    const isSelected = r.id === selectedId;
                    return (
                        <button key={r.id} onClick={() => onSelect(r.id)}
                                className="flex flex-col gap-2 p-2.5 rounded-xl shrink-0 transition-all duration-200 text-left"
                                style={{ width: 112, background: isSelected ? `${color}14` : 'var(--bg-elevated)', border: `1px solid ${isSelected ? `${color}40` : 'var(--border-subtle)'}`, boxShadow: isSelected ? `0 0 12px ${color}18` : 'none', transform: isSelected ? 'translateY(-1px)' : 'none', cursor: 'pointer', outline: 'none' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: `${color}16`, border: `1px solid ${color}28` }}>
                                    <Icon size={13} strokeWidth={2} style={{ color }} />
                                </div>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sMeta.color, animation: r.status === 'en_route' ? 'pulse-dot 1.4s ease infinite' : 'none' }} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{r.name}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', color: sMeta.color, fontWeight: 600 }}>{sMeta.label}</span>
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700, color: r.eta !== null && r.eta <= 5 ? '#f5c518' : 'var(--text-muted)' }}>
                                {r.eta !== null ? `${r.eta}m` : 'On scene'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE E — LifecycleTimeline (unchanged from v2)
// ─────────────────────────────────────────────────────────────────────────────

const TL_TYPE: Record<TimelineEvent['type'], { color: string; icon: React.ElementType }> = {
    ai:        { color: 'var(--accent-primary)', icon: Bot        },
    operator:  { color: '#f5c518',               icon: Users      },
    system:    { color: 'var(--text-muted)',      icon: Radio      },
    responder: { color: '#50c878',               icon: ShieldAlert },
};

function LifecycleTimeline({ incident }: { incident: Incident }) {
    const [open,       setOpen]       = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const pct         = Math.round((incident.timeline.filter(e => e.completed).length / incident.timeline.length) * 100);
    const statusColor = STA[incident.status].color;

    return (
        <div className="shrink-0 flex flex-col" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-raised)' }}>
            <button onClick={() => setOpen(v => !v)}
                    className="flex items-center gap-3 px-4 py-2 w-full text-left transition-colors duration-150 hover:bg-[rgba(255,255,255,0.02)]"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none' }}>
                <Activity size={11} strokeWidth={2} style={{ color: '#50c878', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.46rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>Lifecycle</span>
                <div className="flex-1 flex items-center gap-2 mx-1">
                    <Progress value={pct} className="h-[3px] flex-1"
                              style={{ background: 'rgba(80,200,120,0.12)', '--progress-foreground': '#50c878' } as React.CSSProperties} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', fontWeight: 700, color: '#50c878', whiteSpace: 'nowrap' }}>{pct}%</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0" style={{ background: `${statusColor}10`, border: `1px solid ${statusColor}25` }}>
                    <span className="w-1 h-1 rounded-full" style={{ background: statusColor, display: 'inline-block' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', fontWeight: 700, color: statusColor }}>{STA[incident.status].label}</span>
                </div>
                {open ? <ChevronDown size={12} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} /> : <ChevronUp size={12} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />}
            </button>

            {open && (
                <div style={{ animation: 'slide-in-up 180ms ease', borderTop: '1px solid var(--border-subtle)' }}>
                    <ScrollArea style={{ maxHeight: 200 }}>
                        <div className="px-4 py-3 flex flex-col">
                            {incident.timeline.map((evt, i) => {
                                const m          = TL_TYPE[evt.type];
                                const Icon       = m.icon;
                                const isLast     = i === incident.timeline.length - 1;
                                const isFuture   = !evt.completed;
                                const isExpanded = expandedId === evt.id;
                                const evtTime    = new Date(evt.time);
                                return (
                                    <div key={evt.id} className="flex gap-2.5">
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
                                        <div className="flex-1 pb-2.5 cursor-pointer" style={{ opacity: isFuture ? 0.5 : 1 }}
                                             onClick={() => setExpandedId(isExpanded ? null : evt.id)}>
                                            <div className="flex items-center justify-between gap-2">
                                                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: evt.completed ? 600 : 400, color: evt.completed ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.3 }}>
                                                    {evt.label}
                                                </span>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                    {isFuture ? `~${fmtTime(evtTime)}` : fmtTime(evtTime)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-[2px]">
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', color: 'var(--text-disabled)' }}>
                                                    {isFuture ? 'Projected' : fmtRelative(evtTime)}
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
// COMPOSED PAGE — IncidentCommandCenter v3
// ─────────────────────────────────────────────────────────────────────────────

export default function IncidentCommandCenter() {
    // Active incident — starts on the seeded critical incident, switchable via queue
    const [activeIncidentId, setActiveIncidentId] = useState('INC-2026-0847');


    const { incident, allIncidents, setIncident, isLoading, error, refetch } =
        useIncidents(activeIncidentId);

    // UI selection state (local only)
    const [selected, setSelected] = useState<SelectedEntity>({ type: null, id: null });
    const selectIncident  = () => incident && setSelected({ type: 'incident',  id: incident.id });
    const selectResponder = (id: string) => setSelected({ type: 'responder', id });
    const deselect        = () => setSelected({ type: null, id: null });

    // When switching active incident, reset selection
    const handleQueueSelect = (id: string) => {
        setActiveIncidentId(id);
        setSelected({ type: null, id: null });
    };

    // Optimistic local mutations (preserved exactly from v2)
    const handleRecUpdate = (id: string, status: Recommendation['status']) =>
        setIncident(prev => prev ? ({ ...prev, recommendations: prev.recommendations.map(r => r.id === id ? { ...r, status } : r) }) : prev);

    const handleDispatch = (id: string) =>
        setIncident(prev => prev ? ({ ...prev, responders: prev.responders.map(r => r.id === id ? { ...r, status: 'dispatched' as const, eta: 12 } : r) }) : prev);

    const handleStatusChange = (s: IncidentStatus) =>
        setIncident(prev => prev ? ({ ...prev, status: s }) : prev);

    const handleAction = (action: string) => {
        if (action === 'confirm')   handleStatusChange('confirmed');
        if (action === 'resolve')   handleStatusChange('cleared');
        if (action === 'escalate')  handleStatusChange('responding');

        // Add handling for dispatch and redirect quick-actions
        if (action === 'dispatch') {
            handleStatusChange('responding');
            // Optimistically dispatch the first pending responder if one exists
            const firstPending = incident?.responders.find(r => r.status === 'pending');
            if (firstPending) handleDispatch(firstPending.id);
        }

        if (action === 'redirect' || action === 'signals') {
            // These don't change the main status, but we could add a
            // "System thinking..." timeline event here if desired.
        }
    };

    if (isLoading) return <LoadingSkeleton />;
    if (error || !incident) return <ErrorState message={error ?? 'Incident not found.'} onRetry={refetch} />;

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: 'var(--bg-base)' }}>

                {/* ── Zone 0: Proactive Forecast Banner ── */}
                <ProactiveForecastBanner alerts={MOCK_FORECAST} />

                {/* ── Zone A: Incident Header ── */}
                <IncidentHeader incident={incident} selectedEntity={selected} onSelectIncident={selectIncident} onStatusChange={handleStatusChange} />

                {/* ── Status Progress Strip ── */}
                <StatusProgressStrip status={incident.status} />

                {/* ── Main 3-column body ── */}
                <div className="flex-1 overflow-hidden min-h-0 flex">

                    {/* ── Zone Q: Incident Queue Panel ── */}
                    <div style={{ width: 200, flexShrink: 0 }}>
                        <IncidentQueuePanel
                            activeId={activeIncidentId}
                            incidents={allIncidents}          // real data from backend
                            onSelect={handleQueueSelect}
                        />
                    </div>

                    {/* ── Map + Responder Strip + Timeline ── */}
                    <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border-subtle)', borderLeft: '1px solid var(--border-subtle)' }}>

                        {/* Map zone — IncidentMap handles all Google Maps integration */}
                        <div className="flex-1 relative overflow-hidden min-h-0">
                            <IncidentMap
                                incident={incident}
                                // Use type-safe optional chaining
                                lat={(incident as MapReadyIncident).lat ?? (incident as MapReadyIncident).geo?.lat}
                                lng={(incident as MapReadyIncident).lng ?? (incident as MapReadyIncident).geo?.lng}
                                selectedResponderId={selected.id}
                                onSelectResponder={selectResponder}
                                onSelectIncident={selectIncident}
                            />
                        </div>

                        {/* Zone D: Responder Strip */}
                        <ResponderStrip
                            responders={incident.responders}
                            selectedId={selected.type === 'responder' ? selected.id : null}
                            onSelect={selectResponder}
                        />

                        {/* Zone E: Lifecycle Timeline */}
                        <LifecycleTimeline incident={incident} />
                    </div>

                    {/* ── Zone C+: Command Panel (tabbed) ── */}
                    <div style={{ width: 320, flexShrink: 0 }}>
                        <CommandPanel
                            incident={incident}
                            allIncidents={allIncidents}
                            selectedEntity={selected}
                            onRecUpdate={handleRecUpdate}
                            onAction={handleAction}
                            onDispatch={handleDispatch}
                            onDeselect={deselect}
                            onSelectIncident={selectIncident}
                        />
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}