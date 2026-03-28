"use client";

import { useState } from "react";
import {
    Brain, Bus, AlertTriangle, TrendingUp, TrendingDown, Activity,
    Clock, Shield, ShieldOff, Check, X, Edit3, Lock, ChevronDown,
    Zap, BarChart3, RefreshCw, Bell, Settings, User, ArrowRight,
    Navigation, Map, History, ToggleLeft, ToggleRight, Info,
    CircleDot, Waypoints, TrafficCone, Gauge, Route, Signal,
    Milestone, AlertCircle, Timer, Star, ArrowUpRight, MapPin,
    Play, Pause, CheckCircle2, XCircle, ShieldAlert, Layers,
    Radio, Eye, PhoneCall, Siren, Car, ChevronRight, Target,
    LayoutGrid, BadgeCheck, Minus, GitBranch,
    Workflow, ListChecks, Radar, Focus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Map integration ──────────────────────────────────────────────────────────
// TransportMap is loaded dynamically (ssr: false) because @vis.gl/react-google-maps
// requires browser globals. The fallback renders a plain loading slot.
import dynamic from "next/dynamic";

function TransportMapLoadingSlot() {
    const GRID = "rgba(255,255,255,0.06)";
    return (
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden"
             style={{ background: "#080b0f",
                 backgroundImage: `linear-gradient(${GRID} 1px,transparent 1px),linear-gradient(90deg,${GRID} 1px,transparent 1px)`,
                 backgroundSize: "40px 40px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.54rem",
                color: "var(--text-disabled)", letterSpacing: "0.12em",
                textTransform: "uppercase" }}>
                Loading map…
            </span>
        </div>
    );
}

const TransportMap = dynamic(
    () => import("@/components/map/TransportMap").then(m => ({ default: m.TransportMap })),
    { ssr: false, loading: () => <TransportMapLoadingSlot /> },
);

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type RouteStatus    = "critical" | "delayed" | "normal" | "optimal";
type ComplianceStatus = "adherent" | "minor_deviation" | "major_deviation" | "off_route";
type SignalMode     = "ai_managed" | "manual" | "fixed" | "emergency";
type SystemPhase    = 1 | 2 | 3;
type AIMode         = "assisted" | "operator";
type EnforcementTier = "soft" | "administrative" | "operational";

interface PSVRoute {
    id: string; name: string; corridor: string;
    origin: string; destination: string;
    status: RouteStatus; activeVehicles: number; totalVehicles: number;
    avgDelay: number; efficiency: number;
    avgTravelTime: number; baselineTravelTime: number;
    congestionLevel: number;
    complianceRate: number;
    deviationCount: number;
    signalMode: SignalMode;
    aiLocked: boolean;
    forecast30: number; forecast60: number;
    passengerLoad: number;
    phase: SystemPhase;
}

interface SignalCorridor {
    id: string; name: string; route: string;
    signals: number; mode: SignalMode;
    avgGreenTime: number; cycleLength: number;
    psvThroughput: number; // veh/hr
    aiRecommendedGreen: number;
    lastAdjusted: string;
    priorityActive: boolean;
}

interface AIRecommendation {
    id: string; routeId: string; routeName: string;
    type: "reroute" | "signal" | "infrastructure" | "pre_trip" | "compliance" | "emergency";
    action: string; reason: string; confidence: number;
    impact: string; timestamp: string;
    status: "pending" | "approved" | "overridden" | "rejected" | "auto_executed";
    urgency: "high" | "medium" | "low";
    executionType: "requires_approval" | "auto_within_policy" | "escalation_required";
}

interface DeviationEvent {
    id: string; routeId: string; routeName: string;
    vehicleId: string; driver: string;
    timestamp: string; location: string;
    deviation: string; severity: ComplianceStatus;
    tier: EnforcementTier; resolved: boolean;
    action: string;
}

interface PreTripGuidance {
    id: string; routeId: string; routeName: string;
    driver: string; vehicleId: string;
    scheduledDep: string;
    recommendedRoute: string; alternativeRoute?: string;
    expectedDelay: number; timeSaving: number;
    reason: string; accepted: boolean | null;
}

interface InfraTarget {
    id: string; location: string;
    type: "roundabout" | "bottleneck" | "signal_gap" | "merge_conflict";
    severity: "critical" | "high" | "medium";
    recommendation: string; affectedRoutes: string[];
    simGain: number; // % congestion reduction
    simTimeSaving: number; // minutes
    phase: SystemPhase;
}

interface AuditLog {
    id: string; operator: string; time: string; route: string;
    aiSuggestion: string; finalAction: string;
    type: "approved" | "overridden" | "rejected" | "auto_executed";
}

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const SYSTEM_PHASE: SystemPhase = 2;

const ROUTES: PSVRoute[] = [
    { id: "R-23", name: "Route 23", corridor: "Thika Rd", origin: "CBD", destination: "Thika Town", status: "critical",  activeVehicles: 14, totalVehicles: 18, avgDelay: 22, efficiency: 48, avgTravelTime: 94, baselineTravelTime: 72, congestionLevel: 87, complianceRate: 74, deviationCount: 4, signalMode: "ai_managed", aiLocked: false, forecast30: 91, forecast60: 78, passengerLoad: 96, phase: 1 },
    { id: "R-07", name: "Route 7",  corridor: "Ngong Rd",  origin: "CBD", destination: "Karen",      status: "delayed",   activeVehicles: 9,  totalVehicles: 12, avgDelay: 11, efficiency: 68, avgTravelTime: 55, baselineTravelTime: 45, congestionLevel: 64, complianceRate: 88, deviationCount: 1, signalMode: "manual",     aiLocked: false, forecast30: 72, forecast60: 58, passengerLoad: 78, phase: 2 },
    { id: "R-44", name: "Route 44", corridor: "Mombasa Rd",origin: "CBD", destination: "JKIA",       status: "normal",    activeVehicles: 11, totalVehicles: 11, avgDelay: 4,  efficiency: 82, avgTravelTime: 38, baselineTravelTime: 35, congestionLevel: 41, complianceRate: 94, deviationCount: 0, signalMode: "ai_managed", aiLocked: false, forecast30: 55, forecast60: 62, passengerLoad: 61, phase: 2 },
    { id: "R-11", name: "Route 11", corridor: "Jogoo Rd",  origin: "CBD", destination: "Eastlands",  status: "critical",  activeVehicles: 7,  totalVehicles: 15, avgDelay: 28, efficiency: 41, avgTravelTime: 67, baselineTravelTime: 40, congestionLevel: 93, complianceRate: 61, deviationCount: 7, signalMode: "fixed",      aiLocked: true,  forecast30: 95, forecast60: 88, passengerLoad: 99, phase: 1 },
    { id: "R-56", name: "Route 56", corridor: "Waiyaki Way",origin: "CBD",destination: "Westlands",  status: "optimal",   activeVehicles: 8,  totalVehicles: 8,  avgDelay: 0,  efficiency: 96, avgTravelTime: 22, baselineTravelTime: 22, congestionLevel: 18, complianceRate: 99, deviationCount: 0, signalMode: "ai_managed", aiLocked: false, forecast30: 28, forecast60: 44, passengerLoad: 52, phase: 2 },
    { id: "R-31", name: "Route 31", corridor: "Uhuru Hwy", origin: "CBD", destination: "Langata",    status: "delayed",   activeVehicles: 6,  totalVehicles: 10, avgDelay: 14, efficiency: 61, avgTravelTime: 48, baselineTravelTime: 38, congestionLevel: 57, complianceRate: 81, deviationCount: 2, signalMode: "manual",     aiLocked: false, forecast30: 66, forecast60: 53, passengerLoad: 71, phase: 2 },
];

const SIGNAL_CORRIDORS: SignalCorridor[] = [
    { id: "SC-01", name: "Thika Rd Corridor",    route: "R-23", signals: 7, mode: "ai_managed", avgGreenTime: 42, cycleLength: 90, psvThroughput: 38, aiRecommendedGreen: 58, lastAdjusted: "15:41", priorityActive: true  },
    { id: "SC-02", name: "Jogoo Rd Corridor",    route: "R-11", signals: 5, mode: "fixed",      avgGreenTime: 35, cycleLength: 85, psvThroughput: 21, aiRecommendedGreen: 52, lastAdjusted: "14:20", priorityActive: false },
    { id: "SC-03", name: "Ngong Rd Corridor",    route: "R-07", signals: 4, mode: "manual",     avgGreenTime: 38, cycleLength: 80, psvThroughput: 29, aiRecommendedGreen: 44, lastAdjusted: "15:10", priorityActive: false },
    { id: "SC-04", name: "Mombasa Rd Corridor",  route: "R-44", signals: 6, mode: "ai_managed", avgGreenTime: 44, cycleLength: 95, psvThroughput: 45, aiRecommendedGreen: 46, lastAdjusted: "15:38", priorityActive: true  },
    { id: "SC-05", name: "Waiyaki Way Corridor", route: "R-56", signals: 3, mode: "ai_managed", avgGreenTime: 40, cycleLength: 75, psvThroughput: 52, aiRecommendedGreen: 40, lastAdjusted: "15:44", priorityActive: true  },
];

const AI_RECOMMENDATIONS: AIRecommendation[] = [
    { id: "AR-001", routeId: "R-23", routeName: "Route 23", type: "signal",        action: "Increase green phase on Thika Rd × 4 signals from 42s → 58s",  reason: "Route 23 at 87% congestion, 14 PSVs bunched near Pangani junction", confidence: 91, impact: "Est. 14 min corridor improvement; +17 PSV throughput/hr",  timestamp: "15:44", status: "pending",       urgency: "high",   executionType: "requires_approval" },
    { id: "AR-002", routeId: "R-11", routeName: "Route 11", type: "compliance",    action: "Escalate 3 repeat-deviation vehicles on Jogoo Rd to administrative review", reason: "7 deviations in 4 hrs — threshold for Tier 2 exceeded",   confidence: 96, impact: "Prevents continued coverage gap on eastern corridor",         timestamp: "15:41", status: "pending",       urgency: "high",   executionType: "escalation_required" },
    { id: "AR-003", routeId: "R-07", routeName: "Route 7",  type: "pre_trip",      action: "Recommend Mbagathi Rd bypass to 4 pre-departure R-07 drivers",  reason: "Construction lane closure — 11 min saving vs current route",     confidence: 83, impact: "Saves 4 drivers × 11 min = 44 min collective time",          timestamp: "15:38", status: "pending",       urgency: "medium", executionType: "auto_within_policy" },
    { id: "AR-004", routeId: "R-23", routeName: "Route 23", type: "infrastructure",action: "Flag Pangani roundabout for Phase 3 signalization study",         reason: "Handling 3× design capacity; root cause of R-23 inefficiency",  confidence: 94, impact: "24% projected corridor congestion reduction (long-term)",     timestamp: "15:30", status: "approved",      urgency: "medium", executionType: "requires_approval" },
    { id: "AR-005", routeId: "R-56", routeName: "Route 56", type: "signal",        action: "No signal change required — AI confirms current timing optimal", reason: "Route 56 at 18% congestion, 99% compliance, throughput strong", confidence: 98, impact: "Maintain current state; no operator action needed",           timestamp: "15:22", status: "auto_executed", urgency: "low",    executionType: "auto_within_policy" },
];

const DEVIATIONS: DeviationEvent[] = [
    { id: "DEV-014", routeId: "R-11", routeName: "Route 11", vehicleId: "KBA 441Z", driver: "Otieno J.",   timestamp: "15:39", location: "Makadara Jct, Jogoo Rd",   deviation: "560m off geofenced corridor",    severity: "major_deviation", tier: "operational",    resolved: false, action: "Real-time alert sent; supervisor notified" },
    { id: "DEV-013", routeId: "R-11", routeName: "Route 11", vehicleId: "KCE 221A", driver: "Mutua P.",    timestamp: "15:22", location: "Jogoo Rd / Landhies Rd",  deviation: "Unauthorised stop >4 min",       severity: "minor_deviation", tier: "soft",           resolved: true,  action: "Performance log updated" },
    { id: "DEV-012", routeId: "R-23", routeName: "Route 23", vehicleId: "KDB 880T", driver: "Kariuki D.",  timestamp: "14:58", location: "Thika Rd, Pangani",        deviation: "Route not followed — 1.2 km",   severity: "major_deviation", tier: "administrative", resolved: false, action: "Compliance report flagged; daily review" },
    { id: "DEV-011", routeId: "R-31", routeName: "Route 31", vehicleId: "KCA 775L", driver: "Njoroge W.",  timestamp: "14:33", location: "Lang'ata Rd, Galleria",   deviation: "Minor geofence breach — 90m",   severity: "minor_deviation", tier: "soft",           resolved: true,  action: "Auto-logged; driver notified" },
    { id: "DEV-010", routeId: "R-07", routeName: "Route 7",  vehicleId: "KBZ 334C", driver: "Achieng M.", timestamp: "13:55", location: "Ngong Rd, Adams Arcade",   deviation: "Schedule deviation +18 min",    severity: "minor_deviation", tier: "soft",           resolved: true,  action: "Pre-trip guidance adjusted" },
];

const PRE_TRIP_GUIDANCE: PreTripGuidance[] = [
    { id: "PT-001", routeId: "R-07", routeName: "Route 7",  driver: "Akinyi P.",  vehicleId: "KBG 200X", scheduledDep: "16:00", recommendedRoute: "Mbagathi Rd bypass", alternativeRoute: "Standard Ngong Rd", expectedDelay: 3,  timeSaving: 11, reason: "Lane closure near Dagoretti Corner", accepted: null  },
    { id: "PT-002", routeId: "R-23", routeName: "Route 23", driver: "Chebet L.",  vehicleId: "KCF 441W", scheduledDep: "16:05", recommendedRoute: "Standard Thika Rd",  alternativeRoute: undefined,           expectedDelay: 22, timeSaving: 0,  reason: "No viable alternative — congestion advisory sent", accepted: null  },
    { id: "PT-003", routeId: "R-31", routeName: "Route 31", driver: "Kamau S.",   vehicleId: "KBA 770J", scheduledDep: "16:10", recommendedRoute: "Uhuru Hwy via bypass", alternativeRoute: "Direct Langata Rd",expectedDelay: 0,  timeSaving: 8,  reason: "AI predicts 8 min saving on bypass corridor", accepted: true  },
    { id: "PT-004", routeId: "R-44", routeName: "Route 44", driver: "Odhiambo T.",vehicleId: "KCD 554R", scheduledDep: "16:15", recommendedRoute: "Standard Mombasa Rd", alternativeRoute: undefined,           expectedDelay: 4,  timeSaving: 0,  reason: "Minor delay expected — standard route advised", accepted: false },
];

const INFRA_TARGETS: InfraTarget[] = [
    { id: "INF-01", location: "Pangani Roundabout, Thika Rd",   type: "roundabout",    severity: "critical", recommendation: "Convert to 4-arm signalized intersection with PSV priority phase", affectedRoutes: ["R-23","R-11","R-07"], simGain: 24, simTimeSaving: 18, phase: 3 },
    { id: "INF-02", location: "Dagoretti Corner, Ngong Rd",     type: "bottleneck",    severity: "high",     recommendation: "Dedicated PSV lane 400m approach + adaptive signal timing",        affectedRoutes: ["R-07","R-31"],        simGain: 15, simTimeSaving: 11, phase: 3 },
    { id: "INF-03", location: "Makadara Junction, Jogoo Rd",    type: "signal_gap",    severity: "high",     recommendation: "Install PSV detection loops; enable adaptive priority",            affectedRoutes: ["R-11"],               simGain: 12, simTimeSaving: 9,  phase: 2 },
    { id: "INF-04", location: "Globe Roundabout, Mombasa Rd",   type: "merge_conflict",severity: "medium",   recommendation: "Add dedicated merge lane for PSVs; retime adjacent signal",         affectedRoutes: ["R-44"],               simGain: 8,  simTimeSaving: 5,  phase: 3 },
];

const AUDIT_LOGS: AuditLog[] = [
    { id: "AL-001", operator: "Kamau N.",   time: "15:30", route: "Route 23", aiSuggestion: "Signal priority × 4",        finalAction: "Approved — Activated",         type: "approved" },
    { id: "AL-002", operator: "Otieno M.",  time: "15:12", route: "Route 11", aiSuggestion: "Auto-signal +14s green",     finalAction: "Override — Manual 45s applied", type: "overridden" },
    { id: "AL-003", operator: "Wangari J.", time: "14:55", route: "Route 7",  aiSuggestion: "Divert via Mbagathi Rd",     finalAction: "Rejected — Insufficient data", type: "rejected" },
    { id: "AL-004", operator: "System AI",  time: "14:33", route: "Route 56", aiSuggestion: "Maintain current timing",    finalAction: "Auto-executed within policy",  type: "auto_executed" },
    { id: "AL-005", operator: "Kamau N.",   time: "14:10", route: "Route 31", aiSuggestion: "Pre-trip guidance × 2",      finalAction: "Approved — Sent to drivers",   type: "approved" },
];

/* ─────────────────────────────────────────────
   CONFIG MAPS
───────────────────────────────────────────── */
const statusCfg: Record<RouteStatus, { label: string; color: string; bg: string; bar: string; dot: string }> = {
    critical: { label: "Critical", color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",      bar: "bg-red-500",     dot: "bg-red-400" },
    delayed:  { label: "Delayed",  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",  bar: "bg-amber-500",   dot: "bg-amber-400" },
    normal:   { label: "Normal",   color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30",bar: "bg-yellow-500",  dot: "bg-yellow-400" },
    optimal:  { label: "Optimal",  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30",bar:"bg-emerald-500",dot: "bg-emerald-400" },
};

const complianceCfg: Record<ComplianceStatus, { label: string; color: string; bg: string }> = {
    adherent:         { label: "Adherent",       color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
    minor_deviation:  { label: "Minor Dev.",     color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30" },
    major_deviation:  { label: "Major Dev.",     color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30" },
    off_route:        { label: "Off Route",      color: "text-red-500",     bg: "bg-red-600/15 border-red-600/40" },
};

const signalModeCfg: Record<SignalMode, { label: string; color: string; icon: React.ElementType }> = {
    ai_managed: { label: "AI Managed", color: "text-cyan-400",    icon: Brain },
    manual:     { label: "Manual",     color: "text-amber-400",   icon: Edit3 },
    fixed:      { label: "Fixed",      color: "text-white/40",    icon: Lock },
    emergency:  { label: "Emergency",  color: "text-red-400",     icon: Siren },
};

const enforcementCfg: Record<EnforcementTier, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    soft:           { label: "Soft",           color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/30",  icon: Eye },
    administrative: { label: "Administrative", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",    icon: ListChecks },
    operational:    { label: "Operational",    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",        icon: ShieldAlert },
};

const recTypeCfg = {
    reroute:        { icon: Route,        color: "text-amber-400",   bg: "bg-amber-500/10" },
    signal:         { icon: Signal,       color: "text-cyan-400",    bg: "bg-cyan-500/10" },
    infrastructure: { icon: TrafficCone, color: "text-violet-400",  bg: "bg-violet-500/10" },
    pre_trip:       { icon: Milestone,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
    compliance:     { icon: ShieldAlert,  color: "text-red-400",     bg: "bg-red-500/10" },
    emergency:      { icon: Siren,        color: "text-red-500",     bg: "bg-red-600/15" },
};

const phaseCfg: Record<SystemPhase, { label: string; color: string; bg: string; desc: string }> = {
    1: { label: "Phase 1", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",  desc: "Opt-in Pilot · Tracking + Analytics" },
    2: { label: "Phase 2", color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30",    desc: "Policy-backed · AI Recommendations Active" },
    3: { label: "Phase 3", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30",desc: "Full Expansion · Signal Automation" },
};

/* ─────────────────────────────────────────────
   ROUTE SIDEBAR CELL
───────────────────────────────────────────── */
function RouteCell({ route, selected, onClick }: { route: PSVRoute; selected: boolean; onClick: () => void }) {
    const cfg = statusCfg[route.status];
    const SigIcon = signalModeCfg[route.signalMode].icon;
    const ph = phaseCfg[route.phase];
    return (
        <button onClick={onClick}
                className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-all duration-200 text-left w-full
        ${cfg.bg} ${selected ? "ring-2 ring-cyan-400/70 scale-[1.02]" : "hover:ring-1 hover:ring-white/20"}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot} ${route.status==="critical"?"animate-pulse":""}`}/>
                    <span className="text-[11px] font-mono font-bold text-white/70 tracking-widest">{route.id}</span>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${ph.bg} ${ph.color}`}>P{route.phase}</span>
                </div>
                <div className="flex items-center gap-1">
                    {route.aiLocked && <Lock className="w-3 h-3 text-amber-400"/>}
                    <SigIcon className={`w-3 h-3 ${signalModeCfg[route.signalMode].color}`}/>
                </div>
            </div>
            <div className="text-xs font-semibold text-white/90">{route.name}</div>
            <div className="flex items-center gap-1 text-[10px] text-white/40">
                <span>{route.origin}</span><ArrowRight className="w-2.5 h-2.5"/><span>{route.destination}</span>
            </div>
            {/* Efficiency bar */}
            <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                    <span className={`font-bold ${cfg.color}`}>{route.efficiency}% eff.</span>
                    <span className="text-white/35">{route.activeVehicles}/{route.totalVehicles} PSV</span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${cfg.bar}`} style={{width:`${route.efficiency}%`}}/>
                </div>
            </div>
            {/* Compliance mini */}
            <div className="flex items-center justify-between text-[10px]">
                <div className={`flex items-center gap-1 ${route.complianceRate >= 90 ? "text-emerald-400" : route.complianceRate >= 75 ? "text-amber-400" : "text-red-400"}`}>
                    <BadgeCheck className="w-3 h-3"/>
                    <span>{route.complianceRate}% compliant</span>
                </div>
                {route.deviationCount > 0 && (
                    <span className="text-red-400 font-mono text-[10px]">{route.deviationCount} dev.</span>
                )}
            </div>
        </button>
    );
}

/* ─────────────────────────────────────────────
   AI RECOMMENDATION CARD
───────────────────────────────────────────── */
function RecommendationCard({ rec, onApprove, onReject }: {
    rec: AIRecommendation; onApprove:(id:string)=>void; onReject:(id:string)=>void;
}) {
    const tc = recTypeCfg[rec.type];
    const Icon = tc.icon;
    const isPending = rec.status === "pending";
    const urgBorder = rec.urgency==="high" ? "border-red-500/30" : rec.urgency==="medium" ? "border-amber-500/30" : "border-white/10";

    return (
        <div className={`rounded-xl border p-4 transition-all duration-200 ${
            rec.status==="approved"      ? "border-emerald-500/25 bg-emerald-500/5 opacity-70" :
                rec.status==="rejected"      ? "border-red-500/15 bg-red-500/5 opacity-50" :
                    rec.status==="auto_executed" ? "border-cyan-500/15 bg-cyan-500/5 opacity-60" :
                        `${urgBorder} bg-white/[0.02] hover:border-cyan-500/30`
        }`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${tc.bg}`}><Icon className={`w-3.5 h-3.5 ${tc.color}`}/></div>
                    <div>
                        <div className="text-[10px] font-mono text-white/30">{rec.id} · {rec.timestamp}</div>
                        <div className="text-[11px] font-semibold text-white/70">{rec.routeName}</div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    {isPending && (
                        <Badge variant="outline" className={`text-[9px] ${rec.urgency==="high"?"border-red-500/50 text-red-400 animate-pulse":rec.urgency==="medium"?"border-amber-500/50 text-amber-400":"border-white/20 text-white/35"}`}>
                            {rec.urgency==="high"?"URGENT":rec.urgency==="medium"?"MEDIUM":"LOW"}
                        </Badge>
                    )}
                    {!isPending && (
                        <Badge variant="outline" className={`text-[9px] capitalize ${
                            rec.status==="approved"?"border-emerald-500/50 text-emerald-400":
                                rec.status==="auto_executed"?"border-cyan-500/50 text-cyan-400":
                                    rec.status==="rejected"?"border-red-500/50 text-red-400":"border-amber-500/50 text-amber-400"
                        }`}>{rec.status.replace("_"," ")}</Badge>
                    )}
                    <Badge variant="outline" className={`text-[8px] ${
                        rec.executionType==="auto_within_policy"?"border-cyan-500/30 text-cyan-400/70":
                            rec.executionType==="escalation_required"?"border-red-500/30 text-red-400/70":
                                "border-white/15 text-white/30"
                    }`}>
                        {rec.executionType==="auto_within_policy"?"Auto ✓":rec.executionType==="escalation_required"?"Escalate":"Needs Approval"}
                    </Badge>
                </div>
            </div>

            <div className={`text-[9px] uppercase tracking-widest font-bold mb-1.5 ${tc.color}`}>{rec.type.replace("_"," ")}</div>
            <div className="text-xs font-bold text-white mb-2 leading-snug">{rec.action}</div>
            <div className="space-y-1.5 mb-3">
                <div className="flex gap-2 text-[11px]"><span className="text-white/25 w-10 shrink-0">Why:</span><span className="text-white/50 leading-snug">{rec.reason}</span></div>
                <div className="flex gap-2 text-[11px]"><span className="text-white/25 w-10 shrink-0">Impact:</span><span className="text-emerald-400/80 leading-snug">{rec.impact}</span></div>
            </div>

            <div className="mb-3">
                <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-white/25 flex items-center gap-1"><Brain className="w-3 h-3"/>Confidence</span>
                    <span className={`font-bold font-mono ${rec.confidence>=85?"text-emerald-400":rec.confidence>=70?"text-amber-400":"text-red-400"}`}>{rec.confidence}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${rec.confidence>=85?"bg-emerald-400":rec.confidence>=70?"bg-amber-400":"bg-red-400"}`} style={{width:`${rec.confidence}%`}}/>
                </div>
            </div>

            {isPending && (
                <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white border-0" onClick={()=>onApprove(rec.id)}>
                        <Check className="w-3 h-3 mr-1"/>Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={()=>onReject(rec.id)}>
                        <X className="w-3 h-3"/>
                    </Button>
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   SIGNAL CONTROL CARD
───────────────────────────────────────────── */
function SignalCorridorCard({ corridor, overrideSheet }: { corridor: SignalCorridor; overrideSheet: React.ReactNode }) {
    const modeCfg = signalModeCfg[corridor.mode];
    const ModeIcon = modeCfg.icon;
    const gap = corridor.aiRecommendedGreen - corridor.avgGreenTime;

    return (
        <div className={`rounded-xl border p-4 ${corridor.priorityActive?"bg-cyan-500/5 border-cyan-500/20":"bg-white/[0.02] border-white/10"}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                    <div className="text-xs font-bold text-white/85">{corridor.name}</div>
                    <div className="text-[10px] text-white/35 font-mono">{corridor.id} · {corridor.signals} signals</div>
                </div>
                <div className="flex items-center gap-1.5">
                    {corridor.priorityActive && <Badge variant="outline" className="text-[9px] border-cyan-500/50 text-cyan-400 animate-pulse">PRIORITY ON</Badge>}
                    <div className={`flex items-center gap-1 text-[10px] ${modeCfg.color}`}>
                        <ModeIcon className="w-3 h-3"/>{modeCfg.label}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                    { label: "Current Green", value: `${corridor.avgGreenTime}s`, color: "text-white/70" },
                    { label: "AI Recommends", value: `${corridor.aiRecommendedGreen}s`, color: "text-cyan-400" },
                    { label: "PSV Flow",      value: `${corridor.psvThroughput}/hr`, color: gap > 0 ? "text-amber-400" : "text-emerald-400" },
                ].map(s => (
                    <div key={s.label} className="rounded-md border border-white/8 bg-white/[0.02] p-2 text-center">
                        <div className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</div>
                        <div className="text-[9px] text-white/25 mt-0.5 leading-tight">{s.label}</div>
                    </div>
                ))}
            </div>

            {gap !== 0 && (
                <div className={`flex items-center gap-1.5 text-[10px] mb-3 ${gap>0?"text-amber-300/80":"text-emerald-300/80"}`}>
                    {gap > 0 ? <TrendingUp className="w-3 h-3 shrink-0"/> : <Minus className="w-3 h-3 shrink-0"/>}
                    <span>AI suggests {gap > 0 ? `+${gap}s green` : "current timing optimal"} — last adjusted {corridor.lastAdjusted}</span>
                </div>
            )}

            <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-7 text-[11px] bg-cyan-700 hover:bg-cyan-600 text-white border-0 gap-1">
                    <CheckCircle2 className="w-3 h-3"/>Apply AI Timing
                </Button>
                {overrideSheet}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   SIGNAL OVERRIDE SHEET
───────────────────────────────────────────── */
function SignalOverridePanel({ corridor, onClose }: { corridor: SignalCorridor; onClose: () => void }) {
    const [green, setGreen] = useState([corridor.avgGreenTime]);
    const [cycle, setCycle] = useState([corridor.cycleLength]);
    const [reason, setReason] = useState("");

    return (
        <div className="space-y-5 pt-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white/80">{corridor.name}</span>
                    <Badge variant="outline" className={`text-[10px] ${signalModeCfg[corridor.mode].color} border-current`}>{signalModeCfg[corridor.mode].label}</Badge>
                </div>
                <div className="text-[11px] text-white/40">{corridor.signals} managed signals · Route {corridor.route}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {[
                    { label:"Current Green",  value:`${corridor.avgGreenTime}s`, color:"text-white/60" },
                    { label:"Override Green", value:`${green[0]}s`, color:"text-cyan-400" },
                    { label:"Current Cycle",  value:`${corridor.cycleLength}s`, color:"text-white/60" },
                    { label:"Override Cycle", value:`${cycle[0]}s`, color:"text-amber-400" },
                ].map(s=>(
                    <div key={s.label} className="rounded-md border border-white/10 bg-white/[0.03] p-2.5 text-center">
                        <div className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</div>
                        <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <label className="text-xs font-semibold text-white/60">PSV Green Phase Duration</label>
                <Slider value={green} onValueChange={setGreen} min={20} max={90} step={5}/>
                <div className="flex justify-between text-[10px] text-white/25"><span>20s</span><span className="text-cyan-400 font-bold font-mono">{green[0]}s</span><span>90s</span></div>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-semibold text-white/60">Signal Cycle Length</label>
                <Slider value={cycle} onValueChange={setCycle} min={60} max={150} step={5}/>
                <div className="flex justify-between text-[10px] text-white/25"><span>60s</span><span className="text-amber-400 font-bold font-mono">{cycle[0]}s</span><span>150s</span></div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60">Override Reason (logged)</label>
                <Select onValueChange={setReason}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white/70 text-xs h-9"><SelectValue placeholder="Select reason..."/></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                        {["Traffic incident","Emergency vehicle priority","Special event","AI confidence too low","Sensor malfunction","Policy directive"].map(r=>(
                            <SelectItem key={r} value={r} className="text-xs text-white/70 focus:bg-white/10">{r}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {green[0] > 72 && (
                <div className="flex gap-2 items-start rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"/>
                    <p className="text-[11px] text-amber-300/80">Extended green phase may cause side-street congestion. Coordinate with adjacent corridors.</p>
                </div>
            )}

            <div className="flex gap-3 pt-1">
                <Button className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-bold h-10 text-sm" disabled={!reason}>
                    <Signal className="w-4 h-4 mr-2"/>Apply Override
                </Button>
                <Button variant="outline" className="border-white/15 text-white/40 hover:bg-white/5 h-10" onClick={onClose}>Cancel</Button>
            </div>
            <p className="text-[10px] text-white/20 text-center">Override within policy limits · All changes logged to audit trail</p>
        </div>
    );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function TransportControlCenter() {
    const [aiMode, setAiMode] = useState<AIMode>("operator");
    const [selectedRoute, setSelectedRoute] = useState<PSVRoute>(ROUTES[0]);
    const [recs, setRecs] = useState(AI_RECOMMENDATIONS);
    const [signalSheet, setSignalSheet] = useState<SignalCorridor | null>(null);
    const [simValue, setSimValue] = useState([50]);

    const pending     = recs.filter(r=>r.status==="pending");
    const totalPSVs   = ROUTES.reduce((s,r)=>s+r.activeVehicles,0);
    const critRoutes  = ROUTES.filter(r=>r.status==="critical");
    const totalDevs   = ROUTES.reduce((s,r)=>s+r.deviationCount,0);
    const avgCompliance = Math.round(ROUTES.reduce((s,r)=>s+r.complianceRate,0)/ROUTES.length);
    const phCfg       = phaseCfg[SYSTEM_PHASE];
    // Derived icon variables — JSX cannot use computed property access as a component tag
    const SelectedSigModeIcon = signalModeCfg[selectedRoute.signalMode].icon;

    const handleApprove = (id: string) => setRecs(p=>p.map(r=>r.id===id?{...r,status:"approved" as const}:r));
    const handleReject  = (id: string) => setRecs(p=>p.map(r=>r.id===id?{...r,status:"rejected" as const}:r));

    return (
        <TooltipProvider delayDuration={300}>
            <div className="min-h-screen bg-[#0d0f12] text-white" style={{fontFamily:"'DM Mono','JetBrains Mono',monospace"}}>

                {/* Scanline texture */}
                <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
                     style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.3) 2px,rgba(255,255,255,0.3) 3px)"}}/>

                {/* ── SYSTEM PHASE BANNER ── */}
                <div className={`relative z-20 flex items-center justify-center gap-3 px-4 py-1.5 border-b ${phCfg.bg}`}>
                    <Layers className={`w-3.5 h-3.5 ${phCfg.color}`}/>
                    <span className={`text-[11px] font-bold ${phCfg.color}`}>{phCfg.label} Deployment</span>
                    <span className="text-[10px] text-white/35">·</span>
                    <span className="text-[10px] text-white/45">{phCfg.desc}</span>
                    <div className="absolute right-4 flex gap-2">
                        {([1,2,3] as SystemPhase[]).map(p=>(
                            <div key={p} className={`w-1.5 h-1.5 rounded-full ${p<=SYSTEM_PHASE?phaseCfg[p].color.replace("text-","bg-"):""} ${p>SYSTEM_PHASE?"bg-white/15":""}`}/>
                        ))}
                    </div>
                </div>

                {/* ── TOP BAR ── */}
                <header className="relative z-10 h-13 border-b border-white/8 bg-[#0d0f12]/95 backdrop-blur-sm flex items-center px-4 gap-4 h-14">
                    <div className="flex items-center gap-2.5 shrink-0">
                        <div className="relative w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                            <Bus className="w-4 h-4 text-cyan-400"/>
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#0d0f12] animate-pulse"/>
                        </div>
                        <div>
                            <div className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase">TransitCtrl</div>
                            <div className="text-[9px] tracking-widest text-white/30 uppercase">City Transport Intelligence</div>
                        </div>
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-1"/>

                    {/* Live + KPIs */}
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                        <span>LIVE</span><span className="text-white/20">·</span>
                        <Clock className="w-3 h-3"/><span>15:46</span>
                    </div>
                    <div className="hidden lg:flex items-center gap-5 ml-2">
                        {[
                            { icon: Bus,          v: totalPSVs,        label: "PSVs Active",    c: "text-cyan-400" },
                            { icon: AlertCircle,  v: critRoutes.length, label: "Critical",      c: "text-red-400" },
                            { icon: ShieldAlert,  v: totalDevs,        label: "Deviations",     c: totalDevs>5?"text-red-400":"text-amber-400" },
                            { icon: BadgeCheck,   v: `${avgCompliance}%`, label: "Compliance",  c: avgCompliance>=85?"text-emerald-400":"text-amber-400" },
                        ].map(k=>(
                            <div key={k.label} className="flex items-center gap-1.5 text-[11px]">
                                <k.icon className={`w-3.5 h-3.5 ${k.c}`}/>
                                <span className={`font-mono font-bold ${k.c}`}>{k.v}</span>
                                <span className="text-white/28">{k.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex-1"/>

                    {/* AI Mode */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button onClick={()=>setAiMode(m=>m==="assisted"?"operator":"assisted")}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all duration-300 ${
                                        aiMode==="assisted"?"border-cyan-500/50 bg-cyan-500/10 text-cyan-400":"border-amber-500/50 bg-amber-500/10 text-amber-400"}`}>
                                {aiMode==="assisted"?<><ToggleRight className="w-4 h-4"/>AI ASSISTED</>:<><ToggleLeft className="w-4 h-4"/>OPERATOR CTRL</>}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-zinc-800 border-white/10 text-xs text-white/80">
                            {aiMode==="assisted"?"🟢 AI executes within approved policy thresholds":"🔴 All AI actions require manual operator approval"}
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative h-8 w-8 text-white/40 hover:text-white hover:bg-white/5">
                                <Bell className="w-4 h-4"/>
                                {pending.length>0&&<span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-zinc-800 border-white/10 text-xs">{pending.length} pending recommendations</TooltipContent>
                    </Tooltip>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-white/50 hover:text-white hover:bg-white/5 text-[11px]">
                                <User className="w-3.5 h-3.5"/>Kamau N.<ChevronDown className="w-3 h-3"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 w-44">
                            <DropdownMenuLabel className="text-white/40 text-[10px]">Traffic Operator</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10"/>
                            {[{icon:Settings,label:"Settings"},{icon:History,label:"Audit Log"},{icon:Layers,label:"Phase Management"}].map(m=>(
                                <DropdownMenuItem key={m.label} className="text-xs text-white/60 focus:bg-white/5 focus:text-white gap-2">
                                    <m.icon className="w-3.5 h-3.5"/>{m.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* ── MAIN LAYOUT ── */}
                <main className="relative z-10 flex h-[calc(100vh-84px)]">

                    {/* LEFT SIDEBAR */}
                    <aside className="w-72 shrink-0 border-r border-white/8 flex flex-col">
                        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Route className="w-4 h-4 text-white/40"/>
                                <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase">Routes</span>
                            </div>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:text-white hover:bg-white/5">
                                        <RefreshCw className="w-3 h-3"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-800 border-white/10 text-xs">Refresh</TooltipContent>
                            </Tooltip>
                        </div>

                        {/* System health */}
                        <div className="px-4 py-3 border-b border-white/8 space-y-2">
                            <div className="flex justify-between text-[10px] text-white/40">
                                <span>Network compliance avg.</span>
                                <span className={`font-mono font-bold ${avgCompliance>=85?"text-emerald-400":"text-amber-400"}`}>{avgCompliance}%</span>
                            </div>
                            <Progress value={avgCompliance} className="h-1.5 bg-white/10"/>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                <div className="flex items-center gap-1 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400"/>{critRoutes.length} Critical</div>
                                <div className="flex items-center gap-1 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>{ROUTES.filter(r=>r.status==="delayed").length} Delayed</div>
                                <div className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>{ROUTES.filter(r=>r.status==="optimal").length} Optimal</div>
                                <div className="flex items-center gap-1 text-red-400/80"><ShieldAlert className="w-3 h-3"/>{totalDevs} Deviations</div>
                            </div>
                        </div>

                        {/* Phase filter */}
                        <div className="px-3 py-2 border-b border-white/8">
                            <Select>
                                <SelectTrigger className="h-7 bg-white/5 border-white/10 text-white/50 text-[11px]">
                                    <SelectValue placeholder="Filter routes..."/>
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10">
                                    {["All Routes","Critical Only","Has Deviations","Phase 1 Pilots","Phase 2 Active"].map(s=>(
                                        <SelectItem key={s} value={s.toLowerCase().replace(" ","_")} className="text-xs text-white/70 focus:bg-white/10">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-2">
                                {ROUTES.map(route=>(
                                    <RouteCell key={route.id} route={route} selected={selectedRoute.id===route.id} onClick={()=>setSelectedRoute(route)}/>
                                ))}
                            </div>
                        </ScrollArea>
                    </aside>

                    {/* CENTER */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Selected route header */}
                        <div className="px-6 py-3 border-b border-white/8 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className={`w-2.5 h-2.5 rounded-full ${statusCfg[selectedRoute.status].dot} ${selectedRoute.status==="critical"?"animate-pulse":""} shrink-0`}/>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-sm font-bold text-white">{selectedRoute.name}</h1>
                                        <Badge variant="outline" className={`text-[10px] ${statusCfg[selectedRoute.status].color} border-current`}>{statusCfg[selectedRoute.status].label}</Badge>
                                        <Badge variant="outline" className={`text-[10px] ${signalModeCfg[selectedRoute.signalMode].color} border-current`}>
                                            <SelectedSigModeIcon className="w-2.5 h-2.5 mr-1"/>
                                            {signalModeCfg[selectedRoute.signalMode].label}
                                        </Badge>
                                        <Badge variant="outline" className={`text-[10px] ${phaseCfg[selectedRoute.phase].color} border-current`}>
                                            Phase {selectedRoute.phase}
                                        </Badge>
                                        {selectedRoute.aiLocked&&<Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400"><Lock className="w-2.5 h-2.5 mr-1"/>AI Locked</Badge>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/40">
                                        <Waypoints className="w-3 h-3"/>{selectedRoute.corridor} · {selectedRoute.origin} → {selectedRoute.destination}
                                        <span className="text-white/20">·</span>
                                        <span className={selectedRoute.complianceRate>=85?"text-emerald-400":"text-amber-400"}>{selectedRoute.complianceRate}% adherence</span>
                                        {selectedRoute.deviationCount>0&&<span className="text-red-400">· {selectedRoute.deviationCount} active deviations</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="outline" className="h-8 text-[11px] border-white/15 text-white/50 hover:bg-white/5 gap-1.5">
                                            <Settings className="w-3.5 h-3.5"/>Controls
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                        <DropdownMenuLabel className="text-[10px] text-white/30">Route Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-white/10"/>
                                        {[
                                            {icon:Lock,c:"text-amber-400",l:"Lock Route from AI"},
                                            {icon:Navigation,c:"text-cyan-400",l:"Force Manual Reroute"},
                                            {icon:Bus,c:"text-emerald-400",l:"Pre-position Vehicles"},
                                            {icon:TrafficCone,c:"text-violet-400",l:"Flag for Infra Review"},
                                            {icon:Radar,c:"text-cyan-400",l:"Activate Geofence Alert"},
                                        ].map(m=>(
                                            <DropdownMenuItem key={m.l} className="text-xs text-white/60 focus:bg-white/5 focus:text-white gap-2">
                                                <m.icon className={`w-3.5 h-3.5 ${m.c}`}/>{m.l}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator className="bg-white/10"/>
                                        <DropdownMenuItem className="text-xs text-red-400 focus:bg-red-500/5 gap-2">
                                            <AlertTriangle className="w-3.5 h-3.5"/>Emergency Suspend Route
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* KPI strip */}
                        <div className="px-6 py-2.5 border-b border-white/8 grid grid-cols-7 gap-2">
                            {[
                                {label:"Efficiency",   v:`${selectedRoute.efficiency}%`,         icon:Gauge,       c:statusCfg[selectedRoute.status].color},
                                {label:"Active PSVs",  v:`${selectedRoute.activeVehicles}/${selectedRoute.totalVehicles}`, icon:Bus, c:"text-white/70"},
                                {label:"Avg Delay",    v:selectedRoute.avgDelay>0?`+${selectedRoute.avgDelay}m`:"On time", icon:Timer, c:selectedRoute.avgDelay>15?"text-red-400":selectedRoute.avgDelay>0?"text-amber-400":"text-emerald-400"},
                                {label:"Congestion",   v:`${selectedRoute.congestionLevel}%`,     icon:Activity,    c:selectedRoute.congestionLevel>=80?"text-red-400":"text-white/60"},
                                {label:"Compliance",   v:`${selectedRoute.complianceRate}%`,      icon:BadgeCheck,  c:selectedRoute.complianceRate>=85?"text-emerald-400":"text-amber-400"},
                                {label:"Deviations",   v:`${selectedRoute.deviationCount}`,       icon:ShieldAlert, c:selectedRoute.deviationCount>3?"text-red-400":"text-white/60"},
                                {label:"30-min fcst",  v:`${selectedRoute.forecast30}%`,          icon:TrendingUp,  c:selectedRoute.forecast30>=85?"text-red-400":"text-emerald-400"},
                            ].map(k=>(
                                <div key={k.label} className="rounded-lg border border-white/8 bg-white/[0.02] p-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] text-white/28 uppercase tracking-wide leading-tight">{k.label}</span>
                                        <k.icon className={`w-3 h-3 ${k.c}`}/>
                                    </div>
                                    <div className={`text-sm font-bold font-mono ${k.c}`}>{k.v}</div>
                                </div>
                            ))}
                        </div>

                        {/* TABS */}
                        <Tabs defaultValue="map" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 pt-3 border-b border-white/8">
                                <TabsList className="bg-white/5 border border-white/10 h-8 p-0.5 gap-0.5">
                                    {[
                                        {v:"map",       l:"Network Map",     icon:Map},
                                        {v:"signals",   l:"Signal Control",  icon:Signal},
                                        {v:"compliance",l:"Compliance",       icon:ShieldAlert},
                                        {v:"pretip",    l:"Pre-Trip Queue",  icon:Milestone},
                                        {v:"infra",     l:"Infrastructure",  icon:TrafficCone},
                                        {v:"audit",     l:"Audit",           icon:History},
                                    ].map(t=>(
                                        <TabsTrigger key={t.v} value={t.v}
                                                     className="h-7 px-3 text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded flex items-center gap-1.5">
                                            <t.icon className="w-3 h-3"/>{t.l}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            {/* MAP TAB */}
                            <TabsContent value="map" className="flex-1 overflow-hidden p-4 flex flex-col gap-3">
                                <div className="flex-1 min-h-0">
                                    <TransportMap
                                        routes={ROUTES}
                                        selectedRoute={selectedRoute}
                                        onSelectRoute={setSelectedRoute}
                                        systemPhase={SYSTEM_PHASE}
                                        totalPSVs={totalPSVs}
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-2 shrink-0">
                                    {[
                                        {label:"Congestion",  v:`${selectedRoute.congestionLevel}%`, bar:true,  barV:selectedRoute.congestionLevel, barC:selectedRoute.congestionLevel>=80?"bg-red-500":selectedRoute.congestionLevel>=60?"bg-amber-500":"bg-emerald-500", c:selectedRoute.congestionLevel>=80?"text-red-400":"text-amber-400"},
                                        {label:"Travel vs baseline", v:`+${selectedRoute.avgTravelTime-selectedRoute.baselineTravelTime}min`, bar:false, barV:0, barC:"", c:selectedRoute.avgTravelTime>selectedRoute.baselineTravelTime?"text-amber-400":"text-emerald-400"},
                                        {label:"Passenger load", v:`${selectedRoute.passengerLoad}%`, bar:false, barV:0, barC:"", c:selectedRoute.passengerLoad>=90?"text-red-400":"text-white/60"},
                                        {label:"Signal mode",  v:signalModeCfg[selectedRoute.signalMode].label, bar:false, barV:0, barC:"", c:signalModeCfg[selectedRoute.signalMode].color},
                                    ].map(s=>(
                                        <Card key={s.label} className="bg-white/[0.02] border-white/10">
                                            <CardContent className="p-3">
                                                <div className="text-[10px] text-white/30 uppercase tracking-wide mb-1">{s.label}</div>
                                                <div className={`text-base font-bold font-mono ${s.c}`}>{s.v}</div>
                                                {s.bar&&<div className="h-1 rounded-full bg-white/10 overflow-hidden mt-1.5"><div className={`h-full rounded-full ${s.barC}`} style={{width:`${s.barV}%`}}/></div>}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* SIGNAL CONTROL TAB */}
                            <TabsContent value="signals" className="flex-1 overflow-auto px-6 pb-6 pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-white">Signal Corridor Control</div>
                                        <div className="text-[11px] text-white/40">AI executes within policy thresholds · Manual override available on all corridors</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-400">
                                            <Brain className="w-2.5 h-2.5 mr-1"/>{SIGNAL_CORRIDORS.filter(s=>s.mode==="ai_managed").length} AI Managed
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                                            {SIGNAL_CORRIDORS.filter(s=>s.priorityActive).length} Priority Active
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {SIGNAL_CORRIDORS.map(corr=>(
                                        <SignalCorridorCard key={corr.id} corridor={corr}
                                                            overrideSheet={
                                                                <Sheet open={signalSheet?.id===corr.id} onOpenChange={o=>!o&&setSignalSheet(null)}>
                                                                    <SheetTrigger asChild>
                                                                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1"
                                                                                onClick={()=>setSignalSheet(corr)}>
                                                                            <Edit3 className="w-3 h-3"/>Override
                                                                        </Button>
                                                                    </SheetTrigger>
                                                                    <SheetContent side="right" className="w-[400px] bg-[#111316] border-l border-white/10 text-white">
                                                                        <SheetHeader>
                                                                            <SheetTitle className="text-white flex items-center gap-2"><Signal className="w-4 h-4 text-cyan-400"/>Signal Override</SheetTitle>
                                                                        </SheetHeader>
                                                                        {signalSheet&&<SignalOverridePanel corridor={signalSheet} onClose={()=>setSignalSheet(null)}/>}
                                                                    </SheetContent>
                                                                </Sheet>
                                                            }
                                        />
                                    ))}
                                </div>
                            </TabsContent>

                            {/* COMPLIANCE TAB */}
                            <TabsContent value="compliance" className="flex-1 overflow-auto px-6 pb-6 pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-white">Compliance & Enforcement Monitor</div>
                                        <div className="text-[11px] text-white/40">Geofenced corridors · Real-time deviation tracking · 3-tier enforcement</div>
                                    </div>
                                    <div className="flex gap-2">
                                        {(["soft","administrative","operational"] as EnforcementTier[]).map(t=>{
                                            const cfg=enforcementCfg[t]; const Icon=cfg.icon;
                                            const count=DEVIATIONS.filter(d=>d.tier===t&&!d.resolved).length;
                                            return count>0?(
                                                <Badge key={t} variant="outline" className={`text-[10px] ${cfg.bg.split(" ")[1]} ${cfg.color}`}>
                                                    <Icon className="w-2.5 h-2.5 mr-1"/>{count} {t}
                                                </Badge>
                                            ):null;
                                        })}
                                    </div>
                                </div>

                                {/* Route compliance overview */}
                                <div className="grid grid-cols-3 gap-2">
                                    {ROUTES.map(r=>{
                                        const c=statusCfg[r.status];
                                        return (
                                            <div key={r.id} className={`rounded-xl border p-3 cursor-pointer transition-all hover:ring-1 hover:ring-white/20 ${selectedRoute.id===r.id?"ring-2 ring-cyan-400/50":""}`}
                                                 onClick={()=>setSelectedRoute(r)}>
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[11px] font-mono font-bold text-white/70">{r.id}</span>
                                                    <span className={`text-xs font-bold font-mono ${r.complianceRate>=85?"text-emerald-400":r.complianceRate>=75?"text-amber-400":"text-red-400"}`}>{r.complianceRate}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                                                    <div className={`h-full rounded-full ${r.complianceRate>=85?"bg-emerald-500":r.complianceRate>=75?"bg-amber-500":"bg-red-500"}`} style={{width:`${r.complianceRate}%`}}/>
                                                </div>
                                                <div className="flex justify-between text-[9px]">
                                                    <span className="text-white/35">{r.name}</span>
                                                    {r.deviationCount>0&&<span className="text-red-400">{r.deviationCount} dev.</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Deviation events */}
                                <div>
                                    <div className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3">Active Deviation Events</div>
                                    <div className="rounded-xl border border-white/10 overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-white/10 hover:bg-transparent">
                                                    {["ID","Time","Vehicle","Route","Location","Deviation","Tier","Status",""].map(h=>(
                                                        <TableHead key={h} className="text-[10px] tracking-widest text-white/25 uppercase bg-white/[0.03] font-semibold h-9">{h}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {DEVIATIONS.map(d=>{
                                                    const sev=complianceCfg[d.severity];
                                                    const enf=enforcementCfg[d.tier];
                                                    const EnfIcon=enf.icon;
                                                    return (
                                                        <TableRow key={d.id} className="border-white/6 hover:bg-white/[0.03]">
                                                            <TableCell className="text-[10px] font-mono text-white/30 py-3">{d.id}</TableCell>
                                                            <TableCell className="text-[10px] font-mono text-white/50">{d.timestamp}</TableCell>
                                                            <TableCell className="text-xs text-white/60">{d.vehicleId}</TableCell>
                                                            <TableCell className="text-xs text-white/50">{d.routeName}</TableCell>
                                                            <TableCell className="text-xs text-white/45 max-w-[110px] truncate">{d.location}</TableCell>
                                                            <TableCell className="text-xs text-white/55 max-w-[100px] truncate">{d.deviation}</TableCell>
                                                            <TableCell>
                                                                <div className={`flex items-center gap-1 text-[10px] ${enf.color}`}>
                                                                    <EnfIcon className="w-3 h-3"/>{d.tier}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={`text-[9px] ${d.resolved?"border-emerald-500/40 text-emerald-400":sev.bg.split(" ")[1]+" "+sev.color}`}>
                                                                    {d.resolved?"Resolved":sev.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {!d.resolved&&(
                                                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-cyan-400 hover:bg-cyan-500/10">
                                                                        Act
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Enforcement tier key */}
                                <div className="grid grid-cols-3 gap-2">
                                    {(["soft","administrative","operational"] as EnforcementTier[]).map(t=>{
                                        const cfg=enforcementCfg[t]; const Icon=cfg.icon;
                                        const descs={soft:"Visibility & performance feedback — no penalty",administrative:"Compliance reports & regulatory oversight",operational:"Real-time alerts + escalation for repeats"};
                                        return (
                                            <div key={t} className={`rounded-xl border p-3 ${cfg.bg}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Icon className={`w-4 h-4 ${cfg.color}`}/>
                                                    <span className={`text-xs font-bold ${cfg.color} capitalize`}>{cfg.label}</span>
                                                </div>
                                                <p className="text-[10px] text-white/40 leading-snug">{descs[t]}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* PRE-TRIP GUIDANCE TAB */}
                            <TabsContent value="pretip" className="flex-1 overflow-auto px-6 pb-6 pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-white">Pre-Trip Guidance Queue</div>
                                        <div className="text-[11px] text-white/40">AI route recommendations sent to drivers before departure · Primary optimization mode</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                                            {PRE_TRIP_GUIDANCE.filter(p=>p.accepted===true).length} Accepted
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] border-white/20 text-white/40">
                                            {PRE_TRIP_GUIDANCE.filter(p=>p.accepted===null).length} Pending Driver
                                        </Badge>
                                    </div>
                                </div>

                                {/* Guidance cards */}
                                <div className="space-y-3">
                                    {PRE_TRIP_GUIDANCE.map(pt=>{
                                        const route=ROUTES.find(r=>r.id===pt.routeId);
                                        const rCfg=route?statusCfg[route.status]:statusCfg["normal"];
                                        return (
                                            <div key={pt.id} className={`rounded-xl border p-4 ${
                                                pt.accepted===true?"border-emerald-500/25 bg-emerald-500/5":
                                                    pt.accepted===false?"border-red-500/15 bg-red-500/5 opacity-70":
                                                        "border-white/10 bg-white/[0.02]"
                                            }`}>
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                            <Bus className="w-4 h-4 text-white/40"/>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-bold text-white/80">{pt.driver} · <span className="text-white/40 font-normal">{pt.vehicleId}</span></div>
                                                            <div className="text-[10px] text-white/35">{pt.routeName} · Dep. {pt.scheduledDep}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {pt.accepted===null&&<Badge variant="outline" className="text-[9px] border-cyan-500/40 text-cyan-400 animate-pulse">Awaiting Driver</Badge>}
                                                        {pt.accepted===true&&<Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400">Accepted</Badge>}
                                                        {pt.accepted===false&&<Badge variant="outline" className="text-[9px] border-red-500/40 text-red-400">Declined</Badge>}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-3">
                                                    <div className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2.5">
                                                        <Brain className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5"/>
                                                        <div>
                                                            <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider mb-0.5">AI Recommends</div>
                                                            <div className="text-xs font-semibold text-white/80">{pt.recommendedRoute}</div>
                                                        </div>
                                                        {pt.timeSaving>0&&(
                                                            <div className="ml-auto text-right shrink-0">
                                                                <div className="text-xs font-bold text-emerald-400 font-mono">-{pt.timeSaving} min</div>
                                                                <div className="text-[9px] text-white/30">time saving</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {pt.alternativeRoute&&(
                                                        <div className="flex items-center gap-2 text-[11px] text-white/40 px-1">
                                                            <Milestone className="w-3 h-3 shrink-0"/>Alt: {pt.alternativeRoute}
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2 text-[11px] px-1">
                                                        <span className="text-white/25 shrink-0">Why:</span>
                                                        <span className="text-white/50">{pt.reason}</span>
                                                    </div>
                                                </div>

                                                {pt.accepted===null&&(
                                                    <div className="flex gap-2">
                                                        <Button size="sm" className="flex-1 h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white border-0 gap-1">
                                                            <CheckCircle2 className="w-3 h-3"/>Push to Driver
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-white/15 text-white/40 hover:bg-white/5 gap-1">
                                                            <Edit3 className="w-3 h-3"/>Modify
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* INFRASTRUCTURE TAB */}
                            <TabsContent value="infra" className="flex-1 overflow-auto px-6 pb-6 pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-white">Infrastructure Optimization Insights</div>
                                        <div className="text-[11px] text-white/40">AI-identified bottlenecks · Impact simulation · Phase-tagged for roadmap planning</div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-400">
                                        <Brain className="w-2.5 h-2.5 mr-1"/>{INFRA_TARGETS.length} findings
                                    </Badge>
                                </div>

                                {/* Impact simulation card */}
                                <Card className="bg-white/[0.03] border-violet-500/20">
                                    <CardHeader className="pb-2 pt-4 px-4">
                                        <CardTitle className="text-xs text-white/60 font-semibold tracking-widest uppercase flex items-center gap-2">
                                            <Focus className="w-3.5 h-3.5 text-violet-400"/>Network Impact Simulator
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 space-y-3">
                                        <div className="text-[11px] text-white/40">Model congestion reduction if top infrastructure changes are implemented:</div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-white/40">Interventions modelled</span>
                                                <span className="text-violet-400 font-bold font-mono">{Math.round(simValue[0]/100*INFRA_TARGETS.length)} / {INFRA_TARGETS.length}</span>
                                            </div>
                                            <Slider value={simValue} onValueChange={setSimValue} min={0} max={100} step={25}/>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                {label:"Congestion Reduction", v:`${Math.round(simValue[0]*0.18)}%`,   c:"text-emerald-400"},
                                                {label:"Avg Time Saving",      v:`${Math.round(simValue[0]*0.12)} min`, c:"text-cyan-400"},
                                                {label:"Routes Impacted",      v:`${Math.round(simValue[0]/100*5)} / 6`, c:"text-amber-400"},
                                            ].map(s=>(
                                                <div key={s.label} className="rounded-md border border-white/8 bg-white/[0.02] p-2.5 text-center">
                                                    <div className={`text-base font-bold font-mono ${s.c}`}>{s.v}</div>
                                                    <div className="text-[9px] text-white/25 mt-0.5 leading-tight">{s.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Infra targets */}
                                <div className="space-y-3">
                                    {INFRA_TARGETS.map(inf=>{
                                        const sev=inf.severity==="critical"?{c:"text-red-400",bg:"bg-red-500/10 border-red-500/25"}:
                                            inf.severity==="high"?{c:"text-amber-400",bg:"bg-amber-500/10 border-amber-500/25"}:
                                                {c:"text-yellow-400",bg:"bg-yellow-500/10 border-yellow-500/25"};
                                        const ph=phaseCfg[inf.phase];
                                        const typeIcon=inf.type==="roundabout"?CircleDot:inf.type==="bottleneck"?TrafficCone:inf.type==="signal_gap"?Signal:GitBranch;
                                        const TIcon=typeIcon;
                                        return (
                                            <div key={inf.id} className={`rounded-xl border p-4 ${sev.bg}`}>
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-md bg-violet-500/10"><TIcon className="w-3.5 h-3.5 text-violet-400"/></div>
                                                        <div>
                                                            <div className="text-[10px] font-mono text-white/30">{inf.id}</div>
                                                            <div className="text-xs font-semibold text-white/80">{inf.location}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="outline" className={`text-[9px] capitalize ${sev.c} border-current`}>{inf.severity}</Badge>
                                                        <Badge variant="outline" className={`text-[9px] ${ph.color} ${ph.bg.split(" ")[1]}`}>
                                                            P{inf.phase}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 mb-3">
                                                    <div className="flex gap-2 text-[11px]"><span className="text-white/25 w-12 shrink-0">Rec:</span><span className="text-white/65 leading-snug">{inf.recommendation}</span></div>
                                                    <div className="flex items-center gap-4 text-[11px]">
                                                        <span className="text-emerald-400/80">▲ {inf.simGain}% congestion red.</span>
                                                        <span className="text-cyan-400/80">⏱ -{inf.simTimeSaving} min avg</span>
                                                    </div>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {inf.affectedRoutes.map(r=>(
                                                            <Badge key={r} variant="outline" className="text-[9px] border-white/15 text-white/40 px-1.5">{r}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="h-7 text-[11px] bg-violet-700 hover:bg-violet-600 text-white border-0 gap-1">
                                                        <ArrowUpRight className="w-3 h-3"/>Escalate for Planning
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-[11px] border-white/15 text-white/40 hover:bg-white/5 gap-1">
                                                        <Eye className="w-3 h-3"/>Simulate Impact
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* AUDIT LOG */}
                            <TabsContent value="audit" className="flex-1 overflow-auto px-6 pb-6 pt-4">
                                <div className="rounded-xl border border-white/10 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                {["ID","Time","Operator","Route","AI Suggested","Final Action","Outcome"].map(h=>(
                                                    <TableHead key={h} className="text-[10px] tracking-widest text-white/25 uppercase bg-white/[0.03] font-semibold h-9">{h}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {AUDIT_LOGS.map(log=>(
                                                <TableRow key={log.id} className="border-white/6 hover:bg-white/[0.03]">
                                                    <TableCell className="text-[10px] font-mono text-white/30 py-3">{log.id}</TableCell>
                                                    <TableCell className="text-xs font-mono text-white/50">{log.time}</TableCell>
                                                    <TableCell className="text-xs text-white/60">{log.operator}</TableCell>
                                                    <TableCell className="text-xs text-white/55">{log.route}</TableCell>
                                                    <TableCell className="text-xs font-mono text-cyan-400/65">{log.aiSuggestion}</TableCell>
                                                    <TableCell className="text-xs text-white/55">{log.finalAction}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={`text-[10px] capitalize ${
                                                            log.type==="approved"?"border-emerald-500/40 text-emerald-400":
                                                                log.type==="auto_executed"?"border-cyan-500/40 text-cyan-400":
                                                                    log.type==="overridden"?"border-amber-500/40 text-amber-400":
                                                                        "border-red-500/40 text-red-400"
                                                        }`}>
                                                            {log.type==="approved"&&<Check className="w-2.5 h-2.5 mr-1"/>}
                                                            {log.type==="auto_executed"&&<Brain className="w-2.5 h-2.5 mr-1"/>}
                                                            {log.type==="overridden"&&<Edit3 className="w-2.5 h-2.5 mr-1"/>}
                                                            {log.type==="rejected"&&<X className="w-2.5 h-2.5 mr-1"/>}
                                                            {log.type.replace("_"," ")}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <p className="text-[10px] text-white/18 mt-3 text-center">Full audit trail maintained · Human decisions and AI auto-executions logged separately</p>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* RIGHT PANEL */}
                    <aside className="w-80 shrink-0 border-l border-white/8 flex flex-col">
                        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Brain className="w-4 h-4 text-cyan-400"/>
                                <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase">AI Advisor</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {pending.length>0&&(
                                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] h-5 px-1.5">{pending.length}</Badge>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/30 hover:text-white hover:bg-white/5">
                                            <Info className="w-3 h-3"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-zinc-800 border-white/10 text-xs max-w-52">
                                        AI recommendations are tagged by execution type: Auto (within policy), Requires Approval, or Escalation Required.
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Mode banner */}
                        <div className={`mx-3 mt-3 mb-1 rounded-md px-3 py-2 flex items-center gap-2 ${
                            aiMode==="assisted"?"bg-cyan-500/10 border border-cyan-500/20":"bg-amber-500/10 border border-amber-500/20"}`}>
                            {aiMode==="assisted"
                                ?<><Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0"/><span className="text-[10px] text-cyan-300/80">AI Assisted — executes within approved policy thresholds automatically.</span></>
                                :<><Shield className="w-3.5 h-3.5 text-amber-400 shrink-0"/><span className="text-[10px] text-amber-300/80">Operator Control — all AI actions require your explicit approval.</span></>
                            }
                        </div>

                        {/* Execution type legend */}
                        <div className="mx-3 mt-2 mb-1 space-y-1">
                            {[
                                {label:"Auto within policy",    c:"text-cyan-400",    bg:"bg-cyan-500/10",   desc:"AI executes, operator notified"},
                                {label:"Requires approval",     c:"text-amber-400",   bg:"bg-amber-500/10",  desc:"Wait for your ✓"},
                                {label:"Escalation required",   c:"text-red-400",     bg:"bg-red-500/10",    desc:"Supervisor action needed"},
                            ].map(t=>(
                                <div key={t.label} className={`flex items-center gap-2 rounded px-2 py-1 ${t.bg}`}>
                                    <span className={`text-[9px] font-bold ${t.c}`}>{t.label}</span>
                                    <span className="text-[9px] text-white/30 ml-auto">{t.desc}</span>
                                </div>
                            ))}
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-3">
                                {recs.map(rec=>(
                                    <RecommendationCard key={rec.id} rec={rec} onApprove={handleApprove} onReject={handleReject}/>
                                ))}
                            </div>
                        </ScrollArea>

                        {/* AI performance footer */}
                        <div className="border-t border-white/8 px-4 py-3 space-y-2">
                            <div className="text-[10px] text-white/28 uppercase tracking-widest mb-1">AI Performance</div>
                            <div className="space-y-1.5">
                                {[
                                    {label:"Route suggestion adoption",   v:68},
                                    {label:"Signal optimization accuracy", v:84},
                                    {label:"Congestion forecast accuracy", v:81},
                                    {label:"Operator trust score",         v:77},
                                ].map(m=>(
                                    <div key={m.label} className="space-y-0.5">
                                        <div className="flex justify-between text-[10px]">
                                            <span className="text-white/32">{m.label}</span>
                                            <span className="text-white/55 font-mono">{m.v}%</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                                            <div className="h-full rounded-full bg-cyan-500/45" style={{width:`${m.v}%`}}/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </TooltipProvider>
    );
}