"use client";

import { useState } from "react";
import {
    Brain, Bus, Signal, Layers, Settings, User, ChevronDown,
    Lock, Unlock, Check, X, Edit3, Shield, ShieldOff, ShieldAlert,
    ToggleLeft, ToggleRight, Info, RefreshCw, Clock, Bell,
    Route, History, BadgeCheck, Activity, Gauge, Timer,
    ArrowRight, ArrowUpRight, Navigation, TrafficCone, Zap,
    CircleDot, GitBranch, Focus, Milestone, ListChecks,
    Eye, CheckCircle2, Radio, Map, Waypoints, Siren,
    Building2, TreePine, Briefcase, TrendingUp, TrendingDown,
    Minus, AlertTriangle, ChevronRight, LayoutGrid, Workflow,
} from "lucide-react";

import { Badge }                           from "@/components/ui/badge";
import { Button }                          from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress }                        from "@/components/ui/progress";
import { ScrollArea }                      from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider }                          from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ─────────────────────────────────────────────
   SHARED TYPES
───────────────────────────────────────────── */
type Agency       = "traffic_control" | "psv_operations" | "urban_planning" | "enforcement";
type AgencyAIMode = "full_auto" | "assisted" | "operator" | "disabled";
type SignalMode   = "ai_managed" | "manual" | "fixed" | "emergency";
type RouteStatus  = "critical" | "delayed" | "normal" | "optimal";
type SystemPhase  = 1 | 2 | 3;
type PhaseStatus  = "active" | "pending" | "locked";

interface AgencyWorkspace {
    id: Agency;
    label: string;
    shortLabel: string;
    description: string;
    color: string;
    darkColor: string;
    bg: string;
    border: string;
    icon: React.ElementType;
    aiMode: AgencyAIMode;
    operatorOnDuty: string;
    jurisdiction: string[];
    pendingActions: number;
    lastActivity: string;
}

interface ControlModule {
    id: string;
    agency: Agency;
    name: string;
    description: string;
    status: "active" | "standby" | "paused" | "error";
    aiControlled: boolean;
    lastUpdated: string;
    metrics: { label: string; value: string; color: string }[];
}

interface SignalCorridor {
    id: string; name: string; routeId: string;
    signals: number; mode: SignalMode;
    avgGreenTime: number; aiRecommendedGreen: number;
    cycleLength: number;
    psvThroughput: number;
    priorityActive: boolean;
    lastAdjusted: string;
    lockedBy?: Agency;
}

interface RouteMode {
    id: string; name: string; corridor: string;
    origin: string; destination: string;
    status: RouteStatus; aiRoutingActive: boolean;
    signalMode: SignalMode;
    complianceRate: number; efficiency: number;
    activeVehicles: number; totalVehicles: number;
    avgDelay: number; phase: SystemPhase;
    governedBy: Agency[];
    aiLocked: boolean;
}

interface PhaseModule {
    phase: SystemPhase;
    label: string;
    status: PhaseStatus;
    description: string;
    routes: number;
    features: string[];
    aiCapabilities: string[];
    completion: number;
    targetDate: string;
}

interface CrossAgencyItem {
    id: string; type: "coordination" | "conflict" | "handoff";
    agencies: Agency[]; subject: string;
    description: string; status: "pending" | "resolved" | "active";
    priority: "high" | "medium" | "low";
    timestamp: string;
}

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const SYSTEM_PHASE: SystemPhase = 2;

const AGENCY_WORKSPACES: AgencyWorkspace[] = [
    {
        id: "traffic_control", label: "Traffic Control", shortLabel: "Traffic",
        description: "Manages signal corridors, AI timing policies, and network-wide traffic flow",
        color: "text-cyan-400", darkColor: "text-cyan-300",
        bg: "bg-cyan-500/10", border: "border-cyan-500/35",
        icon: Signal, aiMode: "assisted", operatorOnDuty: "Kamau N.",
        jurisdiction: ["Signal corridors", "PSV priority lanes", "Emergency routing"],
        pendingActions: 3, lastActivity: "15:44",
    },
    {
        id: "psv_operations", label: "PSV Operations", shortLabel: "PSV Ops",
        description: "Controls PSV fleet routing, pre-trip guidance, and operator dispatching",
        color: "text-amber-400", darkColor: "text-amber-300",
        bg: "bg-amber-500/10", border: "border-amber-500/35",
        icon: Bus, aiMode: "operator", operatorOnDuty: "Wangari J.",
        jurisdiction: ["Route assignments", "Pre-trip guidance", "Fleet positioning"],
        pendingActions: 2, lastActivity: "15:38",
    },
    {
        id: "urban_planning", label: "Urban Planning", shortLabel: "Planning",
        description: "Reviews infrastructure insights, phase roadmap, and long-term corridor planning",
        color: "text-violet-400", darkColor: "text-violet-300",
        bg: "bg-violet-500/10", border: "border-violet-500/35",
        icon: Building2, aiMode: "disabled", operatorOnDuty: "Achieng M.",
        jurisdiction: ["Phase roadmap", "Infra studies", "Corridor design"],
        pendingActions: 1, lastActivity: "15:31",
    },
    {
        id: "enforcement", label: "Enforcement", shortLabel: "Enforce",
        description: "Monitors compliance, manages deviation tiers, and coordinates regulatory actions",
        color: "text-red-400", darkColor: "text-red-300",
        bg: "bg-red-500/10", border: "border-red-500/35",
        icon: ShieldAlert, aiMode: "assisted", operatorOnDuty: "Otieno M.",
        jurisdiction: ["Deviation tracking", "Tier escalation", "Compliance reports"],
        pendingActions: 2, lastActivity: "15:39",
    },
];

const CONTROL_MODULES: ControlModule[] = [
    { id: "MOD-01", agency: "traffic_control", name: "Signal Timing Engine", description: "AI-managed PSV green phase optimization across all active corridors", status: "active", aiControlled: true,  lastUpdated: "15:44", metrics: [{ label: "Active corridors", value: "3/5", color: "text-cyan-400" }, { label: "Priority active", value: "3", color: "text-emerald-400" }, { label: "Avg PSV flow", value: "45/hr", color: "text-white/60" }] },
    { id: "MOD-02", agency: "traffic_control", name: "Congestion Predictor",  description: "30–120 min forward forecast for all PSV corridors", status: "active", aiControlled: true,  lastUpdated: "15:40", metrics: [{ label: "Routes monitored", value: "6", color: "text-cyan-400" }, { label: "Critical forecast", value: "2", color: "text-red-400" }, { label: "Accuracy",      value: "84%", color: "text-emerald-400" }] },
    { id: "MOD-03", agency: "psv_operations",  name: "Pre-Trip Advisor",     description: "AI guidance queue for PSV drivers before departure", status: "active", aiControlled: true,  lastUpdated: "15:38", metrics: [{ label: "Queued guidance",  value: "4", color: "text-amber-400" }, { label: "Acceptance rate", value: "68%", color: "text-white/60" }, { label: "Time saved", value: "44 min", color: "text-emerald-400" }] },
    { id: "MOD-04", agency: "psv_operations",  name: "Fleet Dispatcher",     description: "Vehicle assignment and positioning based on route demand", status: "standby", aiControlled: false, lastUpdated: "15:10", metrics: [{ label: "Active PSVs", value: "55", color: "text-amber-400" }, { label: "Off-route",    value: "5", color: "text-red-400" }, { label: "On schedule", value: "72%", color: "text-white/60" }] },
    { id: "MOD-05", agency: "enforcement",     name: "Geofence Monitor",     description: "Real-time PSV corridor boundary enforcement", status: "active", aiControlled: true,  lastUpdated: "15:39", metrics: [{ label: "Active geofences", value: "6", color: "text-red-400" }, { label: "Open breaches", value: "2", color: "text-red-400" }, { label: "Auto-resolved", value: "3", color: "text-emerald-400" }] },
    { id: "MOD-06", agency: "enforcement",     name: "Compliance Tracker",   description: "Driver and operator compliance scoring and reporting", status: "active", aiControlled: true,  lastUpdated: "15:35", metrics: [{ label: "Avg compliance", value: "79%", color: "text-amber-400" }, { label: "Flagged today", value: "7", color: "text-red-400" }, { label: "Reports pending", value: "2", color: "text-white/60" }] },
    { id: "MOD-07", agency: "urban_planning",  name: "Infra Intelligence",   description: "Identifies bottlenecks and recommends infrastructure upgrades", status: "active", aiControlled: true,  lastUpdated: "15:30", metrics: [{ label: "Open findings", value: "4", color: "text-violet-400" }, { label: "Escalated",    value: "1", color: "text-amber-400" }, { label: "Phase 3 items", value: "3", color: "text-white/60" }] },
    { id: "MOD-08", agency: "urban_planning",  name: "Phase Planner",        description: "Rollout roadmap and readiness tracking for system phases", status: "active", aiControlled: false, lastUpdated: "15:00", metrics: [{ label: "Current phase", value: "P2", color: "text-cyan-400" }, { label: "P3 readiness", value: "62%", color: "text-violet-400" }, { label: "Routes in P3", value: "0/6", color: "text-white/60" }] },
];

const SIGNAL_CORRIDORS: SignalCorridor[] = [
    { id: "SC-01", name: "Thika Rd",     routeId: "R-23", signals: 7, mode: "ai_managed", avgGreenTime: 42, aiRecommendedGreen: 58, cycleLength: 90,  psvThroughput: 38, priorityActive: true,  lastAdjusted: "15:41" },
    { id: "SC-02", name: "Jogoo Rd",     routeId: "R-11", signals: 5, mode: "fixed",      avgGreenTime: 35, aiRecommendedGreen: 52, cycleLength: 85,  psvThroughput: 21, priorityActive: false, lastAdjusted: "14:20", lockedBy: "traffic_control" },
    { id: "SC-03", name: "Ngong Rd",     routeId: "R-07", signals: 4, mode: "manual",     avgGreenTime: 38, aiRecommendedGreen: 44, cycleLength: 80,  psvThroughput: 29, priorityActive: false, lastAdjusted: "15:10" },
    { id: "SC-04", name: "Mombasa Rd",   routeId: "R-44", signals: 6, mode: "ai_managed", avgGreenTime: 44, aiRecommendedGreen: 46, cycleLength: 95,  psvThroughput: 45, priorityActive: true,  lastAdjusted: "15:38" },
    { id: "SC-05", name: "Waiyaki Way",  routeId: "R-56", signals: 3, mode: "ai_managed", avgGreenTime: 40, aiRecommendedGreen: 40, cycleLength: 75,  psvThroughput: 52, priorityActive: true,  lastAdjusted: "15:44" },
];

const ROUTE_MODES: RouteMode[] = [
    { id: "R-23", name: "Route 23", corridor: "Thika Rd",    origin: "CBD", destination: "Thika Town", status: "critical", aiRoutingActive: true,  signalMode: "ai_managed", complianceRate: 74, efficiency: 48, activeVehicles: 14, totalVehicles: 18, avgDelay: 22, phase: 1, governedBy: ["traffic_control","psv_operations","enforcement"], aiLocked: false },
    { id: "R-07", name: "Route 7",  corridor: "Ngong Rd",    origin: "CBD", destination: "Karen",       status: "delayed",  aiRoutingActive: true,  signalMode: "manual",     complianceRate: 88, efficiency: 68, activeVehicles: 9,  totalVehicles: 12, avgDelay: 11, phase: 2, governedBy: ["traffic_control","psv_operations"],                  aiLocked: false },
    { id: "R-44", name: "Route 44", corridor: "Mombasa Rd",  origin: "CBD", destination: "JKIA",        status: "normal",   aiRoutingActive: true,  signalMode: "ai_managed", complianceRate: 94, efficiency: 82, activeVehicles: 11, totalVehicles: 11, avgDelay: 4,  phase: 2, governedBy: ["traffic_control","psv_operations"],                  aiLocked: false },
    { id: "R-11", name: "Route 11", corridor: "Jogoo Rd",    origin: "CBD", destination: "Eastlands",   status: "critical", aiRoutingActive: false, signalMode: "fixed",      complianceRate: 61, efficiency: 41, activeVehicles: 7,  totalVehicles: 15, avgDelay: 28, phase: 1, governedBy: ["traffic_control","psv_operations","enforcement"], aiLocked: true  },
    { id: "R-56", name: "Route 56", corridor: "Waiyaki Way", origin: "CBD", destination: "Westlands",   status: "optimal",  aiRoutingActive: true,  signalMode: "ai_managed", complianceRate: 99, efficiency: 96, activeVehicles: 8,  totalVehicles: 8,  avgDelay: 0,  phase: 2, governedBy: ["traffic_control","psv_operations"],                  aiLocked: false },
    { id: "R-31", name: "Route 31", corridor: "Uhuru Hwy",   origin: "CBD", destination: "Langata",     status: "delayed",  aiRoutingActive: true,  signalMode: "manual",     complianceRate: 81, efficiency: 61, activeVehicles: 6,  totalVehicles: 10, avgDelay: 14, phase: 2, governedBy: ["traffic_control","psv_operations"],                  aiLocked: false },
];

const PHASE_MODULES: PhaseModule[] = [
    {
        phase: 1, label: "Phase 1 — Pilot Tracking", status: "active",
        description: "Opt-in pilot on selected corridors. Core tracking and analytics only. No automated routing or signal control.",
        routes: 2, completion: 100, targetDate: "Completed",
        features: ["Live PSV tracking", "Route performance analytics", "Basic compliance monitoring", "Manual signal control"],
        aiCapabilities: ["Anomaly detection", "Congestion detection", "Deviation alerts"],
    },
    {
        phase: 2, label: "Phase 2 — AI Recommendations", status: "active",
        description: "Policy-backed adoption. AI generates route and signal recommendations requiring operator approval. Pre-trip guidance active.",
        routes: 4, completion: 68, targetDate: "Q3 2025",
        features: ["AI route recommendations", "Signal priority corridors", "Pre-trip driver guidance", "Compliance enforcement tiers", "Infrastructure insights"],
        aiCapabilities: ["Route optimization", "Signal timing suggestions", "Predictive congestion", "Automated soft enforcement"],
    },
    {
        phase: 3, label: "Phase 3 — Full Automation", status: "pending",
        description: "City-wide expansion. AI executes within policy thresholds autonomously. Signal automation active. Infrastructure upgrades integrated.",
        routes: 0, completion: 0, targetDate: "Q1 2026",
        features: ["Autonomous signal control", "Dynamic rerouting", "Infrastructure integration", "Cross-agency data sharing", "All 100+ routes"],
        aiCapabilities: ["Full signal automation", "Dynamic rerouting (incidents)", "Predictive infrastructure alerts", "Autonomous compliance scoring"],
    },
];

const CROSS_AGENCY: CrossAgencyItem[] = [
    { id: "CA-001", type: "conflict",      agencies: ["traffic_control","enforcement"],  subject: "Jogoo Rd Fixed Override", description: "SC-02 fixed mode set by traffic control is delaying enforcement geofence effectiveness on R-11", status: "active",  priority: "high",   timestamp: "15:20" },
    { id: "CA-002", type: "coordination",  agencies: ["psv_operations","traffic_control"],subject: "Route 7 Pre-Trip Push",   description: "PSV Ops needs traffic signal clearance before pushing Mbagathi Rd bypass to R-07 drivers",  status: "pending", priority: "high",   timestamp: "15:38" },
    { id: "CA-003", type: "handoff",       agencies: ["traffic_control","urban_planning"],subject: "Pangani Roundabout Study", description: "Traffic ops has escalated Pangani roundabout findings to urban planning Phase 3 roadmap",       status: "resolved",priority: "medium", timestamp: "15:31" },
    { id: "CA-004", type: "coordination",  agencies: ["enforcement","psv_operations"],   subject: "Route 11 Deviation Pattern",description: "Enforcement escalation for 3 repeat-deviation vehicles requires PSV Ops fleet review",         status: "pending", priority: "high",   timestamp: "15:41" },
];

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const agencyCfg: Record<Agency, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    traffic_control: { label: "Traffic Control", color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/35",   icon: Signal },
    psv_operations:  { label: "PSV Operations",  color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/35",  icon: Bus },
    urban_planning:  { label: "Urban Planning",  color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/35", icon: Building2 },
    enforcement:     { label: "Enforcement",     color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/35",    icon: ShieldAlert },
};

const aiModeCfg: Record<AgencyAIMode, { label: string; color: string; bg: string; border: string; desc: string }> = {
    full_auto:  { label: "Full Auto",       color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/35", desc: "AI executes autonomously within policy" },
    assisted:   { label: "AI Assisted",     color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/35",    desc: "AI recommends; auto-execute within thresholds" },
    operator:   { label: "Operator Ctrl",   color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/35",   desc: "All AI actions require manual approval" },
    disabled:   { label: "AI Disabled",     color: "text-white/35",    bg: "bg-white/5",        border: "border-white/15",       desc: "No AI involvement; fully manual" },
};

const signalModeCfg: Record<SignalMode, { label: string; color: string; icon: React.ElementType }> = {
    ai_managed: { label: "AI Managed", color: "text-cyan-400",  icon: Brain },
    manual:     { label: "Manual",     color: "text-amber-400", icon: Edit3 },
    fixed:      { label: "Fixed",      color: "text-white/40",  icon: Lock },
    emergency:  { label: "Emergency",  color: "text-red-400",   icon: Siren },
};

const routeStatusCfg: Record<RouteStatus, { label: string; color: string; bar: string; dot: string }> = {
    critical: { label: "Critical", color: "text-red-400",     bar: "bg-red-500",     dot: "bg-red-400" },
    delayed:  { label: "Delayed",  color: "text-amber-400",   bar: "bg-amber-500",   dot: "bg-amber-400" },
    normal:   { label: "Normal",   color: "text-yellow-400",  bar: "bg-yellow-500",  dot: "bg-yellow-400" },
    optimal:  { label: "Optimal",  color: "text-emerald-400", bar: "bg-emerald-500", dot: "bg-emerald-400" },
};

const phaseCfg: Record<SystemPhase, { color: string; bg: string; border: string }> = {
    1: { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
    2: { color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/30" },
    3: { color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30" },
};

const modulusStatusCfg = {
    active:  { label: "Active",  color: "text-emerald-400", dot: "bg-emerald-400" },
    standby: { label: "Standby", color: "text-amber-400",   dot: "bg-amber-400" },
    paused:  { label: "Paused",  color: "text-white/35",    dot: "bg-white/30" },
    error:   { label: "Error",   color: "text-red-400",     dot: "bg-red-400" },
};

/* ─────────────────────────────────────────────
   SIGNAL OVERRIDE SHEET
───────────────────────────────────────────── */
function SignalOverrideSheet({ corridor, onClose }: { corridor: SignalCorridor; onClose: () => void }) {
    const [green, setGreen]   = useState([corridor.avgGreenTime]);
    const [cycle, setCycle]   = useState([corridor.cycleLength]);
    const [reason, setReason] = useState("");
    const SigIcon = signalModeCfg[corridor.mode].icon;

    return (
        <div className="space-y-5 pt-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white/80">{corridor.name} Corridor</span>
                    <div className={`flex items-center gap-1 text-[11px] ${signalModeCfg[corridor.mode].color}`}>
                        <SigIcon className="w-3.5 h-3.5"/>{signalModeCfg[corridor.mode].label}
                    </div>
                </div>
                <div className="text-[11px] text-white/40">{corridor.signals} managed signals · Route {corridor.routeId}</div>
                {corridor.lockedBy && (
                    <div className={`flex items-center gap-1 text-[10px] ${agencyCfg[corridor.lockedBy].color} mt-1`}>
                        <Lock className="w-3 h-3"/>Locked by {agencyCfg[corridor.lockedBy].label}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                {[
                    { label: "Current Green",    value: `${corridor.avgGreenTime}s`,       color: "text-white/60" },
                    { label: "AI Recommends",    value: `${corridor.aiRecommendedGreen}s`, color: "text-cyan-400" },
                    { label: "Override Green",   value: `${green[0]}s`,                    color: "text-amber-400" },
                    { label: "PSV Throughput",   value: `${corridor.psvThroughput}/hr`,    color: "text-white/60" },
                ].map(s => (
                    <div key={s.label} className="rounded-md border border-white/10 bg-white/[0.03] p-2.5 text-center">
                        <div className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</div>
                        <div className="text-[9px] text-white/28 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <label className="text-xs font-semibold text-white/60">PSV Green Phase (seconds)</label>
                <Slider value={green} onValueChange={setGreen} min={20} max={90} step={5}/>
                <div className="flex justify-between text-[10px] text-white/25">
                    <span>20s min</span>
                    <span className="text-amber-400 font-bold font-mono">{green[0]}s</span>
                    <span>90s max</span>
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-xs font-semibold text-white/60">Signal Cycle Length (seconds)</label>
                <Slider value={cycle} onValueChange={setCycle} min={60} max={150} step={5}/>
                <div className="flex justify-between text-[10px] text-white/25">
                    <span>60s</span>
                    <span className="text-white/50 font-bold font-mono">{cycle[0]}s</span>
                    <span>150s</span>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60">Reason for Override</label>
                <Select onValueChange={setReason}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white/70 text-xs h-9">
                        <SelectValue placeholder="Select reason..."/>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                        {["Traffic incident on corridor","Emergency vehicle priority","Special event","AI confidence too low","Sensor malfunction","Policy directive","Cross-agency coordination"].map(r => (
                            <SelectItem key={r} value={r} className="text-xs text-white/70 focus:bg-white/10">{r}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {green[0] > 70 && (
                <div className="flex gap-2 items-start rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"/>
                    <p className="text-[11px] text-amber-300/80">Extended green may cause side-street congestion. Coordinate with adjacent corridors.</p>
                </div>
            )}

            <div className="flex gap-3 pt-1">
                <Button className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-bold h-10 text-sm gap-1.5" disabled={!reason}>
                    <Signal className="w-4 h-4"/>Apply Override
                </Button>
                <Button variant="outline" className="border-white/15 text-white/40 hover:bg-white/5 h-10" onClick={onClose}>
                    Cancel
                </Button>
            </div>
            <p className="text-[10px] text-white/20 text-center">Override logged to audit trail with operator identity + timestamp</p>
        </div>
    );
}

/* ─────────────────────────────────────────────
   AGENCY AI MODE SELECTOR
───────────────────────────────────────────── */
function AgencyAIModeSelector({ mode, onChange, agencyColor }: {
    mode: AgencyAIMode; onChange: (m: AgencyAIMode) => void; agencyColor: string;
}) {
    const modes: AgencyAIMode[] = ["full_auto","assisted","operator","disabled"];
    return (
        <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">AI Operating Mode</div>
            <div className="grid grid-cols-2 gap-1.5">
                {modes.map(m => {
                    const mc = aiModeCfg[m];
                    const isActive = mode === m;
                    return (
                        <button key={m} onClick={() => onChange(m)}
                                className={`flex flex-col gap-1 p-2.5 rounded-lg border text-left transition-all ${
                                    isActive ? `${mc.bg} ${mc.border} ring-1 ring-current/40` : "border-white/8 bg-white/[0.02] hover:border-white/15"
                                }`}>
                            <span className={`text-[10px] font-bold ${isActive ? mc.color : "text-white/35"}`}>{mc.label}</span>
                            <span className={`text-[9px] leading-snug ${isActive ? "text-white/50" : "text-white/20"}`}>{mc.desc}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   CONTROL MODULE CARD
───────────────────────────────────────────── */
function ControlModuleCard({ mod }: { mod: ControlModule }) {
    const ag = agencyCfg[mod.agency];
    const st = modulusStatusCfg[mod.status];
    const AgIcon = ag.icon;

    return (
        <div className={`rounded-xl border p-4 transition-all hover:border-white/15 ${
            mod.status === "active" ? "border-white/10 bg-white/[0.02]" :
                mod.status === "standby" ? "border-amber-500/15 bg-amber-500/3 opacity-75" :
                    "border-white/6 bg-white/[0.01] opacity-55"
        }`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                    <div className="text-xs font-bold text-white/85 leading-snug">{mod.name}</div>
                    <div className="text-[10px] font-mono text-white/30">{mod.id}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {mod.aiControlled && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-[9px] text-cyan-400/70">
                                    <Brain className="w-3 h-3"/>AI
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-800 border-white/10 text-xs">AI-controlled module</TooltipContent>
                        </Tooltip>
                    )}
                    <div className="flex items-center gap-1 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot} ${mod.status === "active" ? "animate-pulse" : ""}`}/>
                        <span className={st.color}>{st.label}</span>
                    </div>
                </div>
            </div>

            <p className="text-[11px] text-white/40 leading-snug mb-3">{mod.description}</p>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
                {mod.metrics.map(m => (
                    <div key={m.label} className="rounded-md border border-white/8 bg-white/[0.02] p-2 text-center">
                        <div className={`text-xs font-bold font-mono ${m.color}`}>{m.value}</div>
                        <div className="text-[9px] text-white/25 mt-0.5 leading-tight">{m.label}</div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-[10px] ${ag.color}`}>
                    <AgIcon className="w-3 h-3"/>{ag.label}
                </div>
                <div className="flex gap-1.5">
                    {mod.status === "active" && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-amber-400 hover:bg-amber-500/10">
                            <Zap className="w-3 h-3 mr-1"/>Config
                        </Button>
                    )}
                    {mod.status === "standby" && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10">
                            <CheckCircle2 className="w-3 h-3 mr-1"/>Activate
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function ModesPage() {
    const [workspaces, setWorkspaces] = useState(AGENCY_WORKSPACES);
    const [activeAgency, setActiveAgency] = useState<Agency>("traffic_control");
    const [signalSheet, setSignalSheet]   = useState<SignalCorridor | null>(null);
    const [simValue, setSimValue]         = useState([50]);

    const currentWS   = workspaces.find(w => w.id === activeAgency)!;
    const CurrentIcon = currentWS.icon;

    const updateAgencyMode = (agency: Agency, mode: AgencyAIMode) => {
        setWorkspaces(p => p.map(w => w.id === agency ? { ...w, aiMode: mode } : w));
    };

    const agencyModules  = CONTROL_MODULES.filter(m => m.agency === activeAgency);
    const agencyRoutes   = ROUTE_MODES.filter(r => r.governedBy.includes(activeAgency));
    const agencyCorridors = SIGNAL_CORRIDORS; // traffic control sees all
    const crossItems     = CROSS_AGENCY.filter(c => c.agencies.includes(activeAgency));

    return (
        <TooltipProvider delayDuration={300}>
            <div className="min-h-screen bg-[#0d0f12] text-white" style={{ fontFamily: "'DM Mono','JetBrains Mono',monospace" }}>

                {/* Scanline */}
                <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
                     style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.3) 2px,rgba(255,255,255,0.3) 3px)" }}/>

                {/* Phase banner */}
                <div className={`relative z-20 flex items-center justify-center gap-3 px-4 py-1.5 border-b ${phaseCfg[SYSTEM_PHASE].bg} ${phaseCfg[SYSTEM_PHASE].border}`}>
                    <Layers className={`w-3.5 h-3.5 ${phaseCfg[SYSTEM_PHASE].color}`}/>
                    <span className={`text-[11px] font-bold ${phaseCfg[SYSTEM_PHASE].color}`}>Phase {SYSTEM_PHASE} Deployment</span>
                    <span className="text-[10px] text-white/30">·</span>
                    <span className="text-[10px] text-white/40">AI Recommendations Active · Policy-backed corridors</span>
                    <div className="absolute right-4 flex gap-1.5">
                        {([1,2,3] as SystemPhase[]).map(p => (
                            <div key={p} className={`w-1.5 h-1.5 rounded-full ${p <= SYSTEM_PHASE ? phaseCfg[p].color.replace("text-","bg-") : "bg-white/15"}`}/>
                        ))}
                    </div>
                </div>

                {/* ── TOPBAR ── */}
                <header className="relative z-10 h-14 border-b border-white/8 bg-[#0d0f12]/95 backdrop-blur-sm flex items-center px-5 gap-4">
                    <div className="flex items-center gap-2.5 shrink-0">
                        <div className="relative w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-cyan-400"/>
                        </div>
                        <div>
                            <div className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase">Control Modes</div>
                            <div className="text-[9px] tracking-widest text-white/30 uppercase">TransitCtrl · Multi-Agency</div>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1"/>

                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                        <span>LIVE</span>
                        <span className="text-white/20">·</span>
                        <Clock className="w-3 h-3"/>
                        <span>15:46</span>
                    </div>

                    {/* Per-agency AI mode pills */}
                    <div className="hidden xl:flex items-center gap-2 ml-2">
                        {workspaces.map(ws => {
                            const mc   = aiModeCfg[ws.aiMode];
                            const WIcon = ws.icon;
                            return (
                                <Tooltip key={ws.id}>
                                    <TooltipTrigger asChild>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] cursor-pointer transition-all hover:ring-1 hover:ring-white/20 ${mc.bg} ${mc.border}`}
                                             onClick={() => setActiveAgency(ws.id)}>
                                            <WIcon className={`w-3 h-3 ${ws.color}`}/>
                                            <span className={`font-bold ${ws.color}`}>{ws.shortLabel}</span>
                                            <span className={`text-[9px] ${mc.color}`}>{mc.label}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-zinc-800 border-white/10 text-xs">{ws.label} · {ws.operatorOnDuty} on duty</TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>

                    <div className="flex-1"/>

                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-white/40 hover:text-white hover:bg-white/5 text-[11px]">
                        <RefreshCw className="w-3.5 h-3.5"/>Sync
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-white/50 hover:text-white hover:bg-white/5 text-[11px]">
                                <User className="w-3.5 h-3.5"/>{currentWS.operatorOnDuty}<ChevronDown className="w-3 h-3"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 w-44">
                            <DropdownMenuLabel className="text-white/40 text-[10px]">{currentWS.label}</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10"/>
                            <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 gap-2"><Settings className="w-3.5 h-3.5"/>Settings</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 gap-2"><History className="w-3.5 h-3.5"/>Audit Trail</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* ── MAIN ── */}
                <main className="relative z-10 flex h-[calc(100vh-84px)]">

                    {/* LEFT — AGENCY SELECTOR */}
                    <aside className="w-60 shrink-0 border-r border-white/8 flex flex-col">
                        <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                            <Workflow className="w-4 h-4 text-white/40"/>
                            <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase">Agencies</span>
                        </div>

                        <div className="p-3 space-y-2 flex-1">
                            {workspaces.map(ws => {
                                const WSIcon  = ws.icon;
                                const mc      = aiModeCfg[ws.aiMode];
                                const isActive = ws.id === activeAgency;
                                return (
                                    <button key={ws.id} onClick={() => setActiveAgency(ws.id)}
                                            className={`w-full flex flex-col gap-2 p-3 rounded-xl border text-left transition-all ${
                                                isActive ? `${ws.bg} ${ws.border} ring-2 ring-current/50 scale-[1.02]` : "border-white/8 bg-white/[0.02] hover:border-white/15"
                                            }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <WSIcon className={`w-4 h-4 ${ws.color}`}/>
                                                <span className={`text-[11px] font-bold ${isActive ? ws.color : "text-white/55"}`}>{ws.label}</span>
                                            </div>
                                            {ws.pendingActions > 0 && (
                                                <span className="text-[10px] font-bold font-mono text-amber-400">{ws.pendingActions}</span>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-[9px] px-1.5 py-0.5 rounded-md self-start ${mc.bg} ${mc.border} border ${mc.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${mc.color.replace("text-","bg-")}`}/>
                                            {mc.label}
                                        </div>
                                        <div className="text-[9px] text-white/30 flex items-center gap-1">
                                            <User className="w-3 h-3"/>{ws.operatorOnDuty}
                                            <span className="text-white/15 ml-auto">{ws.lastActivity}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Global AI mode summary */}
                        <div className="px-3 pb-3 border-t border-white/8 pt-3 space-y-1.5">
                            <div className="text-[9px] uppercase tracking-widest text-white/25 font-bold mb-2">Global AI Status</div>
                            {workspaces.map(ws => {
                                const mc = aiModeCfg[ws.aiMode];
                                return (
                                    <div key={ws.id} className="flex items-center gap-2 text-[10px]">
                                        <span className={`w-1.5 h-1.5 rounded-full ${mc.color.replace("text-","bg-")} shrink-0`}/>
                                        <span className="text-white/35 flex-1 truncate">{ws.shortLabel}</span>
                                        <span className={`font-bold ${mc.color}`}>{mc.label.split(" ")[0]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>

                    {/* CENTER — WORKSPACE */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Agency workspace header */}
                        <div className={`px-6 py-4 border-b border-white/8 flex items-center justify-between gap-4 ${currentWS.bg}/20`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${currentWS.bg} border ${currentWS.border}`}>
                                    <CurrentIcon className={`w-5 h-5 ${currentWS.color}`}/>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-sm font-bold text-white">{currentWS.label}</h1>
                                        <Badge variant="outline" className={`text-[10px] ${aiModeCfg[currentWS.aiMode].color} ${aiModeCfg[currentWS.aiMode].border}`}>
                                            {aiModeCfg[currentWS.aiMode].label}
                                        </Badge>
                                        {currentWS.pendingActions > 0 && (
                                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px]">
                                                {currentWS.pendingActions} pending
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-white/40 mt-0.5">{currentWS.description}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="outline" className="h-8 text-[11px] border-white/15 text-white/50 hover:bg-white/5 gap-1.5">
                                            <Settings className="w-3.5 h-3.5"/>Workspace Controls
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                        <DropdownMenuLabel className="text-[10px] text-white/30">{currentWS.label} Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-white/10"/>
                                        {[
                                            { icon: Lock,      c: "text-amber-400", l: "Lock All AI for Agency" },
                                            { icon: ShieldOff, c: "text-red-400",   l: "Emergency Disable AI" },
                                            { icon: Eye,       c: "text-cyan-400",  l: "View Audit Trail" },
                                            { icon: Zap,       c: "text-emerald-400",l:"Push All Pending Actions" },
                                        ].map(m => (
                                            <DropdownMenuItem key={m.l} className="text-xs text-white/60 focus:bg-white/5 gap-2">
                                                <m.icon className={`w-3.5 h-3.5 ${m.c}`}/>{m.l}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs defaultValue="modules" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 pt-3 border-b border-white/8">
                                <TabsList className="bg-white/5 border border-white/10 h-8 p-0.5 gap-0.5">
                                    {[
                                        { v:"modules",   l:"Control Modules", icon: LayoutGrid },
                                        { v:"aimode",    l:"AI Mode",          icon: Brain },
                                        { v:"signals",   l:"Signal Corridors", icon: Signal },
                                        { v:"routes",    l:"Route Modes",      icon: Route },
                                        { v:"phases",    l:"Phase Roadmap",    icon: Layers },
                                        { v:"crossagency",l:"Cross-Agency",   icon: Workflow },
                                    ].map(t => (
                                        <TabsTrigger key={t.v} value={t.v}
                                                     className="h-7 px-3 text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded flex items-center gap-1.5">
                                            <t.icon className="w-3 h-3"/>{t.l}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            {/* CONTROL MODULES */}
                            <TabsContent value="modules" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-sm font-bold text-white">{currentWS.label} · Active Modules</div>
                                        <div className="text-[11px] text-white/40">Modular control units assigned to this agency</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                                            {agencyModules.filter(m => m.status === "active").length} Active
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                                            {agencyModules.filter(m => m.status === "standby").length} Standby
                                        </Badge>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {agencyModules.map(mod => <ControlModuleCard key={mod.id} mod={mod}/>)}
                                </div>
                                {agencyModules.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 text-white/20 gap-3">
                                        <LayoutGrid className="w-10 h-10"/>
                                        <span className="text-sm">No modules assigned to this agency</span>
                                    </div>
                                )}
                            </TabsContent>

                            {/* AI MODE */}
                            <TabsContent value="aimode" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Per-agency AI mode configurator */}
                                    <div className="space-y-5">
                                        <div>
                                            <div className="text-sm font-bold text-white mb-1">{currentWS.label} AI Mode</div>
                                            <div className="text-[11px] text-white/40">Configure how AI operates within this agency's jurisdiction</div>
                                        </div>
                                        <AgencyAIModeSelector
                                            mode={currentWS.aiMode}
                                            onChange={m => updateAgencyMode(activeAgency, m)}
                                            agencyColor={currentWS.color}
                                        />

                                        {/* Jurisdiction */}
                                        <div className={`rounded-xl border p-4 ${currentWS.bg} ${currentWS.border}`}>
                                            <div className="text-[10px] uppercase tracking-widest text-white/35 mb-2">Jurisdiction</div>
                                            <div className="space-y-1.5">
                                                {currentWS.jurisdiction.map(j => (
                                                    <div key={j} className="flex items-center gap-2 text-[11px] text-white/55">
                                                        <CheckCircle2 className={`w-3 h-3 ${currentWS.color} shrink-0`}/>{j}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Mode implications */}
                                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
                                            <div className="text-[10px] uppercase tracking-widest text-white/35 mb-1">Mode Implications</div>
                                            {aiModeCfg[currentWS.aiMode].label === "AI Disabled" ? (
                                                <div className="flex gap-2 items-start text-[11px] text-red-300/70">
                                                    <ShieldOff className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5"/>
                                                    AI is fully disabled for this agency. All actions require manual operator input.
                                                </div>
                                            ) : (
                                                <>
                                                    {[
                                                        { icon: Brain,  c: "text-cyan-400",    t: `AI running for ${currentWS.label}` },
                                                        { icon: Eye,    c: "text-white/40",    t: "All AI actions visible in audit trail" },
                                                        { icon: Shield, c: "text-amber-400",   t: "Human override always available" },
                                                        { icon: Zap,    c: "text-emerald-400", t: currentWS.aiMode === "full_auto" ? "Auto-execution active within policy" : currentWS.aiMode === "assisted" ? "Executes within thresholds; alerts on exceptions" : "Requires manual approval for all actions" },
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-[11px] text-white/50">
                                                            <item.icon className={`w-3.5 h-3.5 ${item.c} shrink-0`}/>{item.t}
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* All agencies overview */}
                                    <div className="space-y-3">
                                        <div className="text-[11px] uppercase tracking-widest text-white/35 font-bold">All Agency Modes</div>
                                        {workspaces.map(ws => {
                                            const mc = aiModeCfg[ws.aiMode];
                                            const WSIcon = ws.icon;
                                            return (
                                                <div key={ws.id} className={`rounded-xl border p-4 ${mc.bg} ${mc.border}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <WSIcon className={`w-4 h-4 ${ws.color}`}/>
                                                            <span className={`text-xs font-bold ${ws.color}`}>{ws.label}</span>
                                                        </div>
                                                        <Badge variant="outline" className={`text-[9px] ${mc.color} ${mc.border}`}>{mc.label}</Badge>
                                                    </div>
                                                    <p className="text-[10px] text-white/40 leading-snug mb-2">{mc.desc}</p>
                                                    {/* Quick mode toggle */}
                                                    <div className="flex gap-1.5">
                                                        {(["assisted","operator","disabled"] as AgencyAIMode[]).map(m => (
                                                            <button key={m} onClick={() => updateAgencyMode(ws.id, m)}
                                                                    className={`flex-1 py-1 rounded text-[9px] font-bold border transition-all ${
                                                                        ws.aiMode === m ? `${aiModeCfg[m].bg} ${aiModeCfg[m].border} ${aiModeCfg[m].color}` : "border-white/8 text-white/25 hover:border-white/20"
                                                                    }`}>
                                                                {m === "assisted" ? "Assist" : m === "operator" ? "Manual" : "Off"}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </TabsContent>

                            {/* SIGNAL CORRIDORS */}
                            <TabsContent value="signals" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-white">Signal Corridor Modes</div>
                                        <div className="text-[11px] text-white/40">Per-corridor signal control · AI executes within city authority policy thresholds</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-400">
                                            <Brain className="w-2.5 h-2.5 mr-1"/>{SIGNAL_CORRIDORS.filter(s => s.mode === "ai_managed").length} AI Managed
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                                            {SIGNAL_CORRIDORS.filter(s => s.priorityActive).length} Priority Active
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {agencyCorridors.map(corr => {
                                        const SigIcon = signalModeCfg[corr.mode].icon;
                                        const gap = corr.aiRecommendedGreen - corr.avgGreenTime;
                                        return (
                                            <div key={corr.id} className={`rounded-xl border p-4 transition-all ${
                                                corr.priorityActive ? "border-cyan-500/20 bg-cyan-500/5" :
                                                    corr.mode === "fixed" ? "border-white/15 bg-white/[0.02] opacity-80" :
                                                        "border-white/10 bg-white/[0.02]"
                                            }`}>
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-white/85">{corr.name} Corridor</span>
                                                            {corr.priorityActive && (
                                                                <Badge variant="outline" className="text-[9px] border-cyan-500/50 text-cyan-400 animate-pulse">PRIORITY</Badge>
                                                            )}
                                                            {corr.lockedBy && (
                                                                <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400">
                                                                    <Lock className="w-2.5 h-2.5 mr-1"/>Locked
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-white/30 font-mono">{corr.id} · {corr.signals} signals · Route {corr.routeId}</div>
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-[11px] ${signalModeCfg[corr.mode].color}`}>
                                                        <SigIcon className="w-3.5 h-3.5"/>
                                                        {signalModeCfg[corr.mode].label}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-4 gap-2 mb-3">
                                                    {[
                                                        { l: "Current Green", v: `${corr.avgGreenTime}s`,       c: "text-white/60" },
                                                        { l: "AI Recommends", v: `${corr.aiRecommendedGreen}s`, c: "text-cyan-400" },
                                                        { l: "Cycle Length",  v: `${corr.cycleLength}s`,        c: "text-white/50" },
                                                        { l: "PSV Flow",      v: `${corr.psvThroughput}/hr`,    c: gap > 5 ? "text-amber-400" : "text-emerald-400" },
                                                    ].map(s => (
                                                        <div key={s.l} className="rounded-md border border-white/8 bg-white/[0.02] p-2 text-center">
                                                            <div className={`text-xs font-bold font-mono ${s.c}`}>{s.v}</div>
                                                            <div className="text-[9px] text-white/25 mt-0.5 leading-tight">{s.l}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {gap > 0 && corr.mode !== "fixed" && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-amber-300/70 mb-3">
                                                        <Brain className="w-3 h-3 text-cyan-400/60 shrink-0"/>
                                                        AI recommends +{gap}s green phase · last adj. {corr.lastAdjusted}
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    {corr.mode !== "fixed" && gap > 0 && (
                                                        <Button size="sm" className="flex-1 h-7 text-[11px] bg-cyan-700 hover:bg-cyan-600 text-white border-0 gap-1">
                                                            <CheckCircle2 className="w-3 h-3"/>Apply AI Timing
                                                        </Button>
                                                    )}
                                                    <Sheet open={signalSheet?.id === corr.id} onOpenChange={o => !o && setSignalSheet(null)}>
                                                        <SheetTrigger asChild>
                                                            <Button size="sm" variant="outline"
                                                                    className={`${corr.mode !== "fixed" && gap > 0 ? "flex-1" : "flex-[2]"} h-7 text-[11px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1`}
                                                                    onClick={() => setSignalSheet(corr)}>
                                                                <Edit3 className="w-3 h-3"/>Manual Override
                                                            </Button>
                                                        </SheetTrigger>
                                                        <SheetContent side="right" className="w-[420px] bg-[#111316] border-l border-white/10 text-white">
                                                            <SheetHeader>
                                                                <SheetTitle className="text-white flex items-center gap-2">
                                                                    <Signal className="w-4 h-4 text-cyan-400"/>Signal Override
                                                                </SheetTitle>
                                                            </SheetHeader>
                                                            {signalSheet && <SignalOverrideSheet corridor={signalSheet} onClose={() => setSignalSheet(null)}/>}
                                                        </SheetContent>
                                                    </Sheet>
                                                    {corr.mode === "fixed" && (
                                                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-1">
                                                            <Unlock className="w-3 h-3"/>Release to AI
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* ROUTE MODES */}
                            <TabsContent value="routes" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-sm font-bold text-white">Route Mode Control</div>
                                        <div className="text-[11px] text-white/40">Per-route AI routing, signal, and compliance mode — govern only routes in your jurisdiction</div>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-white/10 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                {["Route","Corridor","Status","AI Routing","Signal Mode","Compliance","Efficiency","Governing","Phase",""].map(h => (
                                                    <TableHead key={h} className="text-[10px] tracking-widest text-white/25 uppercase bg-white/[0.03] font-semibold h-9 whitespace-nowrap">{h}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {agencyRoutes.map(r => {
                                                const sc = routeStatusCfg[r.status];
                                                const SigIcon = signalModeCfg[r.signalMode].icon;
                                                const ph = phaseCfg[r.phase];
                                                return (
                                                    <TableRow key={r.id} className="border-white/6 hover:bg-white/[0.03]">
                                                        <TableCell className="py-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${r.status === "critical" ? "animate-pulse" : ""}`}/>
                                                                <span className="text-xs font-mono font-bold text-white/70">{r.id}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-white/50 whitespace-nowrap">{r.corridor}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[9px] ${sc.color} border-current whitespace-nowrap`}>{sc.label}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {r.aiLocked
                                                                ? <div className="flex items-center gap-1 text-[10px] text-amber-400"><Lock className="w-3 h-3"/>Locked</div>
                                                                : r.aiRoutingActive
                                                                    ? <div className="flex items-center gap-1 text-[10px] text-cyan-400"><Brain className="w-3 h-3"/>Active</div>
                                                                    : <div className="flex items-center gap-1 text-[10px] text-white/30"><ShieldOff className="w-3 h-3"/>Off</div>
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className={`flex items-center gap-1 text-[10px] ${signalModeCfg[r.signalMode].color}`}>
                                                                <SigIcon className="w-3 h-3"/>{signalModeCfg[r.signalMode].label.split(" ")[0]}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className={`text-xs font-mono ${r.complianceRate >= 85 ? "text-emerald-400" : r.complianceRate >= 70 ? "text-amber-400" : "text-red-400"}`}>
                                                            {r.complianceRate}%
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="w-16 space-y-0.5">
                                                                <span className={`text-[10px] font-mono ${sc.color}`}>{r.efficiency}%</span>
                                                                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                                                    <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${r.efficiency}%` }}/>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1 flex-wrap">
                                                                {r.governedBy.map(ag => {
                                                                    const AIcon = agencyCfg[ag].icon;
                                                                    return (
                                                                        <Tooltip key={ag}>
                                                                            <TooltipTrigger asChild>
                                                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${agencyCfg[ag].bg} border ${agencyCfg[ag].border}`}>
                                                                                    <AIcon className={`w-3 h-3 ${agencyCfg[ag].color}`}/>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="bg-zinc-800 border-white/10 text-xs">{agencyCfg[ag].label}</TooltipContent>
                                                                        </Tooltip>
                                                                    );
                                                                })}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[9px] ${ph.color} ${ph.border}`}>P{r.phase}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-white/35 hover:bg-white/5 gap-1">
                                                                        <Settings className="w-3 h-3"/>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                                                                    <DropdownMenuLabel className="text-[10px] text-white/30">{r.name}</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator className="bg-white/10"/>
                                                                    <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 gap-2">
                                                                        {r.aiRoutingActive ? <><ShieldOff className="w-3.5 h-3.5 text-red-400"/>Disable AI Routing</> : <><Brain className="w-3.5 h-3.5 text-cyan-400"/>Enable AI Routing</>}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 gap-2">
                                                                        <Lock className="w-3.5 h-3.5 text-amber-400"/>Lock from AI Changes
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* PHASE ROADMAP */}
                            <TabsContent value="phases" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-white">System Phase Roadmap</div>
                                        <div className="text-[11px] text-white/40">Incremental rollout strategy · Modular capability expansion by phase</div>
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] ${phaseCfg[SYSTEM_PHASE].color} ${phaseCfg[SYSTEM_PHASE].border}`}>
                                        Phase {SYSTEM_PHASE} Active
                                    </Badge>
                                </div>

                                {/* Impact simulator */}
                                <Card className="bg-white/[0.02] border-violet-500/20">
                                    <CardHeader className="pb-2 pt-4 px-4">
                                        <CardTitle className="text-xs text-white/60 font-semibold tracking-widest uppercase flex items-center gap-2">
                                            <Focus className="w-3.5 h-3.5 text-violet-400"/>Network Impact Simulator · Phase 3 Preview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 space-y-4">
                                        <div className="text-[11px] text-white/40">Simulate projected network improvements if Phase 3 infrastructure changes are implemented:</div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-white/40">Interventions modelled</span>
                                                <span className="text-violet-400 font-bold font-mono">{Math.round(simValue[0] / 100 * 4)} / 4 infra changes</span>
                                            </div>
                                            <Slider value={simValue} onValueChange={setSimValue} min={0} max={100} step={25}/>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { label: "Congestion ↓",    v: `${Math.round(simValue[0] * 0.18)}%`,    c: "text-emerald-400" },
                                                { label: "Avg Time Saving",  v: `${Math.round(simValue[0] * 0.12)} min`, c: "text-cyan-400" },
                                                { label: "Routes Impacted",  v: `${Math.round(simValue[0] / 100 * 5)}/6`,c: "text-amber-400" },
                                                { label: "Signal Efficiency",v: `+${Math.round(simValue[0] * 0.08)}%`,   c: "text-violet-400" },
                                            ].map(s => (
                                                <div key={s.label} className="rounded-md border border-white/8 bg-white/[0.02] p-2.5 text-center">
                                                    <div className={`text-base font-bold font-mono ${s.c}`}>{s.v}</div>
                                                    <div className="text-[9px] text-white/25 mt-0.5 leading-tight">{s.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Phase cards */}
                                <div className="space-y-4">
                                    {PHASE_MODULES.map(pm => {
                                        const pc = phaseCfg[pm.phase];
                                        const isActive = pm.phase === SYSTEM_PHASE;
                                        const isPast   = pm.phase < SYSTEM_PHASE;
                                        return (
                                            <div key={pm.phase} className={`rounded-xl border p-5 transition-all ${
                                                isActive ? `${pc.bg} ${pc.border} ring-1 ring-current/30` :
                                                    isPast   ? "border-emerald-500/15 bg-emerald-500/5 opacity-80" :
                                                        "border-white/8 bg-white/[0.02] opacity-60"
                                            }`}>
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2.5 mb-1">
                                                            <Badge variant="outline" className={`text-[10px] ${pc.color} ${pc.border}`}>Phase {pm.phase}</Badge>
                                                            {isActive && <Badge className="text-[9px] bg-cyan-500/20 text-cyan-400 border-cyan-500/40 border">CURRENT</Badge>}
                                                            {isPast   && <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 border">COMPLETE</Badge>}
                                                            {!isActive && !isPast && <Badge className="text-[9px] bg-white/5 text-white/30 border-white/15 border">PENDING</Badge>}
                                                        </div>
                                                        <div className="text-sm font-bold text-white/85">{pm.label}</div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className={`text-xl font-bold font-mono ${pc.color}`}>{pm.completion}%</div>
                                                        <div className="text-[10px] text-white/30">{pm.targetDate}</div>
                                                    </div>
                                                </div>

                                                <p className="text-[11px] text-white/45 leading-relaxed mb-4">{pm.description}</p>

                                                <div className="mb-4">
                                                    <div className="flex justify-between text-[10px] mb-1">
                                                        <span className="text-white/30">Completion</span>
                                                        <span className={`${pc.color} font-mono`}>{pm.completion}%</span>
                                                    </div>
                                                    <Progress value={pm.completion} className="h-1.5 bg-white/10"/>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <div className="text-[9px] uppercase tracking-widest text-white/25 mb-1.5">Features</div>
                                                        <div className="space-y-1">
                                                            {pm.features.map(f => (
                                                                <div key={f} className="flex items-center gap-1.5 text-[10px] text-white/50">
                                                                    <CheckCircle2 className={`w-3 h-3 ${isPast || isActive ? pc.color : "text-white/20"} shrink-0`}/>{f}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] uppercase tracking-widest text-white/25 mb-1.5">AI Capabilities</div>
                                                        <div className="space-y-1">
                                                            {pm.aiCapabilities.map(c => (
                                                                <div key={c} className="flex items-center gap-1.5 text-[10px] text-white/50">
                                                                    <Brain className={`w-3 h-3 text-cyan-400/50 shrink-0`}/>{c}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* CROSS-AGENCY */}
                            <TabsContent value="crossagency" className="flex-1 overflow-auto px-6 pb-6 pt-4 mt-0 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-bold text-white">Cross-Agency Coordination</div>
                                        <div className="text-[11px] text-white/40">Conflicts, handoffs, and joint actions requiring multi-agency coordination</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400">
                                            {crossItems.filter(c => c.status === "pending" && c.priority === "high").length} High Priority
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                                            {crossItems.filter(c => c.status === "resolved").length} Resolved
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {crossItems.map(item => {
                                        const typeCfg = {
                                            conflict:     { color: "text-red-400",    bg: "bg-red-500/10 border-red-500/25",     icon: X },
                                            coordination: { color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/25",   icon: Workflow },
                                            handoff:      { color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/25",icon: ArrowRight },
                                        }[item.type];
                                        const prioCfg = {
                                            high:   "text-red-400",
                                            medium: "text-amber-400",
                                            low:    "text-white/35",
                                        }[item.priority];
                                        const statusCfg2 = {
                                            pending:  { color: "text-amber-400",   border: "border-amber-500/40" },
                                            active:   { color: "text-cyan-400",    border: "border-cyan-500/40" },
                                            resolved: { color: "text-emerald-400", border: "border-emerald-500/40" },
                                        }[item.status];
                                        const TypeIcon = typeCfg.icon;

                                        return (
                                            <div key={item.id} className={`rounded-xl border p-4 ${typeCfg.bg} ${item.status === "resolved" ? "opacity-60" : ""}`}>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-md ${item.type === "conflict" ? "bg-red-500/15" : item.type === "coordination" ? "bg-cyan-500/15" : "bg-violet-500/15"}`}>
                                                            <TypeIcon className={`w-3.5 h-3.5 ${typeCfg.color}`}/>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-mono text-white/30">{item.id} · {item.timestamp}</div>
                                                            <div className="text-xs font-bold text-white/85">{item.subject}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[9px] font-bold uppercase ${prioCfg}`}>{item.priority}</span>
                                                        <Badge variant="outline" className={`text-[9px] capitalize ${statusCfg2.color} ${statusCfg2.border}`}>{item.status}</Badge>
                                                    </div>
                                                </div>

                                                <p className="text-[11px] text-white/50 leading-relaxed mb-3">{item.description}</p>

                                                {/* Involved agencies */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-[9px] text-white/25">Involves:</span>
                                                    {item.agencies.map((ag, i) => {
                                                        const ac = agencyCfg[ag];
                                                        const AIcon = ac.icon;
                                                        return (
                                                            <div key={ag} className="flex items-center">
                                                                <div className={`flex items-center gap-1 text-[10px] ${ac.color} px-1.5 py-0.5 rounded border ${ac.border} ${ac.bg}`}>
                                                                    <AIcon className="w-3 h-3"/>{ac.label.split(" ")[0]}
                                                                </div>
                                                                {i < item.agencies.length - 1 && <ArrowRight className="w-3 h-3 text-white/20 mx-1"/>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {item.status !== "resolved" && (
                                                    <div className="flex gap-2">
                                                        <Button size="sm" className="flex-1 h-7 text-[11px] bg-emerald-700 hover:bg-emerald-600 text-white border-0 gap-1">
                                                            <CheckCircle2 className="w-3 h-3"/>Mark Resolved
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px] border-white/15 text-white/40 hover:bg-white/5 gap-1">
                                                            <ArrowUpRight className="w-3 h-3"/>Escalate
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {crossItems.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-16 text-white/20 gap-3">
                                            <BadgeCheck className="w-10 h-10 text-emerald-400/30"/>
                                            <span className="text-sm">No cross-agency items for {currentWS.label}</span>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* RIGHT — QUICK STATUS */}
                    <aside className="w-64 shrink-0 border-l border-white/8 flex flex-col">
                        <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-white/40"/>
                            <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase">System Status</span>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-4">

                                {/* Agency quick stats */}
                                {workspaces.map(ws => {
                                    const WSIcon = ws.icon;
                                    const mc = aiModeCfg[ws.aiMode];
                                    return (
                                        <div key={ws.id} className={`rounded-lg border p-3 cursor-pointer transition-all hover:ring-1 hover:ring-white/15 ${
                                            activeAgency === ws.id ? `${ws.bg} ${ws.border}` : "border-white/8 bg-white/[0.02]"
                                        }`} onClick={() => setActiveAgency(ws.id)}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <WSIcon className={`w-4 h-4 ${ws.color}`}/>
                                                <span className={`text-[11px] font-bold ${ws.color}`}>{ws.shortLabel}</span>
                                                <div className="flex-1"/>
                                                {ws.pendingActions > 0 && (
                                                    <span className="text-[10px] font-bold text-amber-400">{ws.pendingActions}</span>
                                                )}
                                            </div>
                                            <div className={`text-[9px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${mc.bg} ${mc.border} ${mc.color} mb-1.5`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${mc.color.replace("text-","bg-")}`}/>
                                                {mc.label}
                                            </div>
                                            <div className="text-[9px] text-white/25 flex items-center gap-1">
                                                <User className="w-3 h-3"/>{ws.operatorOnDuty} · {ws.lastActivity}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Signal summary */}
                                <Card className="bg-white/[0.02] border-white/10">
                                    <CardHeader className="pb-2 pt-3 px-3">
                                        <CardTitle className="text-[10px] text-white/40 font-semibold tracking-widest uppercase flex items-center gap-1.5">
                                            <Signal className="w-3 h-3 text-cyan-400"/>Signal Corridors
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 pb-3 space-y-1.5">
                                        {SIGNAL_CORRIDORS.map(sc => {
                                            const SiI = signalModeCfg[sc.mode].icon;
                                            return (
                                                <div key={sc.id} className="flex items-center gap-2 text-[10px]">
                                                    <SiI className={`w-3 h-3 ${signalModeCfg[sc.mode].color} shrink-0`}/>
                                                    <span className="text-white/45 flex-1 truncate">{sc.name}</span>
                                                    {sc.priorityActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"/>}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>

                                {/* Phase progress */}
                                <Card className="bg-white/[0.02] border-white/10">
                                    <CardHeader className="pb-2 pt-3 px-3">
                                        <CardTitle className="text-[10px] text-white/40 font-semibold tracking-widest uppercase flex items-center gap-1.5">
                                            <Layers className="w-3 h-3 text-cyan-400"/>Rollout Progress
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 pb-3 space-y-2.5">
                                        {PHASE_MODULES.map(pm => {
                                            const pc = phaseCfg[pm.phase];
                                            return (
                                                <div key={pm.phase} className="space-y-1">
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className={pc.color}>Phase {pm.phase}</span>
                                                        <span className="font-mono text-white/50">{pm.completion}%</span>
                                                    </div>
                                                    <Progress value={pm.completion} className="h-1 bg-white/8"/>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </aside>
                </main>
            </div>
        </TooltipProvider>
    );
}