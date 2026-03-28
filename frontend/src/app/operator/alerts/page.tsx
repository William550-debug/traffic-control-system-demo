"use client";

import { useState } from "react";
import {
    AlertTriangle, Brain, Bus, Check, X, Clock, ChevronDown,
    ShieldAlert, Eye, ListChecks, Siren, Bell, Settings, User,
    Info, RefreshCw, ArrowRight, MapPin, BadgeCheck, Radio,
    Signal, Route, Layers, CheckCircle2, XCircle, CircleAlert,
    Filter, SortDesc, Megaphone, Zap, Shield, History, Inbox,
    Lock, Timer, Navigation, ChevronRight, Activity, TrendingUp,
    TriangleAlert, Construction, Bike, ParkingSquare,
    BarChart3, FileDown, FileText, Calendar, Gauge, Download,
    Flame, ArrowDownRight, ArrowUpRight, Car, AlertCircle,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ─────────────────────────────────────────────
   SHARED TYPES
───────────────────────────────────────────── */
type Severity         = "critical" | "high" | "medium" | "low" | "info";
type AlertCategory    = "deviation" | "congestion" | "signal" | "compliance" | "ai_rec" | "infrastructure" | "emergency";
type EnforcementTier  = "soft" | "administrative" | "operational";
type Agency           = "traffic_control" | "psv_operations" | "urban_planning" | "enforcement";
type AlertStatus      = "open" | "acknowledged" | "resolved" | "escalated";

interface LiveAlert {
    id: string;
    severity: Severity;
    category: AlertCategory;
    title: string;
    description: string;
    location: string;
    routeId?: string;
    routeName?: string;
    vehicleId?: string;
    timestamp: string;
    age: string; // human-readable
    status: AlertStatus;
    assignedTo: Agency;
    tier?: EnforcementTier;
    aiGenerated: boolean;
    confidence?: number;
    actionRequired: string;
    resolution?: string;
}

interface AlertStat {
    label: string;
    value: number | string;
    delta?: string;
    deltaUp?: boolean;
    color: string;
    icon: React.ElementType;
}

interface AgencyQueue {
    agency: Agency;
    label: string;
    color: string;
    bg: string;
    icon: React.ElementType;
    open: number;
    escalated: number;
    resolved: number;
    operatorOnDuty: string;
}

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const LIVE_ALERTS: LiveAlert[] = [
    {
        id: "ALT-031", severity: "critical", category: "deviation",
        title: "Major corridor breach — Route 11 / Makadara",
        description: "Vehicle KBA 441Z has deviated 560m from geofenced corridor. Third violation in 4 hours. Operational enforcement threshold exceeded.",
        location: "Makadara Jct, Jogoo Rd", routeId: "R-11", routeName: "Route 11",
        vehicleId: "KBA 441Z", timestamp: "15:39", age: "7 min ago",
        status: "open", assignedTo: "enforcement", tier: "operational",
        aiGenerated: true, confidence: 96,
        actionRequired: "Escalate to administrative review; contact supervisor Otieno J.",
    },
    {
        id: "ALT-030", severity: "critical", category: "congestion",
        title: "Route 23 — 93% congestion, 22 min avg delay",
        description: "Thika Rd corridor at near-capacity. 14 PSVs active, bunching near Pangani roundabout. AI recommends signal priority activation.",
        location: "Pangani Roundabout, Thika Rd", routeId: "R-23", routeName: "Route 23",
        timestamp: "15:44", age: "2 min ago",
        status: "acknowledged", assignedTo: "traffic_control",
        aiGenerated: true, confidence: 91,
        actionRequired: "Approve signal priority × 4 signals on Thika Rd corridor.",
    },
    {
        id: "ALT-029", severity: "high", category: "compliance",
        title: "Route 11 compliance rate dropped below 65%",
        description: "7 active deviations logged today. Compliance at 61% — well below 80% threshold. Pattern suggests driver non-adherence, not sensor error.",
        location: "Jogoo Rd Corridor", routeId: "R-11", routeName: "Route 11",
        timestamp: "15:35", age: "11 min ago",
        status: "open", assignedTo: "psv_operations", tier: "administrative",
        aiGenerated: true, confidence: 88,
        actionRequired: "Issue administrative compliance notice; flag for operator review.",
    },
    {
        id: "ALT-028", severity: "high", category: "signal",
        title: "Jogoo Rd signals still on fixed timing — AI blocked",
        description: "SC-02 corridor locked to fixed mode by manual override at 14:20. AI has pending recommendation to extend PSV green by 17s. Awaiting release.",
        location: "Jogoo Rd Corridor, SC-02", routeId: "R-11",
        timestamp: "15:20", age: "26 min ago",
        status: "open", assignedTo: "traffic_control",
        aiGenerated: false,
        actionRequired: "Review fixed override rationale and release for AI management or confirm manual extension.",
    },
    {
        id: "ALT-027", severity: "high", category: "ai_rec",
        title: "Pre-trip guidance pending — 4 Route 7 drivers",
        description: "AI has queued bypass recommendations for 4 pre-departure Route 7 drivers. Lane closure near Dagoretti Corner saves 11 min each. Driver notification not yet pushed.",
        location: "Ngong Rd / Dagoretti Corner", routeId: "R-07", routeName: "Route 7",
        timestamp: "15:38", age: "8 min ago",
        status: "open", assignedTo: "psv_operations",
        aiGenerated: true, confidence: 83,
        actionRequired: "Approve and push pre-trip guidance to drivers before 16:00 departure.",
    },
    {
        id: "ALT-026", severity: "medium", category: "infrastructure",
        title: "Pangani roundabout — 3× over design capacity",
        description: "AI infrastructure engine flags Pangani roundabout as root cause of R-23 delays. Recommended for Phase 3 signalization study. Escalation pending urban planning review.",
        location: "Pangani Roundabout, Thika Rd", routeId: "R-23",
        timestamp: "15:30", age: "16 min ago",
        status: "escalated", assignedTo: "urban_planning",
        aiGenerated: true, confidence: 94,
        actionRequired: "Escalate to urban planning team for Phase 3 infrastructure roadmap.",
        resolution: "Flagged — urban planning notified at 15:31",
    },
    {
        id: "ALT-025", severity: "medium", category: "deviation",
        title: "Route 23 — KDB 880T, 1.2 km corridor breach",
        description: "Vehicle has not followed designated route since Pangani. Likely avoiding congestion independently. No passenger safety concern but coverage gap reported.",
        location: "Thika Rd, Pangani", routeId: "R-23", routeName: "Route 23",
        vehicleId: "KDB 880T", timestamp: "14:58", age: "48 min ago",
        status: "open", assignedTo: "enforcement", tier: "administrative",
        aiGenerated: true, confidence: 82,
        actionRequired: "Log for daily compliance report; send soft notification to driver.",
    },
    {
        id: "ALT-024", severity: "low", category: "ai_rec",
        title: "Route 56 — AI confirms optimal state, no action needed",
        description: "Waiyaki Way corridor at 18% congestion, 99% compliance, signal priority active. AI auto-executed timing confirmation within policy thresholds.",
        location: "Waiyaki Way Corridor", routeId: "R-56", routeName: "Route 56",
        timestamp: "15:22", age: "24 min ago",
        status: "resolved", assignedTo: "traffic_control",
        aiGenerated: true, confidence: 98,
        actionRequired: "No action required.",
        resolution: "Auto-executed by AI within policy at 15:22",
    },
    {
        id: "ALT-023", severity: "low", category: "compliance",
        title: "Route 31 — Minor geofence breach, KCA 775L",
        description: "90m lateral deviation logged near Galleria. Within auto-resolve threshold. Driver notified automatically.",
        location: "Lang'ata Rd, Galleria", routeId: "R-31",
        vehicleId: "KCA 775L", timestamp: "14:33", age: "1 hr 13 min ago",
        status: "resolved", assignedTo: "enforcement", tier: "soft",
        aiGenerated: true, confidence: 90,
        actionRequired: "No action required — auto-resolved.",
        resolution: "Auto-logged; driver notification sent at 14:33",
    },
];

const AGENCY_QUEUES: AgencyQueue[] = [
    { agency: "traffic_control", label: "Traffic Control",  color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30",      icon: Signal,     open: 3, escalated: 0, resolved: 2, operatorOnDuty: "Kamau N." },
    { agency: "psv_operations",  label: "PSV Operations",   color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",    icon: Bus,        open: 2, escalated: 0, resolved: 1, operatorOnDuty: "Wangari J." },
    { agency: "urban_planning",  label: "Urban Planning",   color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/30",  icon: Layers,     open: 0, escalated: 1, resolved: 0, operatorOnDuty: "Achieng M." },
    { agency: "enforcement",     label: "Enforcement",      color: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",        icon: ShieldAlert,open: 2, escalated: 0, resolved: 2, operatorOnDuty: "Otieno M." },
];

const AUDIT_TRAIL = [
    { id: "AUD-009", time: "15:44", operator: "Kamau N.",   alert: "ALT-030", action: "Acknowledged — signal review in progress", type: "acknowledged" as const },
    { id: "AUD-008", time: "15:31", operator: "Achieng M.", alert: "ALT-026", action: "Escalated to urban planning roadmap queue", type: "escalated" as const },
    { id: "AUD-007", time: "15:22", operator: "System AI",  alert: "ALT-024", action: "Auto-resolved within policy threshold",     type: "auto" as const },
    { id: "AUD-006", time: "14:33", operator: "System AI",  alert: "ALT-023", action: "Auto-logged soft tier — driver notified",   type: "auto" as const },
    { id: "AUD-005", time: "14:20", operator: "Otieno M.",  alert: "ALT-028", action: "Fixed override applied — SC-02 Jogoo Rd",  type: "overridden" as const },
];

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const severityCfg: Record<Severity, {
    label: string; color: string; bg: string; dot: string; border: string; glow: string;
}> = {
    critical: { label: "Critical", color: "text-red-400",     bg: "bg-red-500/10",     dot: "bg-red-400",     border: "border-red-500/40",    glow: "shadow-red-500/10" },
    high:     { label: "High",     color: "text-orange-400",  bg: "bg-orange-500/10",  dot: "bg-orange-400",  border: "border-orange-500/35", glow: "shadow-orange-500/10" },
    medium:   { label: "Medium",   color: "text-amber-400",   bg: "bg-amber-500/10",   dot: "bg-amber-400",   border: "border-amber-500/30",  glow: "" },
    low:      { label: "Low",      color: "text-yellow-400",  bg: "bg-yellow-500/8",   dot: "bg-yellow-400",  border: "border-yellow-500/20", glow: "" },
    info:     { label: "Info",     color: "text-white/40",    bg: "bg-white/3",        dot: "bg-white/30",    border: "border-white/10",      glow: "" },
};

const categoryCfg: Record<AlertCategory, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    deviation:      { label: "Deviation",      color: "text-red-400",     bg: "bg-red-500/10",     icon: Navigation },
    congestion:     { label: "Congestion",     color: "text-orange-400",  bg: "bg-orange-500/10",  icon: Activity },
    signal:         { label: "Signal",         color: "text-cyan-400",    bg: "bg-cyan-500/10",    icon: Signal },
    compliance:     { label: "Compliance",     color: "text-amber-400",   bg: "bg-amber-500/10",   icon: BadgeCheck },
    ai_rec:         { label: "AI Rec.",        color: "text-violet-400",  bg: "bg-violet-500/10",  icon: Brain },
    infrastructure: { label: "Infrastructure", color: "text-violet-400",  bg: "bg-violet-500/10",  icon: Construction },
    emergency:      { label: "Emergency",      color: "text-red-500",     bg: "bg-red-600/15",     icon: Siren },
};

const agencyCfg: Record<Agency, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    traffic_control: { label: "Traffic Control", color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/30",   icon: Signal },
    psv_operations:  { label: "PSV Operations",  color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/30", icon: Bus },
    urban_planning:  { label: "Urban Planning",  color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/30",icon: Layers },
    enforcement:     { label: "Enforcement",     color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30",     icon: ShieldAlert },
};

const statusCfg: Record<AlertStatus, { label: string; color: string; bg: string }> = {
    open:         { label: "Open",         color: "text-white/60",    bg: "bg-white/5 border-white/15" },
    acknowledged: { label: "Acknowledged", color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30" },
    resolved:     { label: "Resolved",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
    escalated:    { label: "Escalated",    color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/30" },
};

const enforcementCfg: Record<EnforcementTier, { label: string; color: string; icon: React.ElementType }> = {
    soft:           { label: "Soft",           color: "text-yellow-400", icon: Eye },
    administrative: { label: "Administrative", color: "text-amber-400",  icon: ListChecks },
    operational:    { label: "Operational",    color: "text-red-400",    icon: ShieldAlert },
};

/* ─────────────────────────────────────────────
   REPORT DATA & HOOK
───────────────────────────────────────────── */
interface HourlySlice  { hour: number; volume: number; incidents: number }
interface PeakWindow   { start: string; end: string; label: string; volume: number; incidents: number; mode: "peak" | "elevated" | "normal" }
interface IncidentTally { critical: number; high: number; medium: number; low: number; info: number; total: number; deltaVsYesterday: number }
interface DailySummary  { totalVehicles: number; avgSpeedKmh: number; congestionIndex: number; peakVolumeHour: string; peakVolumePct: number; comparedYesterday: number }

function useDailyTrafficData(alerts: LiveAlert[]) {
    // Hourly volume — realistic Nairobi PSV pattern
    const hourlyVolume: HourlySlice[] = [
        {hour:0,volume:8,incidents:0},{hour:1,volume:5,incidents:0},{hour:2,volume:4,incidents:0},
        {hour:3,volume:4,incidents:0},{hour:4,volume:6,incidents:0},{hour:5,volume:18,incidents:1},
        {hour:6,volume:44,incidents:2},{hour:7,volume:78,incidents:4},{hour:8,volume:91,incidents:7},
        {hour:9,volume:72,incidents:3},{hour:10,volume:58,incidents:2},{hour:11,volume:54,incidents:2},
        {hour:12,volume:62,incidents:3},{hour:13,volume:67,incidents:3},{hour:14,volume:71,incidents:4},
        {hour:15,volume:69,incidents:3},{hour:16,volume:76,incidents:5},{hour:17,volume:95,incidents:9},
        {hour:18,volume:88,incidents:8},{hour:19,volume:64,incidents:4},{hour:20,volume:44,incidents:2},
        {hour:21,volume:30,incidents:1},{hour:22,volume:18,incidents:1},{hour:23,volume:11,incidents:0},
    ];

    const peakHours: PeakWindow[] = [
        { start:"07:00", end:"09:00", label:"Morning Peak",   volume:91, incidents:11, mode:"peak" },
        { start:"12:00", end:"14:00", label:"Midday Surge",   volume:67, incidents:6,  mode:"elevated" },
        { start:"17:00", end:"19:00", label:"Evening Peak",   volume:95, incidents:17, mode:"peak" },
    ];

    // Derive incident counts from live alerts
    const incidentCounts: IncidentTally = {
        critical: alerts.filter(a => a.severity === "critical").length,
        high:     alerts.filter(a => a.severity === "high").length,
        medium:   alerts.filter(a => a.severity === "medium").length,
        low:      alerts.filter(a => a.severity === "low").length,
        info:     alerts.filter(a => a.severity === "info").length,
        total:    alerts.length,
        deltaVsYesterday: +12,
    };

    const summary: DailySummary = {
        totalVehicles:      48_320,
        avgSpeedKmh:        28,
        congestionIndex:    74,
        peakVolumeHour:     "17:00",
        peakVolumePct:      95,
        comparedYesterday:  +6,
    };

    return { hourlyVolume, peakHours, incidentCounts, summary };
}

/* CSV builder */
function buildCSV(alerts: LiveAlert[], auditTrail: typeof AUDIT_TRAIL): string {
    const header = ["ID","Severity","Category","Title","Location","Route","Timestamp","Status","Agency","AI Generated","Confidence","Tier","Resolution"];
    const rows = alerts.map(a => [
        a.id, a.severity, a.category,
        `"${a.title.replace(/"/g,'""')}"`,
        `"${a.location}"`,
        a.routeId ?? "",
        a.timestamp, a.status, a.assignedTo,
        String(a.aiGenerated),
        a.confidence ?? "",
        a.tier ?? "",
        a.resolution ? `"${a.resolution.replace(/"/g,'""')}"` : "",
    ].join(","));
    const auditHeader = "\n\nAUDIT TRAIL\nLog ID,Time,Operator,Alert Ref,Action,Type";
    const auditRows = auditTrail.map(l => `${l.id},${l.time},${l.operator},${l.alert},"${l.action}",${l.type}`);
    return [header.join(","), ...rows, auditHeader, auditRows.join("\n")].join("\n");
}

function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────────
   REPORT SUB-COMPONENTS
───────────────────────────────────────────── */

/* Delta badge — shared by KPI cards */
function DeltaBadge({ value }: { value: number }) {
    const isPos = value >= 0;
    const Icon  = isPos ? ArrowUpRight : ArrowDownRight;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold font-mono ${isPos ? "text-red-400" : "text-emerald-400"}`}>
      <Icon className="w-3 h-3"/>
            {Math.abs(value)}% vs yesterday
    </span>
    );
}

/* KPI card */
function ReportKpiCard({ label, value, sub, color, icon: Icon, delta }: {
    label: string; value: string; sub?: string;
    color: string; icon: React.ElementType; delta?: number;
}) {
    return (
        <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                     style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }}/>
                </div>
                {delta !== undefined && <DeltaBadge value={delta}/>}
            </div>
            <div>
                <p className="text-2xl font-bold font-mono leading-none" style={{ color }}>{value}</p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/35 mt-1.5 leading-none">{label}</p>
                {sub && <p className="text-[10px] font-mono text-white/20 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

/* 24-hour bar chart — pure div/SVG, no external chart lib */
function HourlyBarsChart({ data }: { data: HourlySlice[] }) {
    const peak = Math.max(...data.map(d => d.volume));
    return (
        <div>
            <div className="flex items-end gap-px h-24">
                {data.map((d) => {
                    const pct        = d.volume / peak;
                    const isMorning  = d.hour >= 7  && d.hour <= 8;
                    const isEvening  = d.hour >= 17 && d.hour <= 18;
                    const isPeak     = d.volume === peak;
                    const barColor   = isPeak || isMorning || isEvening
                        ? "#f97316" : d.volume > 60 ? "#fbbf24" : "#22d3ee";
                    return (
                        <Tooltip key={d.hour}>
                            <TooltipTrigger asChild>
                                <div className="relative flex-1 rounded-t-sm cursor-default transition-all duration-300 hover:opacity-100"
                                     style={{ height: `${Math.max(3, pct * 100)}%`, background: barColor, opacity: 0.65 }}>
                                    {isPeak && (
                                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400"/>
                                    )}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-zinc-900 border-white/10 text-[11px] font-mono">
                                {String(d.hour).padStart(2,"0")}:00 — {d.volume}% volume · {d.incidents} incidents
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
            {/* Hour axis — every 4 hrs */}
            <div className="flex mt-1">
                {data.map((d) => (
                    <div key={d.hour} className="flex-1 text-center">
                        {d.hour % 4 === 0 && (
                            <span className="text-[9px] font-mono text-white/20">
                {String(d.hour).padStart(2,"0")}
              </span>
                        )}
                    </div>
                ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-5 mt-3">
                {[
                    { color:"#f97316", label:"Peak hour" },
                    { color:"#fbbf24", label:"Elevated" },
                    { color:"#22d3ee", label:"Normal" },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: l.color, opacity:.75 }}/>
                        <span className="text-[10px] font-mono text-white/30">{l.label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5 ml-1">
                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0"/>
                    <span className="text-[10px] font-mono text-white/30">Absolute peak</span>
                </div>
            </div>
        </div>
    );
}

/* Incident severity breakdown */
function IncidentBreakdown({ counts, alerts }: { counts: IncidentTally; alerts: LiveAlert[] }) {
    const rows: { key: keyof Omit<IncidentTally,"total"|"deltaVsYesterday">; label: string; icon: React.ElementType; color: string }[] = [
        { key:"critical", label:"Critical", icon:AlertTriangle, color:"#f87171" },
        { key:"high",     label:"High",     icon:Flame,         color:"#fb923c" },
        { key:"medium",   label:"Medium",   icon:AlertCircle,   color:"#fbbf24" },
        { key:"low",      label:"Low",      icon:Info,          color:"#facc15" },
        { key:"info",     label:"Info",     icon:Radio,         color:"#6b7280" },
    ];
    return (
        <div className="flex flex-col gap-2.5">
            {rows.map(({ key, label, icon: Icon, color }) => {
                const count = counts[key] as number;
                const pct   = counts.total > 0 ? Math.round((count / counts.total) * 100) : 0;
                return (
                    <div key={key} className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-20 shrink-0">
                            <Icon className="w-3 h-3 shrink-0" style={{ color }}/>
                            <span className="text-[11px] font-mono text-white/45">{label}</span>
                        </div>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${color}18` }}>
                            <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background: color }}/>
                        </div>
                        <span className="w-6 text-right font-bold font-mono text-[11px] shrink-0" style={{ color }}>
              {count}
            </span>
                        <span className="w-7 text-right font-mono text-[10px] text-white/25 shrink-0">{pct}%</span>
                    </div>
                );
            })}
            {/* Total row */}
            <div className="flex items-center justify-between pt-2 border-t border-white/8 mt-1">
                <span className="text-[11px] font-mono text-white/40 uppercase tracking-wide">Total alerts today</span>
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono text-white/85">{counts.total}</span>
                    <DeltaBadge value={counts.deltaVsYesterday}/>
                </div>
            </div>
        </div>
    );
}

/* Peak hours event log */
function PeakHoursLog({ peaks }: { peaks: PeakWindow[] }) {
    const modeColor = { peak:"#f97316", elevated:"#fbbf24", normal:"#22d3ee" } as const;
    const modeLabel = { peak:"Peak Traffic", elevated:"Elevated", normal:"Normal" } as const;
    return (
        <div className="flex flex-col gap-2.5">
            {peaks.map((peak, i) => {
                const incSeverity = peak.incidents > 15 ? "#f87171" : peak.incidents > 8 ? "#fb923c" : "#fbbf24";
                const mc = modeColor[peak.mode];
                return (
                    <div key={i} className="flex items-stretch gap-3 p-3.5 rounded-xl"
                         style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.08)", borderLeft:`3px solid ${incSeverity}` }}>
                        {/* Time badge */}
                        <div className="flex flex-col items-center justify-center gap-0.5 px-2.5 rounded-lg shrink-0"
                             style={{ background:`${incSeverity}08`, border:`1px solid ${incSeverity}20`, minWidth:64 }}>
                            <span className="text-[13px] font-bold font-mono leading-none" style={{ color: incSeverity }}>{peak.start}</span>
                            <span className="text-[9px] font-mono text-white/25 mt-0.5">–{peak.end}</span>
                        </div>
                        {/* Body */}
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-white/85">{peak.label}</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                                      style={{ color: mc, borderColor:`${mc}40`, background:`${mc}10` }}>
                  {modeLabel[peak.mode]}
                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1 text-[11px] font-mono text-white/45">
                                    <Car className="w-3 h-3 text-white/25"/>
                                    Volume: <strong className="text-white/75 ml-0.5">{peak.volume}%</strong>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] font-mono font-semibold" style={{ color: incSeverity }}>
                                    <AlertCircle className="w-3 h-3"/>
                                    {peak.incidents} incidents
                                </div>
                            </div>
                            {/* Volume bar */}
                            <div className="h-1 rounded-full overflow-hidden" style={{ background:`${mc}15` }}>
                                <div className="h-full rounded-full transition-all" style={{ width:`${peak.volume}%`, background: mc }}/>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* Section wrapper used by report tab */
function ReportSection({ title, subtitle, icon: Icon, iconColor, children }: {
    title: string; subtitle?: string; icon: React.ElementType;
    iconColor: string; children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                         style={{ background:`${iconColor}14`, border:`1px solid ${iconColor}28` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: iconColor }}/>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-white/80">{title}</div>
                        {subtitle && <div className="text-[10px] font-mono text-white/35 mt-0.5">{subtitle}</div>}
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
}

/* Full Reports tab */
function ReportsTab({ alerts }: { alerts: LiveAlert[] }) {
    const { hourlyVolume, peakHours, incidentCounts, summary } = useDailyTrafficData(alerts);
    const [exporting, setExporting] = useState<"csv" | null>(null);

    const today = new Date().toLocaleDateString("en-KE", {
        weekday:"long", day:"numeric", month:"long", year:"numeric",
    });

    const handleCSV = () => {
        setExporting("csv");
        const csv = buildCSV(alerts, AUDIT_TRAIL);
        downloadBlob(csv, `transitctrl-audit-${new Date().toISOString().slice(0,10)}.csv`, "text/csv");
        setTimeout(() => setExporting(null), 900);
    };

    const handlePrintPDF = () => {
        window.print();
    };

    return (
        <div className="flex flex-col gap-4 p-5">

            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-white/35"/>
                    <span className="text-[11px] font-mono text-white/40">{today}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleCSV} disabled={exporting !== null}
                            className="h-8 gap-1.5 text-[11px] font-mono tracking-wide font-semibold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/8">
                        {exporting === "csv"
                            ? <CheckCircle2 className="w-3.5 h-3.5"/>
                            : <FileDown className="w-3.5 h-3.5"/>
                        }
                        Export CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePrintPDF}
                            className="h-8 gap-1.5 text-[11px] font-mono tracking-wide font-semibold border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 bg-cyan-500/8">
                        <FileText className="w-3.5 h-3.5"/>
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ReportKpiCard label="Vehicles Today"  value={summary.totalVehicles.toLocaleString()}
                               icon={Car}           color="#22d3ee" delta={summary.comparedYesterday}/>
                <ReportKpiCard label="Avg Speed"        value={`${summary.avgSpeedKmh} km/h`}
                               icon={Activity}      color="#34d399" sub="City-wide average"/>
                <ReportKpiCard label="Congestion Index" value={`${summary.congestionIndex}/100`}
                               icon={Gauge}         color={summary.congestionIndex > 70 ? "#f97316" : "#fbbf24"}
                               sub="System-wide"/>
                <ReportKpiCard label="Total Alerts"     value={String(incidentCounts.total)}
                               icon={AlertTriangle} color="#f97316" delta={incidentCounts.deltaVsYesterday}/>
            </div>

            {/* Two-col middle */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReportSection title="24-Hour Traffic Volume"
                               subtitle={`Peak at ${summary.peakVolumeHour} · ${summary.peakVolumePct}% network capacity`}
                               icon={BarChart3} iconColor="#22d3ee">
                    <HourlyBarsChart data={hourlyVolume}/>
                </ReportSection>

                <ReportSection title="Alert Severity Breakdown"
                               subtitle={`${incidentCounts.total} total · ${incidentCounts.critical} critical · ${incidentCounts.high} high`}
                               icon={AlertTriangle} iconColor="#f97316">
                    <IncidentBreakdown counts={incidentCounts} alerts={alerts}/>
                </ReportSection>
            </div>

            {/* Peak hours log — full width */}
            <ReportSection title="Peak Hours Log"
                           subtitle="High-activity windows with incident density and traffic mode"
                           icon={Clock} iconColor="#fbbf24">
                <PeakHoursLog peaks={peakHours}/>
            </ReportSection>

            {/* Agency resolution breakdown */}
            <ReportSection title="Resolution by Agency" subtitle="How each agency handled today's alert volume"
                           icon={BadgeCheck} iconColor="#34d399">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {AGENCY_QUEUES.map(aq => {
                        const AqIcon = aq.icon;
                        const total  = aq.open + aq.resolved + aq.escalated;
                        const resPct = total > 0 ? Math.round((aq.resolved / total) * 100) : 0;
                        return (
                            <div key={aq.agency} className="flex flex-col gap-2 p-3 rounded-xl border border-white/8 bg-white/[0.02]">
                                <div className="flex items-center gap-1.5">
                                    <AqIcon className={`w-3.5 h-3.5 ${aq.color}`}/>
                                    <span className={`text-[10px] font-bold ${aq.color}`}>{aq.label}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {[
                                        { label:"Open",     v:aq.open,     c:"text-red-400" },
                                        { label:"Escalated",v:aq.escalated,c:"text-violet-400" },
                                        { label:"Resolved", v:aq.resolved, c:"text-emerald-400" },
                                    ].map(s => (
                                        <div key={s.label} className="flex justify-between text-[10px]">
                                            <span className="text-white/35">{s.label}</span>
                                            <span className={`font-mono font-bold ${s.c}`}>{s.v}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-1 space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-white/25">Resolution rate</span>
                                        <span className="font-mono text-emerald-400">{resPct}%</span>
                                    </div>
                                    <Progress value={resPct} className="h-1 bg-white/8"/>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ReportSection>

            {/* Export note */}
            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                 style={{ background:"rgba(34,211,238,0.04)", border:"1px solid rgba(34,211,238,0.15)" }}>
                <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5"/>
                <div>
                    <p className="text-[11px] font-mono text-white/50 leading-relaxed">
                        <strong className="text-cyan-400">Audit CSV</strong> exports include all alert records, severity,
                        agency assignments, resolution status, and the complete audit trail for this session.{" "}
                        <strong className="text-cyan-400">PDF</strong> triggers the browser print dialog.
                    </p>
                    <p className="text-[10px] font-mono text-white/25 mt-1.5">
                        {LIVE_ALERTS.length} alert records · {AUDIT_TRAIL.length} audit entries · Report date: {today}
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   RESOLUTION SHEET
───────────────────────────────────────────── */
function ResolveSheet({ alert, onClose }: { alert: LiveAlert; onClose: () => void }) {
    const [action, setAction] = useState("");
    const sev = severityCfg[alert.severity];
    const cat = categoryCfg[alert.category];
    const CatIcon = cat.icon;

    return (
        <div className="space-y-5 pt-2">
            {/* Alert summary */}
            <div className={`rounded-xl border p-4 ${sev.bg} ${sev.border}`}>
                <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-md ${cat.bg}`}><CatIcon className={`w-3.5 h-3.5 ${cat.color}`}/></div>
                    <div>
                        <div className="text-[10px] font-mono text-white/30">{alert.id} · {alert.timestamp}</div>
                        <div className="text-xs font-bold text-white/85 leading-snug">{alert.title}</div>
                    </div>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">{alert.description}</p>
            </div>

            {/* Required action */}
            <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest text-cyan-400/70 mb-1">Action Required</div>
                <p className="text-xs text-cyan-300/80">{alert.actionRequired}</p>
            </div>

            {/* Resolution type */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60">Resolution Action</label>
                <Select onValueChange={setAction}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white/70 text-xs h-9">
                        <SelectValue placeholder="Select resolution..."/>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                        {[
                            "Approved AI recommendation",
                            "Manual intervention applied",
                            "Escalated to senior operator",
                            "Escalated to agency supervisor",
                            "Noted — monitoring",
                            "False positive — dismissed",
                            "Deferred to next shift",
                        ].map(r => (
                            <SelectItem key={r} value={r} className="text-xs text-white/70 focus:bg-white/10">{r}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Agency routing */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60">Route to Agency</label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(agencyCfg).map((ag, i) => {
                        const AgIcon = ag.icon;
                        const agency = Object.keys(agencyCfg)[i] as Agency;
                        const isAssigned = alert.assignedTo === agency;
                        return (
                            <button key={agency} className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                                isAssigned ? `${ag.bg} ring-1 ring-current` : "border-white/10 bg-white/[0.02] hover:border-white/20"
                            }`}>
                                <AgIcon className={`w-3.5 h-3.5 ${isAssigned ? ag.color : "text-white/30"}`}/>
                                <span className={`text-[11px] font-semibold ${isAssigned ? ag.color : "text-white/40"}`}>{ag.label}</span>
                                {isAssigned && <span className="ml-auto text-[9px] text-white/25">Current</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {alert.aiGenerated && alert.confidence && (
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                        <span className="text-white/30 flex items-center gap-1"><Brain className="w-3 h-3"/>AI Confidence</span>
                        <span className={`font-bold font-mono ${alert.confidence >= 85 ? "text-emerald-400" : "text-amber-400"}`}>{alert.confidence}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full ${alert.confidence >= 85 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${alert.confidence}%` }}/>
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-1">
                <Button className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-10 text-sm gap-1.5" disabled={!action}>
                    <CheckCircle2 className="w-4 h-4"/>Resolve Alert
                </Button>
                <Button variant="outline" className="border-white/15 text-white/40 hover:bg-white/5 h-10" onClick={onClose}>
                    Cancel
                </Button>
            </div>
            <p className="text-[10px] text-white/20 text-center">Resolution logged with operator name + timestamp to audit trail</p>
        </div>
    );
}

/* ─────────────────────────────────────────────
   ALERT CARD
───────────────────────────────────────────── */
function AlertCard({ alert, onAcknowledge, onResolve }: {
    alert: LiveAlert;
    onAcknowledge: (id: string) => void;
    onResolve:     (id: string) => void;
}) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const sev  = severityCfg[alert.severity];
    const cat  = categoryCfg[alert.category];
    const ag   = agencyCfg[alert.assignedTo];
    const st   = statusCfg[alert.status];
    const CatIcon = cat.icon;
    const AgIcon  = ag.icon;
    const isOpen  = alert.status === "open" || alert.status === "acknowledged";

    return (
        <div className={`rounded-xl border transition-all duration-200 shadow-lg ${sev.border} ${sev.bg} ${sev.glow} ${
            alert.status === "resolved" ? "opacity-55" : ""
        }`}>
            {/* Top strip */}
            <div className="flex items-center gap-2 px-4 pt-3.5 pb-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${sev.dot} ${
            alert.severity === "critical" || alert.severity === "high" ? "animate-pulse" : ""
        }`}/>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${sev.color}`}>{sev.label}</span>
                <span className="text-white/15">·</span>
                <div className={`flex items-center gap-1 text-[9px] ${cat.color}`}>
                    <CatIcon className="w-3 h-3"/>
                    <span className="uppercase tracking-wide">{cat.label}</span>
                </div>
                <div className="flex-1"/>
                <div className="flex items-center gap-1.5">
                    {alert.aiGenerated && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-[9px] text-cyan-400/60">
                                    <Brain className="w-3 h-3"/>AI
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-800 border-white/10 text-xs">AI-generated alert · confidence {alert.confidence}%</TooltipContent>
                        </Tooltip>
                    )}
                    <Badge variant="outline" className={`text-[9px] ${st.bg} ${st.color} border-current`}>{st.label}</Badge>
                </div>
            </div>

            {/* Body */}
            <div className="px-4 pt-2 pb-3">
                <div className="text-xs font-bold text-white/90 leading-snug mb-1">{alert.title}</div>
                <p className="text-[11px] text-white/45 leading-relaxed mb-2.5 line-clamp-2">{alert.description}</p>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[10px] text-white/35 mb-3 flex-wrap">
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{alert.location}</div>
                    {alert.vehicleId && <div className="flex items-center gap-1"><Bus className="w-3 h-3"/>{alert.vehicleId}</div>}
                    {alert.routeName && <div className="flex items-center gap-1"><Route className="w-3 h-3"/>{alert.routeName}</div>}
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3"/>{alert.age}</div>
                    {alert.tier && (
                        <div className={`flex items-center gap-1 ${enforcementCfg[alert.tier].color}`}>
                            <Shield className="w-3 h-3"/>
                            {enforcementCfg[alert.tier].label} tier
                        </div>
                    )}
                </div>

                {/* Action hint */}
                {isOpen && (
                    <div className="flex items-start gap-2 rounded-md border border-white/8 bg-white/[0.03] px-3 py-2 mb-3">
                        <Zap className="w-3 h-3 text-white/30 shrink-0 mt-0.5"/>
                        <span className="text-[11px] text-white/45 leading-snug">{alert.actionRequired}</span>
                    </div>
                )}

                {/* Resolution note */}
                {alert.resolution && (
                    <div className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 mb-3">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5"/>
                        <span className="text-[11px] text-emerald-300/70">{alert.resolution}</span>
                    </div>
                )}

                {/* Agency + actions */}
                <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 text-[10px] ${ag.color}`}>
                        <AgIcon className="w-3 h-3"/>
                        <span>{ag.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {alert.status === "open" && (
                            <Button size="sm" variant="outline"
                                    className="h-6 px-2.5 text-[10px] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                                    onClick={() => onAcknowledge(alert.id)}>
                                <Eye className="w-3 h-3 mr-1"/>Ack.
                            </Button>
                        )}
                        {isOpen && (
                            <Sheet open={sheetOpen} onOpenChange={o => { setSheetOpen(o); if (!o) onResolve(alert.id); }}>
                                <SheetTrigger asChild>
                                    <Button size="sm" className="h-6 px-2.5 text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white border-0"
                                            onClick={() => setSheetOpen(true)}>
                                        <CheckCircle2 className="w-3 h-3 mr-1"/>Resolve
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-[420px] bg-[#111316] border-l border-white/10 text-white">
                                    <SheetHeader>
                                        <SheetTitle className="text-white flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400"/>Resolve Alert
                                        </SheetTitle>
                                    </SheetHeader>
                                    <ResolveSheet alert={alert} onClose={() => setSheetOpen(false)}/>
                                </SheetContent>
                            </Sheet>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   SYSTEM TICKER (horizontal live feed)
───────────────────────────────────────────── */
function LiveTicker() {
    const items = [
        { color: "text-red-400",    text: "ALT-031 · Route 11 major deviation KBA 441Z · operational enforcement" },
        { color: "text-orange-400", text: "ALT-030 · Thika Rd 93% congestion · AI signal rec pending approval" },
        { color: "text-amber-400",  text: "ALT-029 · Route 11 compliance 61% · administrative notice required" },
        { color: "text-cyan-400",   text: "ALT-027 · Route 7 pre-trip queue · 4 drivers awaiting guidance push" },
        { color: "text-violet-400", text: "ALT-026 · Pangani roundabout · escalated to urban planning" },
        { color: "text-emerald-400",text: "ALT-024 · Route 56 · AI auto-resolved within policy" },
    ];
    return (
        <div className="relative overflow-hidden h-8 border-b border-white/8 bg-black/30 flex items-center">
            <div className="shrink-0 px-3 flex items-center gap-1.5 border-r border-white/10 h-full bg-[#0d0f12]">
                <Radio className="w-3 h-3 text-red-400 animate-pulse"/>
                <span className="text-[9px] font-bold tracking-widest text-red-400 uppercase">Live</span>
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="flex gap-12 animate-[ticker_28s_linear_infinite] whitespace-nowrap">
                    {[...items, ...items].map((item, i) => (
                        <span key={i} className={`text-[10px] font-mono ${item.color}`}>
              <span className="text-white/20 mr-2">◆</span>{item.text}
            </span>
                    ))}
                </div>
            </div>
            <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
        </div>
    );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function AlertsPage() {
    const [alerts, setAlerts]         = useState(LIVE_ALERTS);
    const [severityFilter, setSeverityFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [agencyFilter, setAgencyFilter]     = useState<string>("all");
    const [statusFilter, setStatusFilter]     = useState<string>("all");

    const open       = alerts.filter(a => a.status === "open").length;
    const critical   = alerts.filter(a => a.severity === "critical").length;
    const escalated  = alerts.filter(a => a.status === "escalated").length;
    const aiPending  = alerts.filter(a => a.aiGenerated && a.status === "open").length;

    const handleAck     = (id: string) => setAlerts(p => p.map(a => a.id === id ? { ...a, status: "acknowledged" as const } : a));
    const handleResolve = (id: string) => setAlerts(p => p.map(a => a.id === id ? { ...a, status: "resolved" as const } : a));

    const filtered = alerts.filter(a => {
        if (severityFilter !== "all" && a.severity !== severityFilter) return false;
        if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
        if (agencyFilter   !== "all" && a.assignedTo !== agencyFilter) return false;
        if (statusFilter   !== "all" && a.status !== statusFilter) return false;
        return true;
    });

    return (
        <TooltipProvider delayDuration={300}>
            <div className="min-h-screen bg-[#0d0f12] text-white" style={{ fontFamily: "'DM Mono','JetBrains Mono',monospace" }}>

                {/* Scanline */}
                <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
                     style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.3) 2px,rgba(255,255,255,0.3) 3px)" }}/>

                {/* ── TOPBAR ── */}
                <header className="relative z-10 h-14 border-b border-white/8 bg-[#0d0f12]/95 backdrop-blur-sm flex items-center px-5 gap-4">
                    <div className="flex items-center gap-2.5 shrink-0">
                        <div className="relative w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                            <Bell className="w-4 h-4 text-red-400"/>
                            {open > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-[#0d0f12] animate-pulse"/>}
                        </div>
                        <div>
                            <div className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase">Alert Center</div>
                            <div className="text-[9px] tracking-widest text-white/30 uppercase">TransitCtrl · Nairobi</div>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1"/>

                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/>
                        <span>LIVE</span>
                        <span className="text-white/20">·</span>
                        <Clock className="w-3 h-3"/>
                        <span>15:46</span>
                    </div>

                    {/* System KPIs */}
                    <div className="hidden lg:flex items-center gap-5 ml-2">
                        {[
                            { icon: CircleAlert,  v: open,      label: "Open",      c: open > 3 ? "text-red-400"    : "text-amber-400" },
                            { icon: Siren,        v: critical,  label: "Critical",  c: "text-red-400" },
                            { icon: TrendingUp,   v: escalated, label: "Escalated", c: "text-violet-400" },
                            { icon: Brain,        v: aiPending, label: "AI Pending",c: "text-cyan-400" },
                        ].map(k => (
                            <div key={k.label} className="flex items-center gap-1.5 text-[11px]">
                                <k.icon className={`w-3.5 h-3.5 ${k.c}`}/>
                                <span className={`font-mono font-bold ${k.c}`}>{k.v}</span>
                                <span className="text-white/28">{k.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1"/>

                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-white/40 hover:text-white hover:bg-white/5 text-[11px]">
                        <RefreshCw className="w-3.5 h-3.5"/>Refresh
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-2 text-white/50 hover:text-white hover:bg-white/5 text-[11px]">
                                <User className="w-3.5 h-3.5"/>Kamau N.<ChevronDown className="w-3 h-3"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 w-44">
                            <DropdownMenuLabel className="text-white/40 text-[10px]">Traffic Operator</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10"/>
                            <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 gap-2"><Settings className="w-3.5 h-3.5"/>Settings</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 gap-2"><History className="w-3.5 h-3.5"/>Audit Trail</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Live Ticker */}
                <LiveTicker/>

                {/* ── MAIN LAYOUT ── */}
                <main className="relative z-10 flex h-[calc(100vh-88px)]">

                    {/* LEFT — AGENCY QUEUES */}
                    <aside className="w-64 shrink-0 border-r border-white/8 flex flex-col">
                        <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                            <Inbox className="w-4 h-4 text-white/40"/>
                            <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase">Agency Queues</span>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-2">
                                {AGENCY_QUEUES.map(aq => {
                                    const AqIcon = aq.icon;
                                    return (
                                        <button key={aq.agency}
                                                onClick={() => setAgencyFilter(a => a === aq.agency ? "all" : aq.agency)}
                                                className={`w-full flex flex-col gap-2 p-3 rounded-xl border text-left transition-all hover:ring-1 hover:ring-white/15 ${
                                                    agencyFilter === aq.agency ? `${aq.bg} ring-2 ring-current/60` : "border-white/8 bg-white/[0.02]"
                                                }`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <AqIcon className={`w-4 h-4 ${aq.color}`}/>
                                                    <span className={`text-[11px] font-bold ${aq.color}`}>{aq.label}</span>
                                                </div>
                                                {aq.open > 0 && (
                                                    <span className="text-xs font-bold font-mono text-red-400">{aq.open}</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-center">
                                                {[
                                                    { label: "Open",     v: aq.open,      c: aq.open > 0 ? "text-red-400" : "text-white/30" },
                                                    { label: "Escalated",v: aq.escalated, c: aq.escalated > 0 ? "text-violet-400" : "text-white/30" },
                                                    { label: "Resolved", v: aq.resolved,  c: "text-emerald-400" },
                                                ].map(s => (
                                                    <div key={s.label} className="rounded-md border border-white/8 bg-white/[0.02] py-1">
                                                        <div className={`text-sm font-bold font-mono ${s.c}`}>{s.v}</div>
                                                        <div className="text-[8px] text-white/25">{s.label}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="text-[10px] text-white/30 flex items-center gap-1">
                                                <User className="w-3 h-3"/>{aq.operatorOnDuty}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Severity breakdown */}
                            <div className="px-3 pb-3 space-y-2">
                                <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold px-1">By Severity</div>
                                {(["critical","high","medium","low"] as Severity[]).map(s => {
                                    const sc = severityCfg[s];
                                    const count = alerts.filter(a => a.severity === s && a.status !== "resolved").length;
                                    return (
                                        <button key={s}
                                                onClick={() => setSeverityFilter(sv => sv === s ? "all" : s)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                                                    severityFilter === s ? `${sc.bg} ${sc.border}` : "border-white/6 bg-white/[0.02] hover:border-white/12"
                                                }`}>
                                            <span className={`w-2 h-2 rounded-full ${sc.dot} shrink-0`}/>
                                            <span className={`text-[11px] font-semibold flex-1 ${sc.color}`}>{sc.label}</span>
                                            <span className={`text-xs font-bold font-mono ${sc.color}`}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </aside>

                    {/* CENTER — ALERT FEED */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Filter bar */}
                        <div className="px-5 py-2.5 border-b border-white/8 flex items-center gap-2 flex-wrap bg-[#0d0f12]/80">
                            <Filter className="w-3.5 h-3.5 text-white/30"/>
                            {[
                                { label: "Category", value: categoryFilter, onChange: setCategoryFilter,
                                    options: [["all","All Categories"],["deviation","Deviation"],["congestion","Congestion"],["signal","Signal"],["compliance","Compliance"],["ai_rec","AI Rec."],["infrastructure","Infrastructure"]] },
                                { label: "Status", value: statusFilter, onChange: setStatusFilter,
                                    options: [["all","All Status"],["open","Open"],["acknowledged","Acknowledged"],["escalated","Escalated"],["resolved","Resolved"]] },
                            ].map(f => (
                                <Select key={f.label} value={f.value} onValueChange={f.onChange}>
                                    <SelectTrigger className="h-7 w-36 bg-white/5 border-white/10 text-white/50 text-[11px]">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10">
                                        {f.options.map(([v,l]) => (
                                            <SelectItem key={v} value={v} className="text-xs text-white/70 focus:bg-white/10">{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ))}

                            <div className="flex-1"/>

                            <span className="text-[10px] text-white/30">{filtered.length} alerts</span>
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-emerald-400 hover:bg-emerald-500/10 gap-1"
                                    onClick={() => setAlerts(p => p.map(a => a.status === "open" ? { ...a, status: "acknowledged" as const } : a))}>
                                <BadgeCheck className="w-3.5 h-3.5"/>Ack. All Open
                            </Button>
                        </div>

                        <Tabs defaultValue="feed" className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-5 pt-3 border-b border-white/8">
                                <TabsList className="bg-white/5 border border-white/10 h-8 p-0.5 gap-0.5">
                                    {[
                                        { v:"feed",    l:"Live Feed",   icon: Radio },
                                        { v:"table",   l:"Table View",  icon: ListChecks },
                                        { v:"audit",   l:"Audit Trail", icon: History },
                                        { v:"reports", l:"Reports",     icon: BarChart3 },
                                    ].map(t => (
                                        <TabsTrigger key={t.v} value={t.v}
                                                     className="h-7 px-3 text-[11px] data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40 rounded flex items-center gap-1.5">
                                            <t.icon className="w-3 h-3"/>{t.l}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            {/* FEED */}
                            <TabsContent value="feed" className="flex-1 overflow-hidden mt-0">
                                <ScrollArea className="h-full">
                                    <div className="p-5 space-y-3">
                                        {filtered.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-3">
                                                <Inbox className="w-10 h-10"/>
                                                <span className="text-sm">No alerts match current filters</span>
                                            </div>
                                        )}
                                        {filtered.map(alert => (
                                            <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAck} onResolve={handleResolve}/>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            {/* TABLE VIEW */}
                            <TabsContent value="table" className="flex-1 overflow-auto px-5 pb-5 pt-4 mt-0">
                                <div className="rounded-xl border border-white/10 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                {["ID","Severity","Category","Title","Location","Route","Age","Agency","Status",""].map(h => (
                                                    <TableHead key={h} className="text-[10px] tracking-widest text-white/25 uppercase bg-white/[0.03] font-semibold h-9 whitespace-nowrap">{h}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filtered.map(alert => {
                                                const sev = severityCfg[alert.severity];
                                                const cat = categoryCfg[alert.category];
                                                const ag  = agencyCfg[alert.assignedTo];
                                                const st  = statusCfg[alert.status];
                                                const CatIcon = cat.icon;
                                                const AgIcon  = ag.icon;
                                                return (
                                                    <TableRow key={alert.id} className="border-white/6 hover:bg-white/[0.03]">
                                                        <TableCell className="text-[10px] font-mono text-white/30 py-3">{alert.id}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`}/>
                                                                <span className={`text-[10px] font-bold ${sev.color}`}>{sev.label}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className={`flex items-center gap-1 text-[10px] ${cat.color}`}>
                                                                <CatIcon className="w-3 h-3"/>{cat.label}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-white/65 max-w-[160px]">
                                                            <span className="line-clamp-1">{alert.title}</span>
                                                        </TableCell>
                                                        <TableCell className="text-[10px] text-white/40 max-w-[100px] truncate">{alert.location}</TableCell>
                                                        <TableCell className="text-[10px] font-mono text-white/40">{alert.routeId ?? "—"}</TableCell>
                                                        <TableCell className="text-[10px] text-white/35 whitespace-nowrap">{alert.age}</TableCell>
                                                        <TableCell>
                                                            <div className={`flex items-center gap-1 text-[10px] ${ag.color}`}>
                                                                <AgIcon className="w-3 h-3"/>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[9px] capitalize ${st.bg} ${st.color} border-current`}>{st.label}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {(alert.status === "open" || alert.status === "acknowledged") && (
                                                                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-cyan-400 hover:bg-cyan-500/10"
                                                                        onClick={() => handleAck(alert.id)}>
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
                            </TabsContent>

                            {/* AUDIT TRAIL */}
                            <TabsContent value="audit" className="flex-1 overflow-auto px-5 pb-5 pt-4 mt-0">
                                <div className="rounded-xl border border-white/10 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                {["Log ID","Time","Operator","Alert Ref","Action","Type"].map(h => (
                                                    <TableHead key={h} className="text-[10px] tracking-widest text-white/25 uppercase bg-white/[0.03] font-semibold h-9">{h}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {AUDIT_TRAIL.map(log => {
                                                const typeConfig = {
                                                    acknowledged: { color: "text-cyan-400",    border: "border-cyan-500/40" },
                                                    escalated:    { color: "text-violet-400",  border: "border-violet-500/40" },
                                                    auto:         { color: "text-white/40",    border: "border-white/20" },
                                                    overridden:   { color: "text-amber-400",   border: "border-amber-500/40" },
                                                    resolved:     { color: "text-emerald-400", border: "border-emerald-500/40" },
                                                }[log.type];
                                                return (
                                                    <TableRow key={log.id} className="border-white/6 hover:bg-white/[0.03]">
                                                        <TableCell className="text-[10px] font-mono text-white/25 py-3">{log.id}</TableCell>
                                                        <TableCell className="text-xs font-mono text-white/50">{log.time}</TableCell>
                                                        <TableCell className="text-xs text-white/60">{log.operator}</TableCell>
                                                        <TableCell className="text-[10px] font-mono text-cyan-400/60">{log.alert}</TableCell>
                                                        <TableCell className="text-xs text-white/50 max-w-[200px]"><span className="line-clamp-1">{log.action}</span></TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[9px] capitalize ${typeConfig.color} ${typeConfig.border}`}>{log.type}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                <p className="text-[10px] text-white/18 mt-3 text-center">All operator actions and AI auto-executions logged · immutable audit record</p>
                            </TabsContent>

                            {/* REPORTS */}
                            <TabsContent value="reports" className="flex-1 overflow-auto mt-0">
                                <ScrollArea className="h-full">
                                    <ReportsTab alerts={alerts}/>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* RIGHT — SUMMARY PANEL */}
                    <aside className="w-72 shrink-0 border-l border-white/8 flex flex-col">
                        <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-white/40"/>
                            <span className="text-[11px] font-bold tracking-widest text-white/60 uppercase">Summary</span>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4 space-y-4">
                                {/* Alert health */}
                                <Card className="bg-white/[0.02] border-white/10">
                                    <CardHeader className="pb-2 pt-3 px-4">
                                        <CardTitle className="text-[10px] text-white/40 font-semibold tracking-widest uppercase">Network Alert Health</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 space-y-2.5">
                                        {[
                                            { label: "Open alerts",  v: open,         c: open > 3 ? "text-red-400" : "text-amber-400",    bar: (open/9)*100,  barC: "bg-red-500" },
                                            { label: "Acknowledged", v: alerts.filter(a=>a.status==="acknowledged").length, c: "text-cyan-400", bar: (alerts.filter(a=>a.status==="acknowledged").length/9)*100, barC: "bg-cyan-500" },
                                            { label: "Resolved",     v: alerts.filter(a=>a.status==="resolved").length,     c: "text-emerald-400", bar: (alerts.filter(a=>a.status==="resolved").length/9)*100, barC: "bg-emerald-500" },
                                        ].map(s => (
                                            <div key={s.label} className="space-y-1">
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-white/45">{s.label}</span>
                                                    <span className={`font-mono font-bold ${s.c}`}>{s.v}</span>
                                                </div>
                                                <Progress value={s.bar} className="h-1 bg-white/8"/>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                {/* Category breakdown */}
                                <Card className="bg-white/[0.02] border-white/10">
                                    <CardHeader className="pb-2 pt-3 px-4">
                                        <CardTitle className="text-[10px] text-white/40 font-semibold tracking-widest uppercase">By Category</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 space-y-1.5">
                                        {(Object.keys(categoryCfg) as AlertCategory[]).map(cat => {
                                            const cc = categoryCfg[cat];
                                            const count = alerts.filter(a => a.category === cat && a.status !== "resolved").length;
                                            if (count === 0) return null;
                                            const CIcon = cc.icon;
                                            return (
                                                <div key={cat} className="flex items-center gap-2 py-1">
                                                    <CIcon className={`w-3.5 h-3.5 ${cc.color} shrink-0`}/>
                                                    <span className="text-[11px] text-white/50 flex-1">{cc.label}</span>
                                                    <span className={`text-xs font-bold font-mono ${cc.color}`}>{count}</span>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>

                                {/* AI performance */}
                                <Card className="bg-white/[0.02] border-white/10">
                                    <CardHeader className="pb-2 pt-3 px-4">
                                        <CardTitle className="text-[10px] text-white/40 font-semibold tracking-widest uppercase flex items-center gap-1.5">
                                            <Brain className="w-3 h-3 text-cyan-400"/>AI Alert Engine
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4 space-y-2">
                                        {[
                                            { label: "Alerts AI-generated",    v: 78 },
                                            { label: "False positive rate",    v: 4,  invert: true },
                                            { label: "Avg detection latency",  v: "2.1s", noBar: true },
                                            { label: "Confidence avg (open)",  v: 88 },
                                        ].map(m => (
                                            <div key={m.label} className="space-y-0.5">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-white/35">{m.label}</span>
                                                    <span className="text-white/60 font-mono font-bold">{typeof m.v === "number" ? `${m.v}%` : m.v}</span>
                                                </div>
                                                {!m.noBar && typeof m.v === "number" && (
                                                    <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                                                        <div className={`h-full rounded-full ${"invert" in m && m.invert ? "bg-emerald-500" : "bg-cyan-500/50"}`}
                                                             style={{ width: `${"invert" in m && m.invert ? 100 - m.v : m.v}%` }}/>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
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