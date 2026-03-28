"use client";

import { useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronRight,
    Star,
    Flame,
    Shield,
    ShieldCheck,
    Camera,
    MapPin,
    Zap,
    Car,
    Trophy,
    Bell,
    Settings,
    History,
    User,
    TriangleAlert,
    Construction,
    Merge,
    Bike,
    Eye,
    Info,
    BadgeCheck,
    Gauge,
    TrendingUp,
    TrendingDown,
    Minus,
    Wallet,
    ScanLine,

    ParkingSquare,
    Navigation,
    Upload,
    Brain,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type ReportStatus = "submitted" | "verifying" | "verified" | "rejected" | "flagged";
type TrustLevel = "new" | "trusted" | "verified" | "elite";
type BehaviorTrend = "up" | "down" | "flat";

interface TrafficReport {
    id: string;
    category: string;
    categoryIcon: React.ElementType;
    location: string;
    time: string;
    status: ReportStatus;
    rewardKES: number | null;
    aiNote: string;
    hasMedia: boolean;
}

interface BehaviorMetric {
    label: string;
    score: number;
    trend: BehaviorTrend;
    weight: string;
    detail: string;
}

interface RewardEntry {
    id: string;
    date: string;
    source: string;
    amount: string;
    type: "earned" | "redeemed";
    location?: string;
}

/* ─────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────── */
const REPORTS: TrafficReport[] = [
    { id: "RPT-0041", category: "Illegal Parking",    categoryIcon: ParkingSquare, location: "Haile Selassie Ave, CBD", time: "Today 14:22", status: "verified",   rewardKES: 8,    aiNote: "Verified via CCTV feed — duplicate blocked", hasMedia: true  },
    { id: "RPT-0040", category: "Signal Violation",   categoryIcon: TriangleAlert, location: "Uhuru Hwy / Haile Sel.", time: "Today 13:05", status: "verifying",  rewardKES: null, aiNote: "Corroborating with traffic camera sensors",  hasMedia: false },
    { id: "RPT-0039", category: "Road Obstruction",   categoryIcon: Construction,  location: "Ngong Rd, Hurlingham",   time: "Yesterday",   status: "verified",   rewardKES: 10,   aiNote: "3 corroborating reports — high confidence",  hasMedia: true  },
    { id: "RPT-0038", category: "Wrong Lane Merge",   categoryIcon: Merge,         location: "Thika Rd, Pangani",      time: "Yesterday",   status: "rejected",   rewardKES: 0,    aiNote: "Location data inconsistent with sensor grid", hasMedia: false },
    { id: "RPT-0037", category: "Dangerous Driving",  categoryIcon: Car,           location: "Mombasa Rd near JKIA",   time: "Mon 09:40",   status: "flagged",    rewardKES: null, aiNote: "Under additional review — trust threshold",  hasMedia: true  },
    { id: "RPT-0036", category: "Cyclist Near-Miss",  categoryIcon: Bike,          location: "Riverside Dr",           time: "Sun 17:15",   status: "verified",   rewardKES: 6,    aiNote: "Verified — dashcam corroboration match",     hasMedia: true  },
];

const BEHAVIOR_METRICS: BehaviorMetric[] = [
    { label: "Speed Compliance",  score: 91, trend: "up",   weight: "35%", detail: "3 trips this week within limit" },
    { label: "Signal Adherence",  score: 88, trend: "up",   weight: "25%", detail: "No signal violations detected" },
    { label: "Lane Discipline",   score: 79, trend: "flat", weight: "20%", detail: "Minor merge event Tue 08:30" },
    { label: "Safe Following",    score: 73, trend: "down", weight: "15%", detail: "Tailgating event flagged Fri" },
    { label: "Report Accuracy",   score: 82, trend: "up",   weight: "5%",  detail: "11/13 reports verified" },
];

const REWARD_HISTORY: RewardEntry[] = [
    { id: "RW-024", date: "Today",     source: "Illegal Parking report",    amount: "+KES 8",    type: "earned" },
    { id: "RW-023", date: "Yesterday", source: "Safe driving — 7 day streak", amount: "+KES 15", type: "earned" },
    { id: "RW-022", date: "Yesterday", source: "Road Obstruction report",   amount: "+KES 10",   type: "earned" },
    { id: "RW-021", date: "Mon",       source: "Parking — Westlands Mall",  amount: "-KES 40",   type: "redeemed", location: "Westlands" },
    { id: "RW-020", date: "Sun",       source: "Cyclist Near-Miss report",  amount: "+KES 6",    type: "earned" },
    { id: "RW-019", date: "Sat",       source: "Weekly driving bonus",      amount: "+KES 20",   type: "earned" },
];

const REPORT_CATEGORIES = [
    { id: "illegal_parking",    label: "Illegal Parking",    icon: ParkingSquare, color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30" },
    { id: "signal_violation",   label: "Signal Violation",   icon: TriangleAlert, color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30" },
    { id: "road_obstruction",   label: "Road Obstruction",   icon: Construction,  color: "text-orange-400",  bg: "bg-orange-500/15 border-orange-500/30" },
    { id: "dangerous_driving",  label: "Dangerous Driving",  icon: Car,           color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30" },
    { id: "wrong_lane",         label: "Wrong Lane",         icon: Merge,         color: "text-yellow-400",  bg: "bg-yellow-500/15 border-yellow-500/30" },
    { id: "cyclist_hazard",     label: "Cyclist Hazard",     icon: Bike,          color: "text-cyan-400",    bg: "bg-cyan-500/15 border-cyan-500/30" },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const statusConfig: Record<ReportStatus, { label: string; color: string; bg: string; icon: React.ElementType; dot: string }> = {
    submitted: { label: "Submitted",  color: "text-white/50",    bg: "bg-white/5 border-white/15",         icon: Clock,          dot: "bg-white/40" },
    verifying: { label: "Verifying",  color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30",  icon: Brain,          dot: "bg-cyan-400" },
    verified:  { label: "Verified",   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2, dot: "bg-emerald-400" },
    rejected:  { label: "Rejected",   color: "text-red-400",     bg: "bg-red-500/10 border-red-500/25",    icon: XCircle,        dot: "bg-red-400" },
    flagged:   { label: "Flagged",    color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25",icon: AlertTriangle,  dot: "bg-amber-400" },
};

const trustConfig: Record<TrustLevel, { label: string; color: string; bg: string; icon: React.ElementType; stars: number }> = {
    new:      { label: "New User",     color: "text-white/50",    bg: "bg-white/10",       icon: User,         stars: 1 },
    trusted:  { label: "Trusted",      color: "text-amber-400",   bg: "bg-amber-500/15",   icon: Shield,       stars: 2 },
    verified: { label: "Verified",     color: "text-cyan-400",    bg: "bg-cyan-500/15",    icon: ShieldCheck,  stars: 3 },
    elite:    { label: "Elite Driver", color: "text-emerald-400", bg: "bg-emerald-500/15", icon: BadgeCheck,   stars: 4 },
};

const trendIcon = (t: BehaviorTrend) =>
    t === "up" ? TrendingUp : t === "down" ? TrendingDown : Minus;
const trendColor = (t: BehaviorTrend) =>
    t === "up" ? "text-emerald-400" : t === "down" ? "text-red-400" : "text-white/40";

/* ─────────────────────────────────────────────
   DRIVING SCORE ARC (SVG)
───────────────────────────────────────────── */
function ScoreArc({ score }: { score: number }) {
    const R = 80;
    const cx = 110;
    const cy = 110;
    const startAngle = -210;
    const sweepTotal = 240;
    const sweepAngle = (score / 100) * sweepTotal;

    const toRad = (d: number) => (d * Math.PI) / 180;
    const arcPath = (start: number, sweep: number, r: number) => {
        const s = toRad(start);
        const e = toRad(start + sweep);
        const x1 = cx + r * Math.cos(s);
        const y1 = cy + r * Math.sin(s);
        const x2 = cx + r * Math.cos(e);
        const y2 = cy + r * Math.sin(e);
        const large = sweep > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    };

    const scoreColor =
        score >= 85 ? "#34d399" : score >= 65 ? "#fbbf24" : "#f87171";
    const scoreGlow =
        score >= 85 ? "rgba(52,211,153,0.3)" : score >= 65 ? "rgba(251,191,36,0.3)" : "rgba(248,113,113,0.3)";

    return (
        <svg viewBox="0 0 220 165" className="w-full max-w-55">
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Track */}
            <path d={arcPath(startAngle, sweepTotal, R)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
            {/* Fill */}
            {sweepAngle > 0 && (
                <path d={arcPath(startAngle, sweepAngle, R)} fill="none" stroke={scoreColor}
                      strokeWidth="12" strokeLinecap="round" filter="url(#glow)" />
            )}
            {/* Score text */}
            <text x={cx} y={cy - 2} textAnchor="middle" fill="white"
                  fontSize="36" fontWeight="bold" fontFamily="'DM Mono', monospace" letterSpacing="-1">{score}</text>
            <text x={cx} y={cy + 18} textAnchor="middle" fill="rgba(255,255,255,0.35)"
                  fontSize="10" fontFamily="monospace" letterSpacing="3" textDecoration="none">DRIVE SCORE</text>
            {/* Tick labels */}
            {[
                { angle: startAngle, label: "0" },
                { angle: startAngle + sweepTotal, label: "100" },
            ].map((t) => {
                const rad = toRad(t.angle);
                const tx = cx + (R + 18) * Math.cos(rad);
                const ty = cy + (R + 18) * Math.sin(rad);
                return <text key={t.label} x={tx} y={ty} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="9" fontFamily="monospace">{t.label}</text>;
            })}
        </svg>
    );
}

/* ─────────────────────────────────────────────
   REPORT SHEET
───────────────────────────────────────────── */
function ReportSheet({ onSubmit }: { onSubmit: () => void }) {
    const [step, setStep] = useState<"category" | "details" | "submitted">("category");
    const [selected, setSelected] = useState<string | null>(null);
    const [severity, setSeverity] = useState([2]);
    const [note, setNote] = useState("");
    const loc = "Haile Selassie Ave, CBD — Nairobi";

    const severityLabel = ["Low", "Moderate", "High", "Severe", "Critical"][severity[0] - 1];
    const severityColor = ["text-emerald-400", "text-yellow-400", "text-amber-400", "text-orange-400", "text-red-400"][severity[0] - 1];

    if (step === "submitted") {
        return (
            <div className="flex flex-col items-center justify-center gap-6 pt-10 pb-6 px-4">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <ScanLine className="w-8 h-8 text-cyan-400 animate-pulse" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-400 border-2 border-[#111316] flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-[#111316]" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <div className="text-lg font-bold text-white">Report Submitted</div>
                    <div className="text-sm text-white/50 leading-relaxed max-w-xs">
                        Your report is now in the AI verification queue. You'll be notified once it's reviewed.
                    </div>
                </div>
                {/* Verification pipeline */}
                <div className="w-full rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
                    <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Verification Pipeline</div>
                    {[
                        { step: "Submitted",        done: true,  active: false },
                        { step: "AI Classification",done: false, active: true  },
                        { step: "Sensor Corroboration", done: false, active: false },
                        { step: "Decision & Reward",done: false, active: false },
                    ].map((s, i) => (
                        <div key={s.step} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                s.done ? "bg-emerald-500 border-emerald-500" :
                                    s.active ? "border-cyan-400 bg-cyan-400/10 animate-pulse" :
                                        "border-white/15 bg-white/5"
                            }`}>
                                {s.done ? <CheckCircle2 className="w-3 h-3 text-white" /> :
                                    s.active ? <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> :
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                            </div>
                            <span className={`text-xs ${s.done ? "text-emerald-400" : s.active ? "text-cyan-400" : "text-white/30"}`}>{s.step}</span>
                            {i < 3 && <div className="flex-1 h-px bg-white/8" />}
                        </div>
                    ))}
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-4 py-3 w-full">
                    <p className="text-[11px] text-amber-300/80 text-center">
                        Rewards are issued <strong>only after successful verification</strong> — not at submission.
                    </p>
                </div>
                <Button className="w-full bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 text-sm" onClick={() => setStep("category")}>
                    Close
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-5 pt-2 px-1">
            {/* Steps indicator */}
            <div className="flex items-center gap-2 justify-center">
                {["category", "details"].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full border text-[10px] font-bold flex items-center justify-center transition-all ${
                            step === s ? "border-cyan-400 bg-cyan-400/10 text-cyan-400" :
                                (step === "details" && s === "category") ? "border-emerald-500 bg-emerald-500 text-white" :
                                    "border-white/15 text-white/30"
                        }`}>
                            {step === "details" && s === "category" ? <Check className="w-3 h-3" /> : i + 1}
                        </div>
                        {i === 0 && <div className="w-8 h-px bg-white/15" />}
                    </div>
                ))}
            </div>

            {step === "category" && (
                <>
                    <div>
                        <div className="text-sm font-bold text-white mb-1">What are you reporting?</div>
                        <div className="text-[11px] text-white/40">Select the issue type — location is captured automatically.</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {REPORT_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = selected === cat.id;
                            return (
                                <button key={cat.id} onClick={() => setSelected(cat.id)}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150 text-center ${
                                            isSelected ? `ring-2 ring-cyan-400/60 ${cat.bg}` : "border-white/10 bg-white/2 hover:border-white/20"
                                        }`}>
                                    <Icon className={`w-6 h-6 ${isSelected ? cat.color : "text-white/40"}`} />
                                    <span className={`text-[11px] font-semibold leading-tight ${isSelected ? "text-white/90" : "text-white/50"}`}>{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Auto location */}
                    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-white/30 uppercase tracking-wide">Auto-detected location</div>
                            <div className="text-xs text-white/60 truncate">{loc}</div>
                        </div>
                        <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400 shrink-0">GPS</Badge>
                    </div>
                    <Button className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold h-11 text-sm" disabled={!selected} onClick={() => setStep("details")}>
                        Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </>
            )}

            {step === "details" && (
                <>
                    <div>
                        <div className="text-sm font-bold text-white mb-1">Add Details <span className="text-white/30 font-normal text-xs">(optional)</span></div>
                        <div className="text-[11px] text-white/40">More detail helps verify faster — but is never required.</div>
                    </div>

                    {/* Severity slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-white/60">Severity</label>
                            <span className={`text-xs font-bold font-mono ${severityColor}`}>{severityLabel}</span>
                        </div>
                        <Slider value={severity} onValueChange={setSeverity} min={1} max={5} step={1} className="w-full" />
                        <div className="flex justify-between text-[9px] text-white/20">
                            <span>Low</span><span>Moderate</span><span>High</span><span>Severe</span><span>Critical</span>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/60">Note <span className="text-white/25 font-normal">(optional)</span></label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Brief description, e.g. 'truck blocking left lane'..."
                            rows={2}
                            className="w-full rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 placeholder:text-white/20 px-3 py-2 resize-none focus:outline-none focus:border-cyan-500/40"
                            maxLength={120}
                        />
                        <div className="text-[10px] text-white/20 text-right">{note.length}/120</div>
                    </div>

                    {/* Media upload */}
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/2 px-3 py-3 cursor-pointer hover:border-white/25 transition-colors">
                        <Upload className="w-4 h-4 text-white/30 shrink-0" />
                        <span className="text-xs text-white/30">Attach photo/video <span className="text-white/20">(optional — boosts AI confidence)</span></span>
                    </div>

                    {/* Safety reminder */}
                    <div className="flex gap-2 items-start rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
                        <Car className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-300/70">Only submit while safely parked. Never interact with this app while driving.</p>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 border-white/15 text-white/40 hover:bg-white/5 h-11 text-sm" onClick={() => setStep("category")}>
                            Back
                        </Button>
                        <Button className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-bold h-11 text-sm" onClick={() => { onSubmit(); setStep("submitted"); }}>
                            Submit Report
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

// Alias for check icon inside sheet
const Check = CheckCircle2;

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   MAIN PAGE — Fully Responsive
   mobile  < 640px  : 430px shell, status bar, bottom nav
   tablet  640-1023px: full-width, bottom nav, 2-col grids
   desktop 1024px+  : sidebar nav, multi-col, no status bar
   xl      1280px+  : max-w-7xl, richer layouts
───────────────────────────────────────────── */
export default function TrafficIncentivePage() {
    const [reportSheetOpen, setReportSheetOpen] = useState(false);
    const [discountToApply, setDiscountToApply] = useState([25]);
    const [reportFilter, setReportFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("home");

    const driveScore    = 84;
    const trustLevel: TrustLevel = "verified";
    const streak        = 7;
    const walletBalance = 59;
    const nextRewardAt  = 80;
    const progress      = (walletBalance / nextRewardAt) * 100;

    const trust    = trustConfig[trustLevel];
    const TrustIcon = trust.icon;

    const filteredReports = reportFilter === "all"
        ? REPORTS
        : REPORTS.filter((r) => r.status === reportFilter);

    const NAV_TABS = [
        { value: "home",     label: "Home",    icon: Car    },
        { value: "reports",  label: "Reports", icon: Eye    },
        { value: "rewards",  label: "Rewards", icon: Wallet },
        { value: "behavior", label: "Drive",   icon: Gauge  },
    ];

    return (
        <TooltipProvider delayDuration={300}>
            <div className="min-h-screen bg-[#0d0f12]"
                 style={{ fontFamily: "'DM Mono','JetBrains Mono',monospace" }}>

                {/* Scanline */}
                <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
                     style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.3) 2px,rgba(255,255,255,0.3) 3px)" }} />

                {/*
                  OUTER SHELL
                  mobile : 430px centered, phone borders
                  sm+    : full-width, no phone border
                  lg+    : side-by-side row, full viewport height
                */}
                <div className="relative z-10 flex flex-col
                                mx-auto w-full max-w-[430px] min-h-screen border-x border-white/8 shadow-2xl bg-[#0d0f12]
                                sm:max-w-none sm:border-x-0 sm:shadow-none
                                lg:flex-row lg:h-screen lg:overflow-hidden">

                    {/* ═══════════════════════════════════
                        DESKTOP SIDEBAR  (lg+ only)
                    ═══════════════════════════════════ */}
                    <aside className="hidden lg:flex lg:flex-col lg:w-60 xl:w-64 shrink-0 border-r border-white/8">

                        {/* Brand */}
                        <div className="px-5 py-5 border-b border-white/8 flex items-center gap-3">
                            <div className="relative w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <Car className="w-4 h-4 text-emerald-400" />
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d0f12] animate-pulse" />
                            </div>
                            <div>
                                <div className="text-xs font-bold tracking-[0.15em] text-white/90 uppercase">DriveGood</div>
                                <div className="text-[9px] text-white/30 tracking-widest uppercase">Nairobi Smart Mobility</div>
                            </div>
                        </div>

                        {/* User */}
                        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-white/50" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-white/80 truncate">Mwangi D.</div>
                                <div className={`flex items-center gap-1 text-[10px] ${trust.color}`}>
                                    <TrustIcon className="w-2.5 h-2.5" /><span>{trust.label}</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="relative h-7 w-7 text-white/30 hover:text-white hover:bg-white/5 shrink-0">
                                <Bell className="w-3.5 h-3.5" />
                                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 border border-[#0d0f12]" />
                            </Button>
                        </div>

                        {/* Wallet snapshot */}
                        <div className="px-5 py-4 border-b border-white/8">
                            <div className="flex items-center gap-2 mb-1">
                                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] text-white/40 uppercase tracking-wide">Balance</span>
                            </div>
                            <div className="text-2xl font-bold font-mono text-emerald-400 mb-2">KES {walletBalance}</div>
                            <Progress value={progress} className="h-1 bg-white/10" />
                            <div className="text-[9px] text-white/25 mt-1">KES {nextRewardAt - walletBalance} to next tier</div>
                        </div>

                        {/* Nav items */}
                        <nav className="flex-1 px-3 py-4 space-y-1">
                            {NAV_TABS.map((tab) => {
                                const Icon     = tab.icon;
                                const isActive = activeTab === tab.value;
                                return (
                                    <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                                                isActive
                                                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                                    : "text-white/40 hover:bg-white/5 hover:text-white/70 border border-transparent"
                                            }`}>
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span className="text-xs font-semibold tracking-wide uppercase">{tab.label}</span>
                                        {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-cyan-400" />}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Footer links */}
                        <div className="px-3 py-4 border-t border-white/8 space-y-1">
                            {[{ icon: Gauge, label: "Driving Profile" }, { icon: History, label: "Trip History" }, { icon: Settings, label: "Settings" }].map((item) => (
                                <button key={item.label} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/35 hover:bg-white/5 hover:text-white/60 transition-all">
                                    <item.icon className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* ═══════════════════════════════════
                        MAIN CONTENT COLUMN
                    ═══════════════════════════════════ */}
                    <div className="flex-1 flex flex-col min-w-0 lg:overflow-hidden">

                        {/* Status bar — mobile only */}
                        <div className="h-10 px-4 flex items-center justify-between border-b border-white/6 sm:hidden">
                            <div className="text-[10px] font-mono text-white/30">15:52</div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-white/30" />
                                <div className="w-1 h-1 rounded-full bg-white/30" />
                                <div className="w-1 h-1 rounded-full bg-white/30" />
                                <div className="ml-1 text-[10px] font-mono text-white/30">●●●●</div>
                            </div>
                        </div>

                        {/* Mobile / tablet header (hidden lg+) */}
                        <header className="px-4 py-3 flex items-center justify-between border-b border-white/8 lg:hidden">
                            <div className="flex items-center gap-2.5">
                                <div className="relative w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                    <Car className="w-4 h-4 text-emerald-400" />
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d0f12] animate-pulse" />
                                </div>
                                <div>
                                    <div className="text-[11px] font-bold tracking-[0.15em] text-white/90 uppercase">DriveGood</div>
                                    <div className="text-[9px] text-white/30 tracking-widest uppercase">Nairobi Smart Mobility</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${trust.bg}`}>
                                            <TrustIcon className={`w-3 h-3 ${trust.color}`} />
                                            <span className={`text-[10px] font-bold ${trust.color}`}>{trust.label}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-zinc-800 border-white/10 text-xs max-w-48">
                                        Your trust level affects AI verification priority and reward eligibility.
                                    </TooltipContent>
                                </Tooltip>
                                <Button variant="ghost" size="icon" className="relative h-8 w-8 text-white/40 hover:text-white hover:bg-white/5">
                                    <Bell className="w-4 h-4" />
                                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 border border-[#0d0f12]" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5">
                                            <User className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 w-44">
                                        <DropdownMenuLabel className="text-white/40 text-[10px]">Mwangi D.</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-white/10" />
                                        <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 focus:text-white gap-2"><Gauge className="w-3.5 h-3.5" /> Driving Profile</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 focus:text-white gap-2"><History className="w-3.5 h-3.5" /> Trip History</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs text-white/60 focus:bg-white/5 focus:text-white gap-2"><Settings className="w-3.5 h-3.5" /> Settings</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </header>

                        {/* Desktop topbar (lg+ only) */}
                        <header className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#0d0f12]/95 backdrop-blur-sm shrink-0">
                            <div>
                                <h1 className="text-sm font-bold text-white capitalize">
                                    {NAV_TABS.find(t => t.value === activeTab)?.label ?? "Home"}
                                </h1>
                                <p className="text-[10px] text-white/35 mt-0.5">DriveGood · Nairobi Smart Mobility</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-xs text-amber-400 font-bold">{streak} day streak</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs text-white/60">Score <span className="text-emerald-400 font-bold">{driveScore}</span></span>
                                </div>
                                <Sheet open={reportSheetOpen} onOpenChange={setReportSheetOpen}>
                                    <SheetTrigger asChild>
                                        <Button className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs h-8 gap-1.5 px-3">
                                            <Navigation className="w-3.5 h-3.5" />Report Issue
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="bg-[#111316] border-l border-white/10 text-white w-[420px] max-w-full overflow-auto">
                                        <SheetHeader className="pb-3">
                                            <SheetTitle className="text-white flex items-center gap-2">
                                                <Navigation className="w-4 h-4 text-cyan-400" />Report Traffic Issue
                                            </SheetTitle>
                                        </SheetHeader>
                                        <ReportSheet onSubmit={() => {}} />
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </header>

                        {/* ─── TABS ─── */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">

                            {/* Scrollable content */}
                            <div className="flex-1 min-h-0 overflow-auto">

                                {/* ══ HOME TAB ══ */}
                                <TabsContent value="home" className="mt-0 space-y-0">

                                    {/* Score hero
                                        mobile : centered arc
                                        md+    : arc left, wallet right
                                    */}
                                    <div className="px-4 sm:px-6 pt-5 pb-3 relative overflow-hidden">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
                                        <div className="flex flex-col md:flex-row md:items-center md:gap-8 lg:gap-12">
                                            {/* Arc */}
                                            <div className="flex flex-col items-center md:shrink-0">
                                                <ScoreArc score={driveScore} />
                                                <div className="flex items-center gap-4 -mt-2 mb-3">
                                                    <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                                                        <TrendingUp className="w-3.5 h-3.5" /><span>+3 pts this week</span>
                                                    </div>
                                                    <div className="h-3 w-px bg-white/15" />
                                                    <div className="flex items-center gap-1 text-[11px] text-amber-400">
                                                        <Flame className="w-3.5 h-3.5" /><span>{streak} day streak</span>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 mb-4">
                                                    <Star className="w-2.5 h-2.5 mr-1" />Good Standing — Reward eligible
                                                </Badge>
                                            </div>
                                            {/* Wallet inline on md+ */}
                                            <div className="flex-1 md:max-w-md">
                                                <Card className="bg-white/3 border-white/10">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <Wallet className="w-4 h-4 text-emerald-400" />
                                                                <span className="text-[11px] text-white/50 uppercase tracking-wide">Discount Balance</span>
                                                            </div>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-white/25 cursor-help" /></TooltipTrigger>
                                                                <TooltipContent className="bg-zinc-800 border-white/10 text-xs max-w-52">
                                                                    Earned through verified reports and safe driving. Apply at participating parking zones.
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                        <div className="flex items-end gap-2 mb-3">
                                                            <span className="text-3xl font-bold font-mono text-emerald-400">KES {walletBalance}</span>
                                                            <span className="text-sm text-white/30 mb-0.5">available</span>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between text-[10px]">
                                                                <span className="text-white/35">Progress to next reward tier</span>
                                                                <span className="text-white/55 font-mono">KES {walletBalance} / {nextRewardAt}</span>
                                                            </div>
                                                            <Progress value={progress} className="h-1.5 bg-white/10" />
                                                            <div className="text-[10px] text-white/25">KES {nextRewardAt - walletBalance} more to unlock 15% parking discount</div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick stats: 2-col mobile → 4-col lg+ */}
                                    <div className="px-4 sm:px-6 mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {[
                                            { label: "Reports this month", value: "13",           sub: "11 verified",  icon: Eye,      color: "text-cyan-400"    },
                                            { label: "Total earned",       value: "KES 184",       sub: "since joining", icon: Trophy,  color: "text-amber-400"   },
                                            { label: "Drive score",        value: String(driveScore), sub: "Good standing",icon: Gauge,  color: "text-emerald-400" },
                                            { label: "Streak",             value: `${streak}d`,   sub: "consecutive",  icon: Flame,    color: "text-amber-400"   },
                                        ].map((s) => (
                                            <Card key={s.label} className="bg-white/3 border-white/10">
                                                <CardContent className="p-3">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-[10px] text-white/35 uppercase tracking-wide leading-tight">{s.label}</span>
                                                        <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                                                    </div>
                                                    <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
                                                    <div className="text-[10px] text-white/30 mt-0.5">{s.sub}</div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Quick report CTA — mobile/tablet only */}
                                    <div className="px-4 sm:px-6 mb-5 lg:hidden">
                                        <Sheet open={reportSheetOpen} onOpenChange={setReportSheetOpen}>
                                            <SheetTrigger asChild>
                                                <button className="w-full relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-cyan-500/8 p-5 flex items-center gap-4 hover:border-cyan-500/50 hover:bg-cyan-500/12 transition-all duration-200 group">
                                                    <div className="w-14 h-14 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                        <Navigation className="w-6 h-6 text-cyan-400" />
                                                    </div>
                                                    <div className="text-left flex-1">
                                                        <div className="text-base font-bold text-white mb-0.5">Report an Issue</div>
                                                        <div className="text-[11px] text-white/40">Takes under 10 seconds · Verified rewards only</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <Badge variant="outline" className="text-[9px] border-cyan-500/40 text-cyan-400">Up to KES 15</Badge>
                                                        <ChevronRight className="w-4 h-4 text-white/30" />
                                                    </div>
                                                </button>
                                            </SheetTrigger>
                                            <SheetContent side="bottom" className="bg-[#111316] border-t border-white/10 text-white rounded-t-2xl max-h-[90vh] overflow-auto">
                                                <SheetHeader className="pb-3">
                                                    <SheetTitle className="text-white flex items-center gap-2">
                                                        <Navigation className="w-4 h-4 text-cyan-400" />Report Traffic Issue
                                                    </SheetTitle>
                                                </SheetHeader>
                                                <ReportSheet onSubmit={() => {}} />
                                            </SheetContent>
                                        </Sheet>
                                    </div>

                                    {/* Bottom home section: 1-col → 2-col lg */}
                                    <div className="px-4 sm:px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Behavior snapshot */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Behavior Snapshot</div>
                                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-white/30 hover:text-white hover:bg-white/5 px-2 gap-1">
                                                    Full breakdown <ChevronRight className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                {BEHAVIOR_METRICS.slice(0, 3).map((m) => {
                                                    const TIcon = trendIcon(m.trend);
                                                    return (
                                                        <div key={m.label} className="space-y-1">
                                                            <div className="flex justify-between items-center text-[11px]">
                                                                <span className="text-white/60">{m.label}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <TIcon className={`w-3 h-3 ${trendColor(m.trend)}`} />
                                                                    <span className="font-bold font-mono text-white/80">{m.score}</span>
                                                                    <span className="text-white/25">/100</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                                                                <div className={`h-full rounded-full transition-all ${m.score >= 85 ? "bg-emerald-500" : m.score >= 65 ? "bg-amber-500" : "bg-red-500"}`}
                                                                     style={{ width: `${m.score}%` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {/* Recent reports */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-[11px] uppercase tracking-widest text-white/40 font-bold">Recent Reports</div>
                                                <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400">
                                                    {REPORTS.filter(r => r.status === "verifying").length} in queue
                                                </Badge>
                                            </div>
                                            <div className="space-y-2">
                                                {REPORTS.slice(0, 3).map((r) => {
                                                    const scfg   = statusConfig[r.status];
                                                    const SCIcon  = scfg.icon;
                                                    const CatIcon = r.categoryIcon;
                                                    return (
                                                        <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${scfg.bg}`}>
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                                                                <CatIcon className="w-4 h-4 text-white/50" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-semibold text-white/80 truncate">{r.category}</div>
                                                                <div className="text-[10px] text-white/35 truncate">{r.location}</div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                                <div className={`flex items-center gap-1 text-[10px] font-bold ${scfg.color}`}>
                                                                    <SCIcon className="w-3 h-3" />{scfg.label}
                                                                </div>
                                                                {r.rewardKES !== null && r.rewardKES > 0 && <span className="text-[10px] font-mono text-emerald-400">+KES {r.rewardKES}</span>}
                                                                {r.rewardKES === 0 && <span className="text-[10px] text-red-400/60">No reward</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* ══ REPORTS TAB ══ */}
                                <TabsContent value="reports" className="mt-0 px-4 sm:px-6 pt-4 pb-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-bold text-white">My Reports</div>
                                        <Select value={reportFilter} onValueChange={setReportFilter}>
                                            <SelectTrigger className="h-7 w-32 bg-white/5 border-white/10 text-white/50 text-[11px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-white/10">
                                                {[
                                                    { value: "all",       label: "All"       },
                                                    { value: "verifying", label: "Verifying" },
                                                    { value: "verified",  label: "Verified"  },
                                                    { value: "rejected",  label: "Rejected"  },
                                                    { value: "flagged",   label: "Flagged"   },
                                                ].map((o) => (
                                                    <SelectItem key={o.value} value={o.value} className="text-xs text-white/70 focus:bg-white/10">{o.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Status count chips */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { status: "verifying" as ReportStatus, count: REPORTS.filter(r => r.status === "verifying").length },
                                            { status: "verified"  as ReportStatus, count: REPORTS.filter(r => r.status === "verified").length  },
                                            { status: "rejected"  as ReportStatus, count: REPORTS.filter(r => r.status === "rejected").length  },
                                            { status: "flagged"   as ReportStatus, count: REPORTS.filter(r => r.status === "flagged").length   },
                                        ].map((s) => {
                                            const scfg = statusConfig[s.status];
                                            const Icon = scfg.icon;
                                            return (
                                                <button key={s.status} onClick={() => setReportFilter(s.status)}
                                                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                                                            reportFilter === s.status ? `${scfg.bg} ring-1 ring-current` : "border-white/8 bg-white/2"
                                                        }`}>
                                                    <Icon className={`w-4 h-4 ${scfg.color}`} />
                                                    <span className={`text-sm font-bold font-mono ${scfg.color}`}>{s.count}</span>
                                                    <span className="text-[9px] text-white/30 capitalize">{s.status}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Reports grid: 1-col → 2-col md → 3-col xl */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {filteredReports.map((r) => {
                                            const scfg   = statusConfig[r.status];
                                            const SCIcon  = scfg.icon;
                                            const CatIcon = r.categoryIcon;
                                            return (
                                                <div key={r.id} className={`rounded-xl border p-4 ${scfg.bg}`}>
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                                <CatIcon className="w-4 h-4 text-white/50" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-white/85">{r.category}</div>
                                                                <div className="text-[10px] font-mono text-white/30">{r.id}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <SCIcon className={`w-3.5 h-3.5 ${scfg.color}`} />
                                                            <span className={`text-[10px] font-bold ${scfg.color}`}>{scfg.label}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-white/40 mb-2">
                                                        <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{r.location}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-white/35 mb-3">
                                                        <Brain className="w-3 h-3 text-cyan-400/50 shrink-0" />
                                                        <span className="italic">{r.aiNote}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                                                            <Clock className="w-3 h-3" />{r.time}
                                                            {r.hasMedia && <><span className="text-white/15">·</span><Camera className="w-3 h-3 text-cyan-400/50" /><span className="text-cyan-400/50">Media</span></>}
                                                        </div>
                                                        {r.rewardKES !== null && (
                                                            <span className={`text-xs font-bold font-mono ${r.rewardKES > 0 ? "text-emerald-400" : "text-red-400/60"}`}>
                                                                {r.rewardKES > 0 ? `+KES ${r.rewardKES}` : "No reward"}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </TabsContent>

                                {/* ══ REWARDS TAB ══ */}
                                <TabsContent value="rewards" className="mt-0 px-4 sm:px-6 pt-4 pb-6 space-y-5">

                                    {/* Balance + Redeem: 1-col → 2-col md */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5">
                                            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                                            <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Your Discount Wallet</div>
                                            <div className="text-4xl font-bold font-mono text-emerald-400 mb-1">KES {walletBalance}</div>
                                            <div className="text-[11px] text-white/40">Applicable to parking payments at partner zones</div>
                                            <div className="mt-4 space-y-1.5">
                                                <div className="flex justify-between text-[10px]">
                                                    <span className="text-white/35">To next tier (15% discount)</span>
                                                    <span className="text-white/55 font-mono">{walletBalance}/{nextRewardAt} KES</span>
                                                </div>
                                                <Progress value={progress} className="h-2 bg-white/10" />
                                            </div>
                                        </div>

                                        <Card className="bg-white/3 border-white/10">
                                            <CardHeader className="pb-3 pt-4 px-4">
                                                <CardTitle className="text-xs text-white/60 font-semibold tracking-widest uppercase flex items-center gap-2">
                                                    <ParkingSquare className="w-3.5 h-3.5 text-cyan-400" /> Redeem at Parking Zone
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4 space-y-4">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs text-white/50">Discount to apply</label>
                                                        <span className="text-lg font-bold font-mono text-emerald-400">KES {discountToApply[0]}</span>
                                                    </div>
                                                    <Slider value={discountToApply} onValueChange={setDiscountToApply} min={5} max={walletBalance} step={5} className="w-full" />
                                                    <div className="flex justify-between text-[10px] text-white/25">
                                                        <span>KES 5</span><span>KES {walletBalance}</span>
                                                    </div>
                                                </div>
                                                <div className="rounded-lg border border-white/8 bg-white/3 p-3 space-y-2">
                                                    <div className="flex justify-between text-xs text-white/50">
                                                        <span>Parking fee</span><span className="font-mono">KES 120</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-emerald-400">
                                                        <span>Discount applied</span><span className="font-mono">- KES {discountToApply[0]}</span>
                                                    </div>
                                                    <div className="h-px bg-white/10" />
                                                    <div className="flex justify-between text-sm font-bold text-white">
                                                        <span>You pay</span><span className="font-mono">KES {120 - discountToApply[0]}</span>
                                                    </div>
                                                </div>
                                                <Button className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-11 text-sm gap-2">
                                                    <ScanLine className="w-4 h-4" /> Scan QR to Apply Discount
                                                </Button>
                                                <p className="text-[10px] text-white/20 text-center">Only usable at NCA-registered parking zones · Balance deducted on use</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* How to earn + History: 1-col → 2-col lg */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <Card className="bg-white/3 border-white/10">
                                            <CardHeader className="pb-2 pt-4 px-4">
                                                <CardTitle className="text-xs text-white/60 font-semibold tracking-widest uppercase flex items-center gap-2">
                                                    <Zap className="w-3.5 h-3.5 text-amber-400" /> How to Earn
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-4 pb-4 space-y-2">
                                                {[
                                                    { source: "Verified traffic report",  reward: "KES 5–15", icon: Eye,    color: "text-cyan-400"    },
                                                    { source: "7-day safe driving streak",reward: "KES 15",   icon: Flame,  color: "text-amber-400"   },
                                                    { source: "Speed compliance — week",  reward: "KES 10",   icon: Gauge,  color: "text-emerald-400" },
                                                    { source: "Signal adherence bonus",   reward: "KES 8",    icon: Trophy, color: "text-yellow-400"  },
                                                ].map((item) => (
                                                    <div key={item.source} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                                                        <item.icon className={`w-4 h-4 ${item.color} shrink-0`} />
                                                        <span className="text-xs text-white/55 flex-1">{item.source}</span>
                                                        <span className="text-xs font-bold font-mono text-emerald-400">{item.reward}</span>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>

                                        <div>
                                            <div className="text-[11px] uppercase tracking-widest text-white/40 font-bold mb-3">Transaction History</div>
                                            <div className="rounded-xl border border-white/10 overflow-hidden">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="border-white/8 hover:bg-transparent">
                                                            {["Date", "Source", "Amount"].map((h) => (
                                                                <TableHead key={h} className="text-[10px] tracking-widest text-white/25 uppercase bg-white/3 font-semibold h-8">{h}</TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {REWARD_HISTORY.map((entry) => (
                                                            <TableRow key={entry.id} className="border-white/6 hover:bg-white/2">
                                                                <TableCell className="text-[10px] text-white/35 py-2.5 font-mono">{entry.date}</TableCell>
                                                                <TableCell className="text-[11px] text-white/55 py-2.5 max-w-35 truncate">{entry.source}</TableCell>
                                                                <TableCell className={`text-xs font-bold font-mono py-2.5 ${entry.type === "earned" ? "text-emerald-400" : "text-red-400/70"}`}>
                                                                    {entry.amount}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* ══ BEHAVIOR TAB ══ */}
                                <TabsContent value="behavior" className="mt-0 px-4 sm:px-6 pt-4 pb-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-bold text-white">Driving Performance</div>
                                            <div className="text-[11px] text-white/40">Last 7 days · 3 trips tracked</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold font-mono text-emerald-400">{driveScore}</div>
                                            <div className="text-[10px] text-white/30">Overall score</div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                        <div className="flex items-center gap-3">
                                            <BadgeCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                                            <div>
                                                <div className="text-sm font-bold text-emerald-400">Good Standing</div>
                                                <div className="text-[11px] text-white/40">Score 80–89 · All rewards fully active · Trusted for reporting</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metrics: 1-col → 2-col md → 3-col xl */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {BEHAVIOR_METRICS.map((m) => {
                                            const TIcon = trendIcon(m.trend);
                                            return (
                                                <div key={m.label} className="rounded-xl border border-white/8 bg-white/2 p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="text-xs font-semibold text-white/80">{m.label}</div>
                                                        <div className="flex items-center gap-2">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="text-[10px] text-white/25 border border-white/15 rounded px-1 cursor-help">{m.weight} weight</span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-zinc-800 border-white/10 text-xs">
                                                                    This metric contributes {m.weight} to your overall drive score.
                                                                </TooltipContent>
                                                            </Tooltip>
                                                            <TIcon className={`w-3.5 h-3.5 ${trendColor(m.trend)}`} />
                                                            <span className={`text-sm font-bold font-mono ${m.score >= 85 ? "text-emerald-400" : m.score >= 65 ? "text-amber-400" : "text-red-400"}`}>
                                                                {m.score}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-white/8 overflow-hidden mb-2">
                                                        <div className={`h-full rounded-full transition-all ${m.score >= 85 ? "bg-emerald-500" : m.score >= 65 ? "bg-amber-500" : "bg-red-500"}`}
                                                             style={{ width: `${m.score}%` }} />
                                                    </div>
                                                    <div className="text-[10px] text-white/35">{m.detail}</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Trust level */}
                                    <div className={`rounded-xl border p-4 ${trust.bg} border-current/20`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <TrustIcon className={`w-5 h-5 ${trust.color}`} />
                                            <div className="text-sm font-bold text-white">Trust Level: {trust.label}</div>
                                        </div>
                                        <div className="text-[11px] text-white/50 leading-relaxed mb-3">
                                            Your trust level is based on report accuracy, consistency, and driving history. Higher trust means faster verification and better reward eligibility.
                                        </div>
                                        <div className="flex gap-2">
                                            {(["new", "trusted", "verified", "elite"] as TrustLevel[]).map((lvl) => {
                                                const tcfg   = trustConfig[lvl];
                                                const TLIcon  = tcfg.icon;
                                                const isActive = lvl === trustLevel;
                                                const levels   = ["new", "trusted", "verified", "elite"];
                                                const isPast   = levels.indexOf(lvl) < levels.indexOf(trustLevel);
                                                return (
                                                    <div key={lvl} className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                                                        isActive ? `${tcfg.bg} border-current/40 ring-1 ring-current/30` :
                                                            isPast   ? "border-emerald-500/20 bg-emerald-500/5" :
                                                                "border-white/8 bg-white/2 opacity-40"
                                                    }`}>
                                                        <TLIcon className={`w-3.5 h-3.5 ${isActive ? tcfg.color : isPast ? "text-emerald-400" : "text-white/20"}`} />
                                                        <span className={`text-[8px] font-bold uppercase tracking-wide ${isActive ? tcfg.color : isPast ? "text-emerald-400/70" : "text-white/20"}`}>
                                                            {tcfg.label.split(" ")[0]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </TabsContent>

                            </div>{/* end scrollable */}

                            {/* Bottom nav — mobile + tablet only */}
                            <div className="shrink-0 border-t border-white/8 bg-[#0d0f12]/95 backdrop-blur-sm lg:hidden">
                                <TabsList className="w-full h-16 bg-transparent rounded-none p-0 grid grid-cols-4">
                                    {NAV_TABS.map((tab) => (
                                        <TabsTrigger key={tab.value} value={tab.value}
                                                     className="flex-col gap-1 h-full rounded-none text-white/30 data-[state=active]:text-cyan-400 data-[state=active]:bg-transparent border-t-2 border-transparent data-[state=active]:border-cyan-400 transition-all">
                                            <tab.icon className="w-5 h-5" />
                                            <span className="text-[9px] tracking-wide uppercase">{tab.label}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                        </Tabs>
                    </div>{/* end main column */}
                </div>{/* end outer shell */}
            </div>
        </TooltipProvider>
    );
}