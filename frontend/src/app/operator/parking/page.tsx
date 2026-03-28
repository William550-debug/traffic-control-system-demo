"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SmartParkingDashboard — Enhanced UI
 *
 * Improvements over original:
 *
 * 1. LAYOUT & SPACING
 *    - Sidebar header/summary sections: consistent px-5 py-4 rhythm
 *    - Zone list: p-3 → p-4, space-y-2.5 → space-y-3 (less cramped)
 *    - KPI strip: gap-3 → gap-4, p-3 → p-4 per card
 *    - Tabs content areas: consistent p-6 padding
 *    - Right panel section paddings normalised to px-5 py-4
 *
 * 2. AI RECOMMENDATIONS TRIGGER (header)
 *    - New <AIRecommendationsDropdown> component in the top bar
 *    - Brain icon with cyan glow ring — visually distinct from utility buttons
 *    - Hover: "AI Recommendations" tooltip via Tooltip primitive
 *    - Click: animated dropdown panel with scrollable recommendation list
 *    - Shows pending count badge; collapses on outside click (Radix DropdownMenu)
 *
 * 3. SIDEBAR ENHANCEMENTS
 *    - Summary block: zone status pills (Critical / High / Low) given more
 *      breathing room with gap-3, larger dot (w-2 h-2), pill border radius
 *    - Zone list scroll area: px-3 → px-4 padding on the scroll container
 *    - ZoneMapCell: pl-8 inset on Rows 2-4 for clear column alignment
 *    - Removed outer py-4 px-3 on <aside> that created double-padding with header
 *
 * 4. DEMAND FORECAST TAB — SHADCN BAR CHART
 *    - Replaced custom ForecastBar columns with shadcn BarChart
 *    - Multi-series grouped bars: Now / +30m / +60m / +120m per zone
 *    - Color-coded bars keyed to statusConfig.bar classes via CSS vars
 *    - Custom tooltip showing pct + time label
 *    - Responsive container fills card width
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import {
  Brain,
  MapPin,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Shield,
  ShieldOff,
  Check,
  X,
  Edit3,
  Lock,
  ChevronDown,
  Zap,
  Car,
  BarChart3,
  RefreshCw,
  Bell,
  Settings,
  User,
  Gauge,
  Map,
  History,
  ToggleLeft,
  ToggleRight,
  Navigation,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useParking } from "@/hooks/use-parking";
import toast, { Toaster } from "react-hot-toast";
import type {TooltipProps} from "recharts";
import type {ValueType, NameType} from "recharts/types/component/DefaultTooltipContent";
/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

type ZoneStatus = "critical" | "high" | "moderate" | "low";
type AIMode = "assisted" | "operator";

interface Zone {
  id: string;
  name: string;
  location: string;
  capacity: number;
  occupied: number;
  status: ZoneStatus;
  currentPrice: number;
  aiPrice: number | null;
  locked: boolean;
  aiDisabled: boolean;
  forecast30: number;
  forecast60: number;
  forecast120: number;
}

interface AIRecommendation {
  id: string;
  zoneId: string;
  zoneName: string;
  action: string;
  reason: string;
  confidence: number;
  impact: string;
  type: "price_increase" | "price_decrease" | "redirect" | "alert";
  timestamp: string;
  status: "pending" | "approved" | "overridden" | "rejected";
}



/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS — single source of truth
═══════════════════════════════════════════════════════════════════════════ */

const T = {
  label: "text-[11px] tracking-[0.12em] uppercase font-semibold",
  body: "text-sm",
  mono: "font-mono text-xs",
  hero: "text-xl font-bold font-mono",
} as const;

const TX = {
  primary: "text-white/90",
  secondary: "text-white/60",
  muted: "text-white/35",
} as const;

const BD = {
  subtle: "border-white/[0.08]",
  default: "border-white/[0.12]",
  strong: "border-white/[0.22]",
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   STATUS CONFIG
═══════════════════════════════════════════════════════════════════════════ */

const statusConfig: Record<
    ZoneStatus,
    {
      label: string;
      color: string;
      bg: string;
      bar: string;
      dot: string;
      accent: string;
      hex: string; // for recharts fills
    }
> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-500/[0.08] border-red-500/25",
    bar: "bg-red-500",
    dot: "bg-red-400",
    accent: "#f87171",
    hex: "#ef4444",
  },
  high: {
    label: "High",
    color: "text-amber-400",
    bg: "bg-amber-500/[0.08] border-amber-500/25",
    bar: "bg-amber-500",
    dot: "bg-amber-400",
    accent: "#fbbf24",
    hex: "#f59e0b",
  },
  moderate: {
    label: "Moderate",
    color: "text-yellow-400",
    bg: "bg-yellow-500/[0.08] border-yellow-500/25",
    bar: "bg-yellow-500",
    dot: "bg-yellow-400",
    accent: "#facc15",
    hex: "#eab308",
  },
  low: {
    label: "Low",
    color: "text-emerald-400",
    bg: "bg-emerald-500/[0.08] border-emerald-500/25",
    bar: "bg-emerald-500",
    dot: "bg-emerald-400",
    accent: "#34d399",
    hex: "#10b981",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   REC TYPE CONFIG
═══════════════════════════════════════════════════════════════════════════ */

const recTypeConfig = {
  price_increase: { icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/[0.10]", accent: "#fbbf24", label: "Price ↑" },
  price_decrease: { icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-500/[0.10]", accent: "#34d399", label: "Price ↓" },
  redirect:       { icon: Navigation, color: "text-cyan-400", bg: "bg-cyan-500/[0.10]", accent: "#22d3ee", label: "Redirect" },
  alert:          { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/[0.10]", accent: "#f87171", label: "Alert" },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   CARD STATE CONFIG
═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */

const occupancyPct = (z: Zone) => Math.round((z.occupied / z.capacity) * 100);

function confidenceLevel(score: number): {
  bar: string;
  text: string;
  label: string;
} {
  if (score >= 85)
    return { bar: "bg-emerald-400", text: "text-emerald-400", label: "High" };
  if (score >= 70)
    return { bar: "bg-amber-400", text: "text-amber-400", label: "Medium" };
  return { bar: "bg-red-400", text: "text-red-400", label: "Low" };
}


/* ═══════════════════════════════════════════════════════════════════════════
   ZONE MAP CELL
   Rows 2-4 use pl-8 to create a unified inset column, visually separated
   from the 3px left accent bar. Row 1 (ID + icons) stays flush for contrast.
═══════════════════════════════════════════════════════════════════════════ */

function ZoneMapCell({
                       zone,
                       selected,
                       onClick,
                     }: {
  zone: Zone;
  selected: boolean;
  onClick: () => void;
}) {
  const pct = occupancyPct(zone);
  const cfg = statusConfig[zone.status];
  const isUrgent = zone.status === "critical" || zone.status === "high";

  const hasDelta =
      zone.aiPrice !== null &&
      zone.aiPrice !== zone.currentPrice &&
      !zone.aiDisabled;
  const delta = hasDelta ? zone.aiPrice! - zone.currentPrice : 0;
  const deltaPositive = delta > 0;

  return (
      <button
          onClick={onClick}
          aria-pressed={selected}
          className={[
            "relative flex flex-col gap-3 pl-6 pr-4 py-4 rounded-xl border m-1",
            "text-left w-full overflow-hidden transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
            cfg.bg,
            selected
                ? "ring-[1.5px] ring-cyan-400/50 shadow-[0_0_24px_-4px_rgba(34,211,238,0.15)]"
                : `hover:${BD.strong} hover:bg-white/[0.06] hover:shadow-md hover:shadow-black/30`,
          ].join(" ")}
      >
        {/* Left accent bar */}
        <span
            aria-hidden
            className="absolute top-0 bottom-0 left-0 w-[3px] rounded-l-xl"
            style={{ background: cfg.accent }}
        />

        {/* Row 1: Zone ID + indicator cluster */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
          <span
              className={[
                "w-2 h-2 rounded-full shrink-0",
                cfg.dot,
                isUrgent ? "animate-pulse" : "",
              ].join(" ")}
          />
            <span className={`${T.label} ${TX.muted} font-mono`}>{zone.id}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {zone.locked && (
                <Lock
                    className="w-3.5 h-3.5 text-amber-400"
                    aria-label="Price locked"
                />
            )}
            {zone.aiDisabled && (
                <ShieldOff
                    className="w-3.5 h-3.5 text-red-400"
                    aria-label="AI disabled"
                />
            )}
            {!zone.aiDisabled && !zone.locked && (
                <Brain
                    className="w-3.5 h-3.5 text-cyan-400/40"
                    aria-label="AI active"
                />
            )}
          </div>
        </div>

        {/* Row 2: Zone name + location — pl-8 inset for column alignment */}
        <div className="space-y-0.5 pl-8 pr-0 min-w-0">
          <div
              className={`${T.body} font-semibold ${TX.primary} leading-snug truncate`}
          >
            {zone.name}
          </div>
          <div className={`${T.mono} ${TX.muted} truncate`}>{zone.location}</div>
        </div>

        {/* Row 3: Occupancy — pl-8 aligns pct with name above */}
        <div className="space-y-1.5 pl-8">
          <div className="flex items-baseline justify-between">
          <span className={`text-sm font-bold font-mono ${cfg.color}`}>
            {pct}%
          </span>
            <span className={`${T.mono} ${TX.muted}`}>
            {zone.occupied}&thinsp;/&thinsp;{zone.capacity}
          </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Row 4: Price + AI delta — pl-8 aligns with rows above */}
        <div className="flex items-center justify-between pl-8">
        <span className={`${T.mono} ${TX.secondary}`}>
          KES&nbsp;{zone.currentPrice}
          <span className={`${TX.muted} ml-1`}>/hr</span>
        </span>
          {hasDelta && (
              <span
                  className={[
                    "inline-flex items-center gap-0.5",
                    T.mono,
                    deltaPositive ? "text-amber-400" : "text-emerald-400",
                  ].join(" ")}
                  aria-label={`AI suggests ${deltaPositive ? "increase" : "decrease"} of KES ${Math.abs(delta)}`}
              >
            {deltaPositive ? (
                <TrendingUp className="w-3 h-3" />
            ) : (
                <TrendingDown className="w-3 h-3" />
            )}
                {deltaPositive ? "+" : ""}
                {delta}
          </span>
          )}
        </div>
      </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI RECOMMENDATION CARD (right panel)
═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   REDESIGNED RecommendationCard

   Layout (4 rows, ~115px per card vs ~200px before):

   Row 1  [type pill + zone name · id]        [Pending badge]
   Row 2  Action statement (bold, 1 line)
   Row 3  WHY · one-line reason truncated      confidence dot
   Row 4  [Approve]  [Modify]  [✕]            impact chip

   Key decisions:
   - WHY/IMPACT collapsed: reason on one truncated line, impact
     becomes a small pill on the actions row
   - Confidence: full bar gone → coloured dot + % inline with WHY
   - Buttons: full-width stacked → inline row, approve is accent
   - Resolved cards: collapse to 2-row summary (no action row)
───────────────────────────────────────────────────────────── */
function RecommendationCard({
                              rec,
                              onApprove,
                              onModify,
                              onReject,
                              isLoading,
                            }: {
  rec: AIRecommendation;
  onApprove: (id: string) => void;
  onModify: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
}) {
  const typeCfg = recTypeConfig[rec.type];
  const TypeIcon = typeCfg.icon;
  const isPending = rec.status === "pending";
  const conf = confidenceLevel(rec.confidence);

  /* resolved cards get a subdued appearance */
  const resolvedStyles = {
    approved:   { card: "border-emerald-500/15 bg-emerald-500/[0.04]", dot: "bg-emerald-400", text: "text-emerald-400", label: "Approved"  },
    rejected:   { card: "border-red-500/15 bg-red-500/[0.03]",         dot: "bg-red-400",     text: "text-red-400",    label: "Rejected"   },
    overridden: { card: "border-amber-500/15 bg-amber-500/[0.04]",     dot: "bg-amber-400",   text: "text-amber-400",  label: "Overridden" },
  };
  const resolved = !isPending ? resolvedStyles[rec.status as keyof typeof resolvedStyles] : null;

  return (
      <div
          className={[
            "relative overflow-hidden rounded-2xl border transition-all duration-200",
            /* left accent — 3px strip matching type color */
            isPending
                ? `${BD.default} bg-white/[0.03] hover:bg-white/[0.05]`
                : resolved!.card,
            !isPending ? "opacity-60" : "",
          ].join(" ")}
      >
        {/* 3px left accent bar */}
        <span
            aria-hidden
            className="absolute top-0 bottom-0 left-0 w-[3px]"
            style={{ background: typeCfg.accent }}
        />

        <div className="pl-4 pr-3.5 pt-3.5 pb-3 space-y-2.5">

          {/* ── Row 1: type pill · zone · id  +  status badge ── */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* type pill */}
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${typeCfg.bg} shrink-0`}>
                <TypeIcon className={`w-3 h-3 ${typeCfg.color}`} />
                <span className={`text-[10px] font-semibold tracking-wide ${typeCfg.color}`}>
                {typeCfg.label}
              </span>
              </div>
              {/* zone name */}
              <span className={`text-xs font-semibold ${TX.primary} truncate`}>
              {rec.zoneName}
            </span>
              {/* id + timestamp — ghost, one piece */}
              <span className={`text-[10px] font-mono ${TX.muted} shrink-0 hidden sm:inline`}>
              {rec.id}
            </span>
            </div>

            {/* status badge */}
            {isPending ? (
                <span className="shrink-0 text-[10px] font-semibold tracking-wide text-cyan-400/80 border border-cyan-500/25 rounded-md px-1.5 py-0.5 bg-cyan-500/[0.06]">
              Pending
            </span>
            ) : (
                <span className={`shrink-0 text-[10px] font-semibold ${resolved!.text} flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${resolved!.dot}`} />
                  {resolved!.label}
            </span>
            )}
          </div>

          {/* ── Row 2: action statement ── */}
          <p className={`text-[13px] font-bold ${TX.primary} leading-snug`}>
            {rec.action}
          </p>

          {/* ── Row 3: reason (1 line) + confidence dot ── */}
          <div className="flex items-center justify-between gap-3">
            <p className={`text-[11px] ${TX.muted} truncate leading-relaxed`}>
              {rec.reason}
            </p>
            {/* confidence: dot + % only — no bar */}
            <div className={`flex items-center gap-1 shrink-0 ${conf.text}`}>
            <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.bar}`}
            />
              <span className="text-[10px] font-mono font-bold">
              {rec.confidence}%
            </span>
            </div>
          </div>

          {/* ── Row 4: action buttons (pending only) + impact chip ── */}
          {isPending && (
              <div className="flex items-center gap-2 pt-0.5">
                {/* Approve — primary action, full colour */}
                <button
                    onClick={() => onApprove(rec.id)}
                    disabled={isLoading}
                    className={[
                      "flex-1 h-7 rounded-lg text-[11px] font-bold tracking-wide",
                      "bg-emerald-600/80 hover:bg-emerald-600 text-white",
                      "flex items-center justify-center gap-1.5 transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                >
                  {isLoading ? (
                      <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                      <Check className="w-3 h-3" />
                  )}
                  Approve
                </button>

                {/* Modify — secondary */}
                <button
                    onClick={() => onModify(rec.id)}
                    disabled={isLoading}
                    className={[
                      "flex-1 h-7 rounded-lg text-[11px] font-semibold",
                      "border border-white/[0.10] text-white/50 hover:text-white/80",
                      "hover:bg-white/[0.05] flex items-center justify-center gap-1.5",
                      "transition-colors disabled:opacity-40",
                    ].join(" ")}
                >
                  <Edit3 className="w-3 h-3" />
                  Modify
                </button>

                {/* Reject — icon only */}
                <button
                    onClick={() => onReject(rec.id)}
                    disabled={isLoading}
                    aria-label="Reject"
                    className={[
                      "h-7 w-7 rounded-lg shrink-0 text-white/30 hover:text-red-400",
                      "border border-white/[0.08] hover:border-red-500/30 hover:bg-red-500/[0.06]",
                      "flex items-center justify-center transition-colors disabled:opacity-40",
                    ].join(" ")}
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Impact chip — right-aligned, doesn't wrap */}
                <span className="ml-auto text-[10px] text-emerald-400/80 font-medium truncate max-w-[90px] shrink-0 hidden md:block">
              {rec.impact}
            </span>
              </div>
          )}
        </div>
      </div>
  );
}


/* ─────────────────────────────────────────────────────────────
   REDESIGNED right panel <aside>

   Structure:
   ┌─ sticky header (48px) ──────────────────────────────────┐
   │  Brain icon  AI Recommendations  [N pending]  [MANUAL]  │
   ├─ mode strip (32px) ─────────────────────────────────────┤
   │  Zap/Shield  one-line description                        │
   ├─ scroll area (flex-1) ──────────────────────────────────┤
   │  cards with space-y-2.5 and px-4 py-3                   │
   ├─ pinned footer (auto height, max ~90px) ────────────────┤
   │  3-col metric grid                                       │
   └─────────────────────────────────────────────────────────┘

   Key changes:
   - Header: removed the paragraph-length mode description from
     header. It becomes a one-line strip below the divider.
   - Cards: smaller (see above), more fit in the visible area
   - Footer: grid always visible — panel uses flex-col so footer
     never gets pushed off screen by the scroll area
─────────────────────────────────────────────────────────────── */
const RightPanel = ({
                      recommendations,
                      onApprove,
                      onModify,
                      onReject,
                      loadingAction,
                      aiMode,
                    }: {
  recommendations: AIRecommendation[];
  onApprove: (id: string) => void;
  onModify: (id: string) => void;
  onReject: (id: string) => void;
  loadingAction: Record<string, "approve" | "reject" | null | undefined>;
  aiMode: AIMode;
}) => {
  const pendingRecs = recommendations.filter((r) => r.status === "pending");

  const metrics = [
    { label: "Adoption",  value: 72, color: "text-cyan-400",    fill: "bg-cyan-500/70"    },
    { label: "Accuracy",  value: 84, color: "text-emerald-400", fill: "bg-emerald-500/70" },
    { label: "Trust",     value: 81, color: "text-amber-400",   fill: "bg-amber-500/70"   },
  ] as const;

  return (
      <aside className={`w-[340px] xl:w-[370px] shrink-0 border-l ${BD.subtle} flex flex-col bg-[#0d0f12]`}>

        {/* ── Sticky header ── */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${BD.subtle} shrink-0`}>
          <div className="flex items-center gap-2.5">
            {/* Icon with live dot */}
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              {pendingRecs.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border-2 border-[#0d0f12]" />
              )}
            </div>
            <div>
              <p className={`${T.label} ${TX.primary} leading-none`}>AI Recommendations</p>
              <p className={`text-[10px] ${TX.muted} mt-0.5`}>
                {pendingRecs.length > 0
                    ? `${pendingRecs.length} awaiting review`
                    : "All reviewed"}
              </p>
            </div>
          </div>

          {/* Mode pill — compact, top-right */}
          <div
              className={[
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border",
                "text-[10px] font-bold tracking-widest uppercase shrink-0",
                aiMode === "assisted"
                    ? "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-400"
                    : "border-amber-500/25 bg-amber-500/[0.08] text-amber-400",
              ].join(" ")}
          >
            {aiMode === "assisted"
                ? <><Zap className="w-2.5 h-2.5" /> Auto</>
                : <><Shield className="w-2.5 h-2.5" /> Manual</>
            }
          </div>
        </div>

        {/* ── Mode description strip — one line, no wrapping ── */}
        <div className={`px-5 py-2.5 border-b ${BD.subtle} shrink-0`}>
          <p className={`text-[11px] ${TX.muted} leading-none truncate`}>
            {aiMode === "assisted"
                ? "Auto-adjusting within operator limits · override available"
                : "All AI actions require explicit approval before applying"}
          </p>
        </div>

        {/* ── Scrollable recommendation list ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-3 space-y-2.5">
            {recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white/20" />
                  </div>
                  <p className={`text-xs ${TX.muted}`}>No active recommendations</p>
                </div>
            ) : (
                recommendations.map((rec) => (
                    <RecommendationCard
                        key={rec.id}
                        rec={rec}
                        onApprove={onApprove}
                        onModify={onModify}
                        onReject={onReject}
                        isLoading={!!loadingAction[rec.id]}
                    />
                ))
            )}
          </div>
        </ScrollArea>

        {/* ── Pinned footer — AI performance grid ── */}
        <div className={`border-t ${BD.subtle} px-5 pt-4 pb-4 shrink-0`}>
          <p className={`${T.label} ${TX.muted} mb-3`}>AI Performance</p>
          <div className="grid grid-cols-3 gap-2">
            {metrics.map((m) => (
                <div
                    key={m.label}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2.5 flex flex-col gap-1.5"
                >
                  {/* Value */}
                  <span className={`font-mono font-bold text-sm leading-none ${m.color}`}>
                {m.value}%
              </span>
                  {/* Bar */}
                  <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                        className={`h-full rounded-full ${m.fill} transition-all duration-700`}
                        style={{ width: `${m.value}%` }}
                    />
                  </div>
                  {/* Label */}
                  <span className={`text-[10px] leading-none ${TX.muted}`}>
                {m.label}
              </span>
                </div>
            ))}
          </div>
        </div>

      </aside>
  );
};

export { RightPanel, RecommendationCard };

/* ═══════════════════════════════════════════════════════════════════════════
   AI RECOMMENDATIONS DROPDOWN — header trigger

   Design rationale:
   - Brain icon with cyan ring glow: visually distinct from utility icon buttons,
     communicates "AI intelligence" at a glance
   - Tooltip on hover: surfaces the panel label without occupying header space
   - Click opens a Radix DropdownMenuContent: animated (fade+slide), non-modal,
     closes on outside click — doesn't block the rest of the dashboard
   - Inside the panel: scrollable rec list (max-h-[480px]), AI performance bars,
     and a "View all" CTA — all within the dropdown
   - Pending count badge pulses amber to mirror the Bell badge pattern
═══════════════════════════════════════════════════════════════════════════ */

function AIRecommendationsDropdown({
                                     recommendations,
                                     onApprove,
                                     onModify,
                                     onReject,
                                     loadingAction,
                                     aiMode,
                                   }: {
  recommendations: AIRecommendation[];
  onApprove: (id: string) => void;
  onModify: (id: string) => void;
  onReject: (id: string) => void;
  loadingAction: Record<string, "approve" | "reject" | null | undefined>;
  aiMode: AIMode;
}) {
  const pendingCount = recommendations.filter((r) => r.status === "pending").length;

  /* ── Metrics config — colour tokens defined here, not inline ── */
  const metrics = [
    {
      label: "Adoption",
      value: 72,
      color: "text-cyan-400",
      fill: "bg-cyan-500/70",
    },
    {
      label: "Accuracy",
      value: 84,
      color: "text-emerald-400",
      fill: "bg-emerald-500/70",
    },
    {
      label: "Trust",
      value: 81,
      color: "text-amber-400",
      fill: "bg-amber-500/70",
    },
  ] as const;

  return (
      <DropdownMenu>
        {/* ── Trigger button ──
          Tooltip lives INSIDE DropdownMenuTrigger as a sibling pattern
          to avoid the broken nested-asChild Radix issue.            */}
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                  variant="ghost"
                  size="sm"
                  aria-label="AI Recommendations"
                  className={[
                    "relative h-9 px-3 gap-2 rounded-lg transition-all duration-200",
                    "text-cyan-400/70 hover:text-cyan-300 hover:bg-cyan-500/[0.08]",
                    "border border-transparent hover:border-cyan-500/20",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                    // data-[state=open] keeps the active style while panel is open
                    "data-[state=open]:text-cyan-300 data-[state=open]:bg-cyan-500/[0.08] data-[state=open]:border-cyan-500/20",
                  ].join(" ")}
              >
                {/* Ambient pulse when items are pending */}
                {pendingCount > 0 && (
                    <span className="absolute inset-0 rounded-lg animate-pulse bg-cyan-500/[0.05] pointer-events-none" />
                )}

                <Sparkles className="w-4 h-4 shrink-0" />

                <span className="text-[11px] font-semibold tracking-wide hidden xl:inline">
                AI Insights
              </span>

                {pendingCount > 0 && (
                    <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-400 px-1">
                  {pendingCount}
                </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>

          <TooltipContent
              side="bottom"
              sideOffset={6}
              className="bg-zinc-900 border-white/10 text-xs text-white/70"
          >
            AI Recommendations
            {pendingCount > 0 && (
                <span className="ml-1.5 text-amber-400 font-semibold">
              ({pendingCount} pending)
            </span>
            )}
          </TooltipContent>
        </Tooltip>

        {/* ── Dropdown panel ── */}
        <DropdownMenuContent
            align="end"
            sideOffset={8}
            className={[
              "w-[500px] p-0 overflow-hidden",
              "bg-[#0f1114] border border-white/[0.08]",
              "rounded-2xl shadow-2xl shadow-black/60",
            ].join(" ")}
        >

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              {/* Brain with live dot */}
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                {pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border-2 border-[#0f1114] animate-pulse" />
                )}
              </div>
              <div>
                <p className={`${T.label} ${TX.primary}`}>AI Recommendations</p>
                <p className={`text-[10px] ${TX.muted} mt-0.5`}>
                  {pendingCount > 0
                      ? `${pendingCount} awaiting review`
                      : "All recommendations reviewed"}
                </p>
              </div>
            </div>

            {/* Mode pill */}
            <div
                className={[
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold tracking-wide shrink-0",
                  aiMode === "assisted"
                      ? "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-400"
                      : "border-amber-500/25 bg-amber-500/[0.08] text-amber-400",
                ].join(" ")}
            >
              {aiMode === "assisted" ? (
                  <><Zap className="w-3 h-3" /> AUTO</>
              ) : (
                  <><Shield className="w-3 h-3" /> MANUAL</>
              )}
            </div>
          </div>

          {/* ── Mode description banner ── */}
          <div className="px-5 py-3 border-b border-white/[0.04]">
            <p className={`text-[11px] leading-relaxed ${TX.muted}`}>
              {aiMode === "assisted"
                  ? "Auto-adjusting within operator-defined limits. Manual override available at any time."
                  : "All AI suggestions require your explicit approval before any action is taken."}
            </p>
          </div>

          {/* ── Recommendation list ── */}
          <ScrollArea className="max-h-[380px]">
            <div className="px-4 py-3 space-y-3">
              {recommendations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white/20" />
                    </div>
                    <p className={`text-xs ${TX.muted}`}>No active recommendations</p>
                  </div>
              ) : (
                  recommendations.map((rec) => (
                      <RecommendationCard
                          key={rec.id}
                          rec={rec}
                          onApprove={onApprove}
                          onModify={onModify}
                          onReject={onReject}
                          isLoading={!!loadingAction[rec.id]}
                      />
                  ))
              )}
            </div>
          </ScrollArea>

          {/* ── AI Performance footer ── */}
          <div className="border-t border-white/[0.06] px-5 pt-4 pb-4">
            <p className={`${T.label} ${TX.muted} mb-3`}>AI Performance</p>

            <div className="grid grid-cols-3 gap-2.5">
              {metrics.map((m) => (
                  <div
                      key={m.label}
                      className="rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-3 flex flex-col gap-2"
                  >
                    {/* Value */}
                    <span className={`font-mono font-bold text-sm leading-none ${m.color}`}>
                  {m.value}%
                </span>

                    {/* Progress bar */}
                    <div className="h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
                      <div
                          className={`h-full rounded-full transition-all duration-700 ${m.fill}`}
                          style={{ width: `${m.value}%` }}
                      />
                    </div>

                    {/* Label */}
                    <span className={`text-[10px] leading-none ${TX.muted}`}>
                  {m.label}
                </span>
                  </div>
              ))}
            </div>
          </div>

        </DropdownMenuContent>
      </DropdownMenu>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEMAND FORECAST BAR CHART (shadcn/recharts)

   Multi-series grouped bar chart showing Now / +30m / +60m / +120m
   for the selected zone and all comparison zones.
   Each bar is colored by the zone's occupancy forecast status.
   Custom tooltip provides clean, dark-themed readout.
═══════════════════════════════════════════════════════════════════════════ */

const FORECAST_SERIES = [
  { key: "now", label: "Now", fill: "rgba(255,255,255,0.55)" },
  { key: "f30", label: "+30 min", fill: "#22d3ee" },
  { key: "f60", label: "+60 min", fill: "#f59e0b" },
  { key: "f120", label: "+120 min", fill: "#f87171" },
] as const;



/* ── Module-level tooltip — typed against Recharts' own props ── */
interface ForecastTooltipProps extends TooltipProps<ValueType, NameType> {
  data: Array<{ name: string; fullName: string }>;
}



function ForecastTooltip({
                           active,
                           payload,
                           label,
                           data,
                         }: {
  active?: boolean;
  payload?: Array<{
    name?: string | number;
    value?: string | number;
    color?: string;
    fill?: string;
  }>;
  label?: string | number;
  data: Array<{ name: string; fullName: string }>;
}) {
  if (!active || !payload?.length) return null;
  const row = data.find((d) => d.name === String(label));
  return (
      <div className="bg-[#111316] border border-white/10 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-40">
        <p className="font-semibold text-white/90 mb-2">
          {row?.fullName ?? String(label)}
        </p>
        {payload.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
            <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: String(p.fill ?? p.color ?? "#888") }}
            />
                <span className="text-white/50">{String(p.name ?? "")}</span>
              </div>
              <span className="font-mono font-bold text-white/90">
            {p.value}%
          </span>
            </div>
        ))}
      </div>
  );
}

function ForecastBarChart({
                            selectedZone,
                            zones,
                          }: {
  selectedZone: Zone;
  zones: Zone[];
}) {
  const data = zones.map((z) => ({
    name: z.id,
    fullName: z.name,
    now: occupancyPct(z),
    f30: z.forecast30,
    f60: z.forecast60,
    f120: z.forecast120,
    isSelected: z.id === selectedZone.id,
  }));

  // Stable render function — not a component, so no ESLint violation
  const renderTooltip = (props: {
    active?: boolean;
    payload?: Array<{
      name?: string | number;
      value?: string | number;
      color?: string;
      fill?: string;
    }>;
    label?: string | number;
  }) => <ForecastTooltip {...props} data={data} />;

  return (
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
              data={data}
              barCategoryGap="28%"
              barGap={2}
              margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
          >
            <CartesianGrid
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3 3"
            />
            <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
            />
            <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
            />
            <RechartsTooltip
                content={renderTooltip as any}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.4)",
                  paddingTop: "12px",
                }}
            />
            {FORECAST_SERIES.map((s) => (
                <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.fill}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                    fillOpacity={0.6}
                />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OVERRIDE PANEL
═══════════════════════════════════════════════════════════════════════════ */

function OverridePanel({
                         zone,
                         onClose,
                         onZoneUpdated,
                         onSuccess,
                       }: {
  zone: Zone;
  onClose: () => void;
  onZoneUpdated: (id: string, updates: Partial<Zone>) => Promise<void>;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState(zone.currentPrice);
  const [reason, setReason] = useState("");
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (!reason) return;
    setApplying(true);
    try {
      await onZoneUpdated(zone.id, { currentPrice: price });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Override failed:", err);
      alert("Failed to apply override");
    } finally {
      setApplying(false);
    }
  };

  const priceComparison = [
    {
      label: "Current",
      value: `KES ${zone.currentPrice}`,
      color: TX.secondary,
    },
    {
      label: "AI Suggests",
      value: zone.aiPrice ? `KES ${zone.aiPrice}` : "—",
      color: "text-cyan-400",
    },
    { label: "Your Override", value: `KES ${price}`, color: "text-amber-400" },
  ];

  return (
      <div className="space-y-6 pt-4 px-1">
        <div
            className={`rounded-xl border ${BD.default} bg-white/[0.04] p-4 space-y-2`}
        >
          <div className="flex items-center justify-between">
          <span className={`${T.body} font-semibold ${TX.primary}`}>
            {zone.name}
          </span>
            <Badge
                variant="outline"
                className={`text-[10px] ${statusConfig[zone.status].color} border-current`}
            >
              {statusConfig[zone.status].label}
            </Badge>
          </div>
          <div className={`${T.mono} ${TX.muted}`}>{zone.location}</div>
          <div className={`${T.mono} ${TX.muted}`}>
            Occupancy:&nbsp;{occupancyPct(zone)}%&nbsp; ({zone.occupied}
            &thinsp;/&thinsp;{zone.capacity} spaces)
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          {priceComparison.map((item) => (
              <div
                  key={item.label}
                  className={`rounded-lg border ${BD.default} bg-white/[0.04] p-3`}
              >
                <div className={`text-sm font-bold font-mono ${item.color}`}>
                  {item.value}
                </div>
                <div className={`text-[10px] ${TX.muted} mt-1`}>{item.label}</div>
              </div>
          ))}
        </div>

        <div className="space-y-3">
          <label className={`${T.label} ${TX.secondary}`}>
            Set Manual Price (KES/hr)
          </label>
          <Slider
              value={[price]}
              onValueChange={(v) => setPrice(v[0])}
              min={40}
              max={400}
              step={10}
              className="w-full"
          />
          <div className="flex justify-between">
            <span className={`text-[10px] ${TX.muted}`}>KES 40</span>
            <span className="text-amber-400 font-bold font-mono text-base">
            KES {price}/hr
          </span>
            <span className={`text-[10px] ${TX.muted}`}>KES 400</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <label className={`${T.label} ${TX.secondary}`}>
            Override Reason (logged)
          </label>
          <Select onValueChange={setReason}>
            <SelectTrigger
                className={`bg-white/[0.05] ${BD.default} ${TX.secondary} text-xs h-10`}
            >
              <SelectValue placeholder="Select reason…" />
            </SelectTrigger>
            <SelectContent className="bg-[#111316] border-white/10">
              {[
                "Traffic incident nearby",
                "Special event in zone",
                "AI confidence too low",
                "Policy directive",
                "Sensor data unreliable",
                "Other",
              ].map((r) => (
                  <SelectItem
                      key={r}
                      value={r}
                      className={`text-xs ${TX.secondary} focus:bg-white/10 focus:text-white`}
                  >
                    {r}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {price > (zone.aiPrice ?? zone.currentPrice) * 1.5 && (
            <div className="flex gap-3 items-start rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                High price may increase congestion as drivers continue searching for
                cheaper alternatives.
              </p>
            </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <Button
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-bold h-11 text-sm gap-2 transition-all"
              disabled={!reason || applying}
              onClick={handleApply}
          >
            <Shield className="w-4 h-4" />
            {applying ? "Applying…" : "Apply Override"}
          </Button>
          <Button
              variant="outline"
              className={`${BD.default} ${TX.muted} hover:bg-white/[0.05] hover:text-white h-11 transition-all`}
              onClick={onClose}
          >
            Cancel
          </Button>
        </div>

        <p className={`text-[10px] ${TX.muted} text-center`}>
          Override persists until manually reset · Action will be logged
        </p>
      </div>
  );
}




// AFTER — top-level function, above SmartParkingDashboard
function OverrideSheet({
                         zone,
                         open,
                         onOpenChange,
                         trigger,
                         overrideZone,
                         onClose,
                         onZoneUpdated,
                         onSuccess,
                       }: {
  zone: Zone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  overrideZone: Zone | null;
  onClose: () => void;
  onZoneUpdated: (id: string, updates: Partial<Zone>) => Promise<void>;
  onSuccess: () => void;
}) {
  return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
            side="right"
            className="w-[420px] bg-[#111316] border-l border-white/10 text-white overflow-y-auto"
        >
          <SheetHeader className="px-1 pt-1 pb-0">
            <SheetTitle className="text-white flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-amber-400" />
              Manual Override
            </SheetTitle>
          </SheetHeader>
          {overrideZone && (
              <OverridePanel
                  zone={overrideZone}
                  onClose={onClose}
                  onZoneUpdated={onZoneUpdated}
                  onSuccess={onSuccess}
              />
          )}
        </SheetContent>
      </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════ */

export default function SmartParkingDashboard() {
  const [aiMode, setAiMode] = useState<AIMode>("operator");
  const {
    zones,
    selectedZone,
    setSelectedZone,
    recommendations,
    auditLogs,
    loading,
    error,
    refresh,
    updateZone,
    approveRecommendation,
    rejectRecommendation,
  } = useParking();

  const [overrideZone, setOverrideZone] = useState<Zone | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(() =>
      new Date().toLocaleTimeString()
  );
  const [loadingAction, setLoadingAction] = useState<{
    [key: string]: "approve" | "reject" | null | undefined;
  }>({});

  const pendingRecs = recommendations.filter((r) => r.status === "pending");
  const criticalZones = zones.filter((z) => z.status === "critical");
  const totalOccupied = zones.reduce((s, z) => s + z.occupied, 0);
  const totalCapacity = zones.reduce((s, z) => s + z.capacity, 0);
  const systemOccupPct = totalCapacity
      ? Math.round((totalOccupied / totalCapacity) * 100)
      : 0;

  const handleApprove = async (id: string) => {
    if (loadingAction[id]) return;
    setLoadingAction((prev) => ({ ...prev, [id]: "approve" }));
    try {
      await approveRecommendation(id);
      setLastUpdated(new Date().toLocaleTimeString());
      toast.success("Recommendation approved", { duration: 3000 });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      toast.error(errorMsg);
      if (errorMsg.includes("already processed")) {
        await refresh();
        toast("Data refreshed");
      }
    } finally {
      setLoadingAction((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleReject = async (id: string) => {
    if (loadingAction[id]) return;
    setLoadingAction((prev) => ({ ...prev, [id]: "reject" }));
    try {
      await rejectRecommendation(id);
      setLastUpdated(new Date().toLocaleTimeString());
      toast.success("Recommendation rejected", { duration: 3000 });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      toast.error(errorMsg);
      if (errorMsg.includes("already processed")) {
        await refresh();
        toast("Data refreshed");
      }
    } finally {
      setLoadingAction((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleModify = (id: string) => {
    const rec = recommendations.find((r) => r.id === id);
    if (rec) setOverrideZone(zones.find((z) => z.id === rec.zoneId) ?? null);
  };

  /* ── Loading / Error states ── */

  if (loading) {
    return (
        <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <span className={`${T.label} ${TX.muted}`}>
            Loading parking data…
          </span>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className={T.body}>Error: {error}</span>
          </div>
        </div>
    );
  }

  if (!selectedZone) return null;

  /* ── Reusable override sheet wrapper ── */

  return (
      <TooltipProvider delayDuration={300}>
        <Toaster position="top-right" />
        <div
            className="min-h-screen bg-[#0d0f12] text-white"
            style={{ fontFamily: "'DM Mono', 'JetBrains Mono', monospace" }}
        >
          {/* Scanline texture */}
          <div
              className="pointer-events-none fixed inset-0 z-0 opacity-[0.012]"
              style={{
                backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)",
              }}
          />

          {/* ══════════════════════════════════════════════════════════════
            TOP BAR
            Added: AIRecommendationsDropdown between AI mode toggle and Bell
        ══════════════════════════════════════════════════════════════ */}
          <header
              className={`relative z-10 h-16 border-b ${BD.subtle} bg-[#0d0f12]/95 backdrop-blur-md flex items-center px-5 gap-4`}
          >
            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center">
                <Car className="w-4 h-4 text-cyan-400" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#0d0f12] animate-pulse" />
              </div>
              <div>
                <div className={`${T.label} ${TX.primary}`}>ParkControl</div>
                <div className="text-[10px] tracking-widest text-white/30 uppercase">
                  Nairobi City Authority
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-white/10 mx-1" />

            {/* Live indicator */}
            <div className={`flex items-center gap-1.5 text-[11px] ${TX.muted}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400/80 font-semibold tracking-widest">
              LIVE
            </span>
              <span className="text-white/15">·</span>
              <Clock className="w-3 h-3" />
              <span>{lastUpdated}</span>
            </div>

            <div className="flex-1" />

            {/* AI mode toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                    onClick={() =>
                        setAiMode((m) => (m === "assisted" ? "operator" : "assisted"))
                    }
                    className={[
                      "flex items-center gap-2 px-4 py-2 rounded-lg border",
                      "text-[11px] font-bold tracking-wide transition-all duration-300",
                      aiMode === "assisted"
                          ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/15"
                          : "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15",
                    ].join(" ")}
                >
                  {aiMode === "assisted" ? (
                      <>
                        <ToggleRight className="w-4 h-4" /> AI ASSISTED
                      </>
                  ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" /> OPERATOR CTRL
                      </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                  side="bottom"
                  className="bg-zinc-800 border-white/10 text-xs text-white/80"
              >
                {aiMode === "assisted"
                    ? "🟢 AI may auto-adjust within limits"
                    : "🔴 All AI suggestions require manual approval"}
              </TooltipContent>
            </Tooltip>

            {/*
            ─── AI RECOMMENDATIONS DROPDOWN TRIGGER ───
            Positioned between the AI mode toggle and the Bell button.
            Provides hover tooltip + click dropdown for AI insights,
            keeping the right panel free for dedicated persistent use.
          */}
            <AIRecommendationsDropdown
                recommendations={recommendations}
                onApprove={handleApprove}
                onModify={handleModify}
                onReject={handleReject}
                loadingAction={loadingAction}
                aiMode={aiMode}
            />

            {/* Bell */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`relative h-9 w-9 ${TX.muted} hover:text-white hover:bg-white/6`}
                >
                  <Bell className="w-4 h-4" />
                  {pendingRecs.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-800 border-white/10 text-xs">
                {pendingRecs.length} pending recommendation
                {pendingRecs.length !== 1 ? "s" : ""}
              </TooltipContent>
            </Tooltip>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-9 gap-2 ${TX.muted} hover:text-white hover:bg-white/6 text-[11px]`}
                >
                  <User className="w-3.5 h-3.5" />
                  Lucy.Njeri
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                  align="end"
                  className="bg-[#111316] border-white/10 w-48"
              >
                <DropdownMenuLabel className={`text-[10px] ${TX.muted}`}>
                  Traffic Operator
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                    className={`text-xs ${TX.secondary} focus:bg-white/6 focus:text-white gap-2`}
                >
                  <Settings className="w-3.5 h-3.5" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                    className={`text-xs ${TX.secondary} focus:bg-white/[0.06] focus:text-white gap-2`}
                >
                  <History className="w-3.5 h-3.5" /> Audit Log
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* ══════════════════════════════════════════════════════════════
            MAIN 3-COLUMN LAYOUT
        ══════════════════════════════════════════════════════════════ */}
          <main className="relative z-10 flex h-[calc(100vh-64px)]">

            {/* ══════════════════════════════════════════════════════════
              LEFT SIDEBAR — ZONE OVERVIEW

              Changes:
              - Removed outer py-4 px-3 that created double-padding with header
              - Header: now flush to top, consistent px-5 py-4
              - Summary block: status pills with gap-3, w-2 h-2 dots (up from w-1.5)
              - Zone list: px-4 py-3 on scroll container (was p-3)
              - ZoneMapCell: pl-8 inset alignment on rows 2-4
          ══════════════════════════════════════════════════════════ */}
            <aside
                className={`w-80 xl:w-96 shrink-0 border-r ${BD.subtle} flex flex-col`}
            >
              {/* Sidebar header */}
              <div
                  className={`px-5 py-4 border-b ${BD.subtle} flex items-center justify-between`}
              >
                <div className="flex items-center gap-2.5">
                  <Map className="w-4 h-4 text-white/40" />
                  <span className={`${T.label} ${TX.secondary}`}>
                  Zone Overview
                </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${TX.muted} hover:text-white hover:bg-white/[0.06]`}
                        onClick={async () => {
                          await refresh();
                          setLastUpdated(new Date().toLocaleTimeString());
                        }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-800 border-white/10 text-xs">
                    Refresh zones
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* System-wide occupancy summary
                Improvement: status pills get larger dots + more vertical gap  */}
              <div className={`px-5 py-5 border-b ${BD.subtle} space-y-4`}>
                <div className="flex justify-between items-baseline">
                <span className={`text-[11px] ${TX.muted}`}>
                  System-wide occupancy
                </span>
                  <span className={`${T.mono} ${TX.primary} font-bold`}>
                  {systemOccupPct}%
                </span>
                </div>
                <Progress value={systemOccupPct} className="h-2 bg-white/[0.08]" />

                {/*
                Status summary pills — gap-3 (was gap-4) lets each pill breathe.
                w-2 h-2 dot (was w-1.5) for clearer scanability.
              */}
                <div className="flex gap-3 flex-wrap">
                  <div
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.06] text-[11px] text-red-400`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    {criticalZones.length} Critical
                  </div>
                  <div
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] text-[11px] text-amber-400`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    {zones.filter((z) => z.status === "high").length} High
                  </div>
                  <div
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] text-[11px] text-emerald-400`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    {zones.filter((z) => z.status === "low").length} Low
                  </div>
                </div>
              </div>

              {/* Zone list — px-4 py-3 on the inner container (was p-3) */}
              <ScrollArea className="flex-1">
                <div className="px-4 py-3 space-y-3">
                  {zones.map((zone) => (
                      <ZoneMapCell
                          key={zone.id}
                          zone={zone}
                          selected={selectedZone.id === zone.id}
                          onClick={() => setSelectedZone(zone)}
                      />
                  ))}
                </div>
              </ScrollArea>
            </aside>

            {/* ══════════════════════════════════════════════════════════
              CENTER — ZONE DETAIL + TABS
          ══════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Zone detail header */}
              <div
                  className={`px-6 py-5 border-b ${BD.subtle} flex items-start justify-between gap-4`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                      className={`mt-1 w-2.5 h-2.5 rounded-full ${statusConfig[selectedZone.status].dot} animate-pulse shrink-0`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1
                          className={`text-lg font-bold ${TX.primary} tracking-tight`}
                      >
                        {selectedZone.name}
                      </h1>
                      <Badge
                          variant="outline"
                          className={`text-[10px] ${statusConfig[selectedZone.status].color} border-current`}
                      >
                        {statusConfig[selectedZone.status].label}
                      </Badge>
                      {selectedZone.locked && (
                          <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/50 text-amber-400"
                          >
                            <Lock className="w-2.5 h-2.5 mr-1" /> Locked
                          </Badge>
                      )}
                      {selectedZone.aiDisabled && (
                          <Badge
                              variant="outline"
                              className="text-[10px] border-red-500/50 text-red-400"
                          >
                            <ShieldOff className="w-2.5 h-2.5 mr-1" /> AI Off
                          </Badge>
                      )}
                    </div>
                    <div
                        className={`flex items-center gap-1.5 mt-1 text-xs ${TX.muted}`}
                    >
                      <MapPin className="w-3 h-3" />
                      {selectedZone.location}
                    </div>
                  </div>
                </div>

                {/* Zone action buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <OverrideSheet
                      zone={selectedZone}
                      open={overrideZone?.id === selectedZone.id}
                      onOpenChange={(o) => !o && setOverrideZone(null)}
                      overrideZone={overrideZone}
                      onClose={() => setOverrideZone(null)}
                      onZoneUpdated={updateZone}
                      onSuccess={() => setLastUpdated(new Date().toLocaleTimeString())}
                      trigger={
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-9 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/60 gap-1.5 transition-all"
                            onClick={() => setOverrideZone(selectedZone)}
                        >
                          <Shield className="w-3.5 h-3.5" /> Override
                        </Button>
                      }
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                          size="sm"
                          variant="outline"
                          className={`h-9 text-xs ${BD.default} ${TX.muted} hover:bg-white/[0.06] hover:text-white gap-1.5 transition-all`}
                      >
                        <Settings className="w-3.5 h-3.5" /> Zone Controls
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="bg-[#111316] border-white/10 w-52"
                    >
                      <DropdownMenuLabel className={`text-[10px] ${TX.muted}`}>
                        Zone Actions
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                          className={`text-xs ${TX.secondary} focus:bg-white/[0.06] focus:text-white gap-2`}
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" /> Lock Zone
                        Price
                      </DropdownMenuItem>
                      <DropdownMenuItem
                          className={`text-xs ${TX.secondary} focus:bg-white/[0.06] focus:text-white gap-2`}
                      >
                        <ShieldOff className="w-3.5 h-3.5 text-red-400" />{" "}
                        Disable AI for Zone
                      </DropdownMenuItem>
                      <DropdownMenuItem
                          className={`text-xs ${TX.secondary} focus:bg-white/[0.06] focus:text-white gap-2`}
                      >
                        <Navigation className="w-3.5 h-3.5 text-cyan-400" />{" "}
                        Redirect Demand
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem className="text-xs text-red-400 focus:bg-red-500/[0.06] gap-2">
                        <Zap className="w-3.5 h-3.5" /> Emergency Close Zone
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* ── KPI STRIP ── */}
              <div
                  className={`px-6 py-4 border-b ${BD.subtle} grid grid-cols-5 gap-4`}
              >
                {[
                  {
                    label: "Occupancy",
                    value: `${occupancyPct(selectedZone)}%`,
                    sub: `${selectedZone.occupied} / ${selectedZone.capacity} spaces`,
                    icon: Gauge,
                    color: statusConfig[selectedZone.status].color,
                  },
                  {
                    label: "Current Price",
                    value: `KES ${selectedZone.currentPrice}`,
                    sub: "per hour",
                    icon: Activity,
                    color: TX.primary,
                  },
                  {
                    label: "AI Suggestion",
                    value: selectedZone.aiPrice
                        ? `KES ${selectedZone.aiPrice}`
                        : "—",
                    sub: selectedZone.aiDisabled ? "AI disabled" : "recommended",
                    icon: Brain,
                    color: "text-cyan-400",
                  },
                  {
                    label: "30-min Forecast",
                    value: `${selectedZone.forecast30}%`,
                    sub: "predicted occupancy",
                    icon: TrendingUp,
                    color:
                        selectedZone.forecast30 >= 90
                            ? "text-red-400"
                            : "text-emerald-400",
                  },
                  {
                    label: "120-min Forecast",
                    value: `${selectedZone.forecast120}%`,
                    sub: "predicted occupancy",
                    icon: BarChart3,
                    color:
                        selectedZone.forecast120 >= 90
                            ? "text-red-400"
                            : "text-amber-400",
                  },
                ].map((kpi) => (
                    <div
                        key={kpi.label}
                        className={`rounded-xl border ${BD.default} bg-white/[0.04] p-4`}
                    >
                      <div className="flex items-center justify-between mb-2">
                    <span
                        className={`text-[11px] ${TX.muted} tracking-wide uppercase`}
                    >
                      {kpi.label}
                    </span>
                        <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                      </div>
                      <div className={`${T.hero} ${kpi.color}`}>{kpi.value}</div>
                      <div className={`text-[11px] ${TX.muted} mt-1`}>
                        {kpi.sub}
                      </div>
                    </div>
                ))}
              </div>

              {/* ── TABS ── */}
              <Tabs
                  defaultValue="forecast"
                  className="flex-1 flex flex-col overflow-hidden"
              >
                <div className={`px-6 pt-4 border-b ${BD.subtle}`}>
                  <TabsList
                      className={`bg-white/[0.04] border ${BD.default} h-10 p-1 gap-1 rounded-xl w-full`}
                  >
                    {[
                      {
                        value: "forecast",
                        label: "Demand Forecast",
                        icon: TrendingUp,
                      },
                      { value: "zones", label: "All Zones", icon: Map },
                      { value: "audit", label: "Audit Log", icon: History },
                    ].map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className={[
                              "h-8 px-4 text-xs rounded-lg flex items-center gap-2",
                              "transition-all duration-200",
                              TX.muted,
                              "data-[state=active]:bg-white/[0.10]",
                              "data-[state=active]:text-white",
                              "data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(34,211,238,0.5)]",
                              "hover:text-white/60 hover:bg-white/[0.04]",
                            ].join(" ")}
                        >
                          <tab.icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* ══════════════════════════════════════════════════════
                  FORECAST TAB — redesigned with shadcn BarChart

                  Left card: grouped multi-series bar chart showing
                  Now / +30m / +60m / +120m for all zones simultaneously.
                  Selected zone's bars are at full opacity; others dimmed.

                  Right card: all-zones occupancy bar list (unchanged).
              ══════════════════════════════════════════════════════ */}
                <TabsContent
                    value="forecast"
                    className="flex-1 overflow-auto p-6"
                >
                  <div className="flex flex-col gap-0">

                    {/* ── CARD 1: Grouped bar chart ── */}
                    <div className="rounded-t-2xl border border-white/[0.05] bg-white/[0.025] px-6 pt-5 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className={`text-xs ${TX.secondary} font-semibold tracking-widest uppercase flex items-center gap-2`}>
                          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                          Occupancy Forecast — All Zones
                        </div>
                        <span className={`text-[11px] ${TX.muted}`}>
          Highlighted ·{" "}
                          <span className="text-cyan-400/60">{selectedZone.name}</span>
        </span>
                      </div>

                      {/* Hairline divider */}
                      <div className="h-px bg-white/[0.05] my-4" />

                      <ForecastBarChart selectedZone={selectedZone} zones={zones} />

                      {selectedZone.forecast30 >= 90 && (
                          <div className="mt-4 flex gap-2.5 items-center rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                            <p className="text-xs text-red-300/70 leading-relaxed">
                              Zone predicted to reach capacity within 30 minutes.
                              Immediate action recommended.
                            </p>
                          </div>
                      )}
                    </div>

                    {/* Seamless join — shared border between cards */}
                    <div className="border-x border-white/[0.05] h-px bg-white/[0.03]" />

                    {/* ── CARD 2: All zones mini-bars ── */}
                    <div className="rounded-b-2xl border border-t-0 border-white/[0.05] bg-white/[0.015] px-6 pt-5 pb-6">
                      <div className={`text-xs ${TX.secondary} font-semibold tracking-widest uppercase flex items-center gap-2 mb-4`}>
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        All Zones — Now
                      </div>

                      {/* Grid of zone bars — 2 cols to use horizontal space */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        {zones.map((zone) => {
                          const pct = occupancyPct(zone);
                          const cfg = statusConfig[zone.status];
                          const isSelected = zone.id === selectedZone.id;
                          return (
                              <button
                                  key={zone.id}
                                  className={[
                                    "space-y-1.5 text-left rounded-lg px-2 py-1.5 transition-colors w-full",
                                    isSelected ? "bg-white/[0.03]" : "hover:bg-white/[0.02]",
                                  ].join(" ")}
                                  onClick={() => setSelectedZone(zone)}
                              >
                                <div className="flex justify-between items-baseline text-xs">
                <span className={isSelected ? TX.primary : TX.secondary}>
                  {zone.name}
                </span>
                                  <span className={`font-mono font-bold text-[11px] ${cfg.color}`}>
                  {pct}%
                </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                  <div
                                      className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                                      style={{
                                        width: `${pct}%`,
                                        opacity: isSelected ? 1 : 0.55,
                                      }}
                                  />
                                </div>
                              </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </TabsContent>

                {/* ALL ZONES TAB */}
                <TabsContent
                    value="zones"
                    className="flex-1 overflow-auto px-6 pb-6 pt-5"
                >
                  <div
                      className={`rounded-xl border ${BD.default} overflow-hidden`}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          {[
                            "Zone",
                            "Location",
                            "Occupancy",
                            "Current Price",
                            "AI Price",
                            "30-min",
                            "Status",
                            "AI State",
                            "",
                          ].map((h) => (
                              <TableHead
                                  key={h}
                                  className={`text-[10px] tracking-widest ${TX.muted} uppercase bg-white/[0.04] font-semibold h-11`}
                              >
                                {h}
                              </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {zones.map((zone) => {
                          const pct = occupancyPct(zone);
                          const cfg = statusConfig[zone.status];
                          return (
                              <TableRow
                                  key={zone.id}
                                  className={[
                                    "border-white/[0.08] hover:bg-white/[0.04] cursor-pointer transition-colors",
                                    selectedZone.id === zone.id
                                        ? "bg-cyan-500/[0.06]"
                                        : "",
                                  ].join(" ")}
                                  onClick={() => setSelectedZone(zone)}
                              >
                                <TableCell
                                    className={`text-xs font-mono font-bold ${TX.secondary} py-4`}
                                >
                                  {zone.id}
                                </TableCell>
                                <TableCell className={`text-xs ${TX.muted}`}>
                                  {zone.location}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                  <span
                                      className={`font-bold font-mono ${cfg.color}`}
                                  >
                                    {pct}%
                                  </span>
                                      <span className={TX.muted}>
                                    {zone.occupied}/{zone.capacity}
                                  </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-white/[0.08] w-20 overflow-hidden">
                                      <div
                                          className={`h-full rounded-full ${cfg.bar}`}
                                          style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell
                                    className={`text-xs font-mono ${TX.secondary}`}
                                >
                                  KES {zone.currentPrice}
                                </TableCell>
                                <TableCell className="text-xs font-mono text-cyan-400">
                                  {zone.aiPrice ? (
                                      `KES ${zone.aiPrice}`
                                  ) : (
                                      <span className={TX.muted}>—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs font-mono">
                              <span
                                  className={
                                    zone.forecast30 >= 90
                                        ? "text-red-400"
                                        : zone.forecast30 >= 70
                                            ? "text-amber-400"
                                            : "text-emerald-400"
                                  }
                              >
                                {zone.forecast30}%
                              </span>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                      variant="outline"
                                      className={`text-[10px] ${cfg.color} border-current`}
                                  >
                                    {cfg.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {zone.aiDisabled ? (
                                      <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                                        <ShieldOff className="w-3 h-3" /> Off
                                      </div>
                                  ) : (
                                      <div className="flex items-center gap-1.5 text-[11px] text-cyan-400">
                                        <Brain className="w-3 h-3" /> Active
                                      </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <OverrideSheet
                                      zone={selectedZone}
                                      open={overrideZone?.id === selectedZone.id}
                                      onOpenChange={(o) => !o && setOverrideZone(null)}
                                      overrideZone={overrideZone}
                                      onClose={() => setOverrideZone(null)}
                                      onZoneUpdated={updateZone}
                                      onSuccess={() => setLastUpdated(new Date().toLocaleTimeString())}
                                      trigger={
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2.5 text-[11px] text-amber-400 hover:bg-amber-500/10 gap-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOverrideZone(zone);
                                            }}
                                        >
                                          <Edit3 className="w-3 h-3" /> Override
                                        </Button>
                                      }
                                  />
                                </TableCell>
                              </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* AUDIT LOG TAB */}
                <TabsContent
                    value="audit"
                    className="flex-1 overflow-auto px-6 pb-6 pt-5"
                >
                  <div
                      className={`rounded-xl border ${BD.default} overflow-hidden`}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          {[
                            "Log ID",
                            "Time",
                            "Operator",
                            "Zone",
                            "AI Suggested",
                            "Final Action",
                            "Outcome",
                          ].map((h) => (
                              <TableHead
                                  key={h}
                                  className={`text-[10px] tracking-widest ${TX.muted} uppercase bg-white/[0.04] font-semibold h-11`}
                              >
                                {h}
                              </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                            <TableRow
                                key={log.id}
                                className="border-white/[0.08] hover:bg-white/[0.04]"
                            >
                              <TableCell
                                  className={`text-[10px] font-mono ${TX.muted} py-4`}
                              >
                                {log.id}
                              </TableCell>
                              <TableCell
                                  className={`text-xs font-mono ${TX.muted}`}
                              >
                                {log.time}
                              </TableCell>
                              <TableCell className={`text-xs ${TX.secondary}`}>
                                {log.operator}
                              </TableCell>
                              <TableCell className={`text-xs ${TX.secondary}`}>
                                {log.zone}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-cyan-400/70">
                                {log.aiSuggestion}
                              </TableCell>
                              <TableCell className={`text-xs ${TX.secondary}`}>
                                {log.finalAction}
                              </TableCell>
                              <TableCell>
                                <Badge
                                    variant="outline"
                                    className={[
                                      "text-[10px] capitalize flex items-center gap-1",
                                      log.type === "approved"
                                          ? "border-emerald-500/40 text-emerald-400"
                                          : log.type === "overridden"
                                              ? "border-amber-500/40 text-amber-400"
                                              : "border-red-500/40 text-red-400",
                                    ].join(" ")}
                                >
                                  {log.type === "approved" && (
                                      <Check className="w-2.5 h-2.5" />
                                  )}
                                  {log.type === "overridden" && (
                                      <Edit3 className="w-2.5 h-2.5" />
                                  )}
                                  {log.type === "rejected" && (
                                      <X className="w-2.5 h-2.5" />
                                  )}
                                  {log.type}
                                </Badge>
                              </TableCell>
                            </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className={`text-[10px] ${TX.muted} mt-4 text-center`}>
                    All operator actions are logged and auditable · Showing last 5
                    entries
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* ══════════════════════════════════════════════════════════
              RIGHT PANEL — AI RECOMMENDATIONS (persistent panel)

              This panel remains as a persistent right sidebar providing
              always-visible AI state. The header-level dropdown is an
              additional entry point, not a replacement.
          ══════════════════════════════════════════════════════════ */}



            {/*
            <aside
                className={`w-[340px] xl:w-[380px] shrink-0 border-l ${BD.subtle} flex flex-col`}
            >

              <div
                  className={`px-5 py-4 border-b ${BD.subtle} flex items-center justify-between`}
              >
                <div className="flex items-center gap-2.5">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <span className={`${T.label} ${TX.secondary}`}>
                  AI Recommendations
                </span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingRecs.length > 0 && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] h-5 px-1.5">
                        {pendingRecs.length}
                      </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${TX.muted} hover:text-white hover:bg-white/[0.06]`}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-800 border-white/10 text-xs max-w-48">
                      AI recommendations require operator approval in current
                      mode. Override any decision instantly.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>


              <div
                  className={[
                    "mx-4 mt-4 mb-1 rounded-xl px-4 py-3 flex items-center gap-2.5 border",
                    "transition-all duration-300",
                    aiMode === "assisted"
                        ? "bg-cyan-500/[0.08] border-cyan-500/20"
                        : "bg-amber-500/[0.08] border-amber-500/20",
                  ].join(" ")}
              >
                {aiMode === "assisted" ? (
                    <>
                      <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-[11px] text-cyan-300/80 leading-relaxed">
                    AI Assisted — auto-adjusts within operator-defined limits.
                  </span>
                    </>
                ) : (
                    <>
                      <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-amber-300/80 leading-relaxed">
                    Operator Control — all AI actions require your approval.
                  </span>
                    </>
                )}
              </div>


              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {recommendations.map((rec) => (
                      <RecommendationCard
                          key={rec.id}
                          rec={rec}
                          onApprove={handleApprove}
                          onModify={handleModify}
                          onReject={handleReject}
                          isLoading={!!loadingAction[rec.id]}
                      />
                  ))}
                </div>
              </ScrollArea>


              <div className={`border-t ${BD.subtle} px-5 py-4 space-y-3`}>
                <div className={`${T.label} ${TX.muted}`}>AI Performance</div>
                <div className="space-y-2.5">
                  {[
                    { label: "Recommendation adoption", value: 72 },
                    { label: "Forecast accuracy", value: 84 },
                    { label: "Operator trust score", value: 81 },
                  ].map((m) => (
                      <div key={m.label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className={TX.muted}>{m.label}</span>
                          <span className={`${TX.secondary} font-mono`}>
                        {m.value}%
                      </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                          <div
                              className="h-full rounded-full bg-cyan-500/60 transition-all duration-500"
                              style={{ width: `${m.value}%` }}
                          />
                        </div>
                      </div>
                  ))}
                </div>
              </div>
            </aside>
          **/}
          </main>
        </div>
      </TooltipProvider>
  );
}