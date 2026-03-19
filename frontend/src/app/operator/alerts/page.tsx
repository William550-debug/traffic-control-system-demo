"use client";

import React, { useCallback, useId, useState } from "react";
import { useAlerts }         from "@/hooks/use-alerts";
import { useAlertHistory }   from "@/hooks/use-alert-history";
import { AlertPanel }        from "@/components/alerts/alert-panel";
import { AlertDrawer }       from "@/components/alerts/alert-drawer";
import { AlertHistoryTable } from "@/components/alerts/alert-history-table";
import { VirtualAlertList }  from "@/components/alerts/visual-alert-list";
import { ModeControls }      from "@/components/modes/mode-controls";
import {
    Bell,
    History,
    RefreshCw,
    SlidersHorizontal,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import type { Alert }              from "@/types";
import type { AlertHistoryStatus } from "@/hooks/use-alert-history";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab           = "active" | "history";
type HistoryStatusFilter = AlertHistoryStatus | "all";
type SeverityFilter      = Alert["severity"] | "all";

// ─── Tab config ───────────────────────────────────────────────────────────────

const TAB_CONFIG = {
    active:  { label: "Active",  Icon: Bell    },
    history: { label: "History", Icon: History },
} as const;

// ─── Filter chip configs ──────────────────────────────────────────────────────

const STATUS_CHIPS: {
    value:    HistoryStatusFilter;
    label:    string;
    color:    string;
    activeBg: string;
}[] = [
    { value: "all",       label: "All",       color: "var(--text-muted)",       activeBg: "rgba(255,255,255,0.07)"   },
    { value: "resolved",  label: "Resolved",  color: "var(--status-online)",    activeBg: "rgba(34,197,94,0.08)"    },
    { value: "ignored",   label: "Ignored",   color: "var(--text-muted)",       activeBg: "rgba(74,90,110,0.15)"    },
    { value: "escalated", label: "Escalated", color: "var(--accent-secondary)", activeBg: "rgba(124,106,247,0.1)"   },
];

const SEVERITY_CHIPS: {
    value: SeverityFilter;
    label: string;
    color: string;
}[] = [
    { value: "all",      label: "All",      color: "var(--text-muted)"        },
    { value: "critical", label: "Critical", color: "var(--severity-critical)" },
    { value: "high",     label: "High",     color: "var(--severity-high)"     },
    { value: "medium",   label: "Medium",   color: "var(--severity-medium)"   },
    { value: "low",      label: "Low",      color: "var(--severity-low)"      },
    { value: "info",     label: "Info",     color: "var(--severity-info)"     },
];

// ─── Shared FilterChip ────────────────────────────────────────────────────────

function FilterChip({
                        label, active, color, activeBg, onClick, dot,
                    }: {
    label:     string;
    active:    boolean;
    color:     string;
    activeBg?: string;
    onClick:   () => void;
    dot?:      boolean;
}) {
    return (
        <button
            onClick={onClick}
            aria-pressed={active}
            className="flex items-center gap-[5px] rounded-lg transition-all duration-150 shrink-0"
            style={{
                height:        26,
                padding:       "0 9px",
                background:    active ? (activeBg ?? `${color}18`) : "transparent",
                border:        `1px solid ${active ? `${color}50` : "var(--border-default)"}`,
                fontFamily:    "var(--font-mono)",
                fontSize:      "clamp(0.52rem, 0.45rem + 0.2vw, 0.6rem)",
                fontWeight:    active ? 700 : 500,
                letterSpacing: "0.05em",
                color:         active ? color : "var(--text-muted)",
                cursor:        "pointer",
                outline:       "none",
                boxShadow:     active && color !== "var(--text-muted)"
                    ? `0 0 5px ${color}22`
                    : "none",
            }}
        >
            {dot && active && color !== "var(--text-muted)" && (
                <span style={{
                    display:      "inline-block",
                    width:        4,
                    height:       4,
                    borderRadius: "50%",
                    background:   color,
                    boxShadow:    `0 0 3px ${color}`,
                    flexShrink:   0,
                }} />
            )}
            {label}
        </button>
    );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
                    active, onChange, counts, tabId, panelId,
                }: {
    active:   ActiveTab;
    onChange: (t: ActiveTab) => void;
    counts:   { active: number; history: number };
    tabId:    (t: ActiveTab) => string;
    panelId:  (t: ActiveTab) => string;
}) {
    return (
        <div
            role="tablist"
            aria-label="Alert views"
            className="flex w-full rounded-xl p-[3px] gap-[3px]"
            style={{
                background: "var(--bg-elevated)",
                border:     "1px solid var(--border-default)",
            }}
        >
            {(["active", "history"] as ActiveTab[]).map((tab) => {
                const isActive        = active === tab;
                const { label, Icon } = TAB_CONFIG[tab];
                const count           = counts[tab];
                const hasAlerts       = tab === "active" && count > 0;

                return (
                    <button
                        key={tab}
                        role="tab"
                        id={tabId(tab)}
                        aria-controls={panelId(tab)}
                        aria-selected={isActive}
                        onClick={() => onChange(tab)}
                        className="relative flex flex-1 items-center justify-center gap-2 rounded-[9px] transition-all duration-200 outline-none select-none cursor-pointer"
                        style={{
                            height:     "clamp(32px, 2.8vw, 40px)",
                            border:     "none",
                            background: isActive ? "var(--bg-overlay)" : "transparent",
                            boxShadow:  isActive
                                ? "0 1px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)"
                                : "none",
                        }}
                    >
                        {/* Accent hairline */}
                        {isActive && (
                            <span
                                aria-hidden="true"
                                style={{
                                    position:     "absolute",
                                    top:          0,
                                    left:         "25%",
                                    right:        "25%",
                                    height:       1.5,
                                    background:   "var(--accent-primary)",
                                    borderRadius: "0 0 999px 999px",
                                    opacity:      0.7,
                                    filter:       "blur(2px)",
                                }}
                            />
                        )}

                        <Icon
                            size={12}
                            strokeWidth={isActive ? 2.5 : 2}
                            style={{
                                color:      isActive ? "var(--accent-primary)" : "var(--text-disabled)",
                                flexShrink: 0,
                                transition: "color 200ms ease",
                            }}
                        />

                        <span style={{
                            fontFamily:    "var(--font-mono)",
                            fontSize:      "clamp(0.62rem, 0.5rem + 0.4vw, 0.76rem)",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            fontWeight:    isActive ? 700 : 500,
                            color:         isActive ? "var(--text-primary)" : "var(--text-muted)",
                            whiteSpace:    "nowrap",
                            lineHeight:    1,
                            transition:    "color 200ms ease",
                        }}>
                            {label}
                        </span>

                        <Badge
                            variant="outline"
                            className="leading-none shrink-0 h-[17px] px-[7px]"
                            style={{
                                fontFamily:   "var(--font-mono)",
                                fontSize:     "clamp(0.42rem, 0.36rem + 0.2vw, 0.54rem)",
                                fontWeight:   700,
                                letterSpacing:"0.06em",
                                background:   isActive ? "rgba(59,158,255,0.15)" : "rgba(255,255,255,0.04)",
                                borderColor:  isActive ? "rgba(59,158,255,0.4)"  : "var(--border-default)",
                                color:        isActive ? "var(--accent-primary)" : "var(--text-muted)",
                                borderRadius: "99px",
                                transition:   "all 200ms ease",
                                boxShadow:    isActive && hasAlerts ? "0 0 5px rgba(59,158,255,0.2)" : "none",
                                minWidth:     "24px",
                                textAlign:    "center",
                            }}
                        >
                            {count}
                        </Badge>

                        {tab === "active" && hasAlerts && (
                            <span
                                aria-hidden="true"
                                style={{
                                    position:     "absolute",
                                    top:          6,
                                    right:        10,
                                    width:        4,
                                    height:       4,
                                    borderRadius: "50%",
                                    background:   "var(--severity-high)",
                                    boxShadow:    "0 0 4px var(--severity-high)",
                                    animation:    "pulse-dot 1.5s ease infinite",
                                }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ─── History filter bar ───────────────────────────────────────────────────────
/*
 * Two-row chip layout — no Select dropdowns.
 *
 * Row A (always visible):
 *   "Status" label · 4 status chips · divider · Severity toggle · Clear · Refresh
 *
 * Row B (collapsible, slides in):
 *   "Severity" label · 6 severity chips
 *   Auto-collapses when a specific severity is chosen.
 */

function HistoryFilterBar({
                              status, severity, onStatusChange, onSeverityChange, onRefetch,
                          }: {
    status:           HistoryStatusFilter;
    severity:         SeverityFilter;
    onStatusChange:   (v: HistoryStatusFilter) => void;
    onSeverityChange: (v: SeverityFilter)       => void;
    onRefetch:        () => void;
}) {
    const [showSeverity, setShowSeverity] = useState(false);

    const hasFilters        = status !== "all" || severity !== "all";
    const activeFilterCount = (status !== "all" ? 1 : 0) + (severity !== "all" ? 1 : 0);

    return (
        <div
            className="flex flex-col shrink-0"
            style={{
                background:   "var(--bg-elevated)",
                borderBottom: "1px solid var(--border-default)",
            }}
        >
            {/* ── Row A: status chips + severity toggle + actions ── */}
            <div className="flex items-center gap-2 px-4 py-[9px] flex-wrap">

                {/* Section label */}
                <span style={{
                    fontFamily:    "var(--font-mono)",
                    fontSize:      "0.5rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color:         "var(--text-disabled)",
                    flexShrink:    0,
                }}>
                    Status
                </span>

                {/* Status chips */}
                <div className="flex items-center gap-[5px] flex-wrap">
                    {STATUS_CHIPS.map(chip => (
                        <FilterChip
                            key={chip.value}
                            label={chip.label}
                            active={status === chip.value}
                            color={chip.color}
                            activeBg={chip.activeBg}
                            onClick={() => onStatusChange(chip.value)}
                            dot
                        />
                    ))}
                </div>

                {/* Divider */}
                <div style={{
                    width:      1,
                    alignSelf:  "stretch",
                    background: "var(--border-default)",
                    margin:     "2px 2px",
                    flexShrink: 0,
                }} />

                {/* Severity toggle */}
                <button
                    onClick={() => setShowSeverity(v => !v)}
                    aria-label="Toggle severity filter"
                    aria-expanded={showSeverity}
                    className="flex items-center gap-[5px] shrink-0 rounded-lg transition-all duration-150"
                    style={{
                        height:        26,
                        padding:       "0 9px",
                        background:    showSeverity || severity !== "all"
                            ? "rgba(59,158,255,0.1)"
                            : "transparent",
                        border:        `1px solid ${showSeverity || severity !== "all"
                            ? "rgba(59,158,255,0.4)"
                            : "var(--border-default)"}`,
                        fontFamily:    "var(--font-mono)",
                        fontSize:      "clamp(0.52rem, 0.45rem + 0.2vw, 0.6rem)",
                        fontWeight:    severity !== "all" ? 700 : 500,
                        letterSpacing: "0.05em",
                        color:         showSeverity || severity !== "all"
                            ? "var(--accent-primary)"
                            : "var(--text-muted)",
                        cursor:        "pointer",
                        outline:       "none",
                        boxShadow:     severity !== "all"
                            ? "0 0 5px rgba(59,158,255,0.18)"
                            : "none",
                    }}
                >
                    <SlidersHorizontal size={10} strokeWidth={2} />
                    Severity
                    {severity !== "all" && (
                        <Badge
                            variant="outline"
                            className="h-[14px] px-[5px] leading-none"
                            style={{
                                fontFamily:  "var(--font-mono)",
                                fontSize:    "0.44rem",
                                fontWeight:  700,
                                background:  "rgba(59,158,255,0.2)",
                                borderColor: "rgba(59,158,255,0.45)",
                                color:       "var(--accent-primary)",
                                borderRadius:"999px",
                            }}
                        >
                            1
                        </Badge>
                    )}
                </button>

                {/* Clear all */}
                {hasFilters && (
                    <button
                        onClick={() => { onStatusChange("all"); onSeverityChange("all"); setShowSeverity(false); }}
                        className="flex items-center gap-[4px] shrink-0 rounded-lg transition-all duration-150"
                        style={{
                            height:        26,
                            padding:       "0 8px",
                            background:    "transparent",
                            border:        "1px solid var(--border-default)",
                            fontFamily:    "var(--font-mono)",
                            fontSize:      "clamp(0.5rem, 0.44rem + 0.18vw, 0.58rem)",
                            letterSpacing: "0.05em",
                            color:         "var(--text-muted)",
                            cursor:        "pointer",
                            outline:       "none",
                        }}
                    >
                        <X size={9} strokeWidth={2.5} />
                        Clear
                        <Badge
                            variant="outline"
                            className="h-[14px] px-[5px] leading-none"
                            style={{
                                fontFamily:  "var(--font-mono)",
                                fontSize:    "0.44rem",
                                fontWeight:  700,
                                background:  "rgba(255,255,255,0.06)",
                                borderColor: "var(--border-default)",
                                color:       "var(--text-muted)",
                                borderRadius:"999px",
                            }}
                        >
                            {activeFilterCount}
                        </Badge>
                    </button>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Refresh */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefetch}
                    aria-label="Refresh history"
                    className="h-[26px] px-3 gap-[5px] shrink-0 rounded-lg transition-all duration-150"
                    style={{
                        fontFamily:    "var(--font-mono)",
                        fontSize:      "clamp(0.5rem, 0.44rem + 0.18vw, 0.58rem)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        background:    "transparent",
                        borderColor:   "var(--border-default)",
                        color:         "var(--text-muted)",
                    }}
                >
                    <RefreshCw size={10} strokeWidth={2} />
                    Refresh
                </Button>
            </div>

            {/* ── Row B: Severity chips (collapsible) ── */}
            {showSeverity && (
                <div
                    className="flex items-center gap-[5px] px-4 py-[8px] flex-wrap"
                    style={{
                        borderTop: "1px solid var(--border-subtle)",
                        background:"rgba(255,255,255,0.012)",
                        animation: "slide-in-up 150ms ease",
                    }}
                >
                    <span style={{
                        fontFamily:    "var(--font-mono)",
                        fontSize:      "0.5rem",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color:         "var(--text-disabled)",
                        flexShrink:    0,
                        marginRight:   2,
                    }}>
                        Severity
                    </span>

                    {SEVERITY_CHIPS.map(chip => (
                        <FilterChip
                            key={chip.value}
                            label={chip.label}
                            active={severity === chip.value}
                            color={chip.color}
                            onClick={() => {
                                onSeverityChange(chip.value);
                                // Auto-close panel once a specific value is chosen
                                if (chip.value !== "all") setShowSeverity(false);
                            }}
                            dot
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertDashboardPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>("active");
    const uid     = useId();
    const tabId   = (t: ActiveTab) => `${uid}-tab-${t}`;
    const panelId = (t: ActiveTab) => `${uid}-panel-${t}`;

    const { alerts, pendingActions, escalateAlert, ignoreAlert, acknowledgeAlert, dispatchAlert } = useAlerts();
    const [focusedAlertId, setFocusedAlertId] = useState<string | null>(null);
    const focusedAlert = alerts.find((a) => a.id === focusedAlertId) ?? null;

    const [historyStatus,   setHistoryStatus]   = useState<HistoryStatusFilter>("all");
    const [historySeverity, setHistorySeverity] = useState<SeverityFilter>("all");

    const { groups, isLoading: historyLoading, error: historyError, total: historyTotal, refetch } =
        useAlertHistory({ status: historyStatus, severity: historySeverity });

    const handleAlertSelect = useCallback(
        (alert: Alert) => setFocusedAlertId(prev => prev === alert.id ? null : alert.id), []
    );
    const handleEscalate = useCallback((id: string) => escalateAlert(id),   [escalateAlert]);
    const handleApprove  = useCallback((id: string) => acknowledgeAlert(id), [acknowledgeAlert]);
    const handleDispatch = useCallback((id: string) => dispatchAlert(id),    [dispatchAlert]);

    const handleIgnore = useCallback(
        (id: string, reason?: string) => {
            ignoreAlert(id, reason);
            if (focusedAlertId === id) setFocusedAlertId(null);
        },
        [ignoreAlert, focusedAlertId]
    );

    const handleDrawerIgnore = useCallback(
        (id: string, reason: string) => handleIgnore(id, reason),
        [handleIgnore]
    );

    return (
        <>
            {/* Skip-nav */}
            <a
                href={`#${panelId(activeTab)}`}
                className="absolute left-0 z-[100] px-4 py-2 text-[0.6rem] font-mono transition-[top] duration-200"
                style={{ top: "-40px", background: "var(--accent-primary)", color: "#000" }}
                onFocus={e  => { (e.currentTarget as HTMLAnchorElement).style.top = "0"; }}
                onBlur={e   => { (e.currentTarget as HTMLAnchorElement).style.top = "-40px"; }}
            >
                Skip to content
            </a>

            <div
                className="flex flex-col h-full overflow-hidden"
                style={{ background: "var(--bg-base)" }}
            >
                {/* ── Page header ── */}
                <header
                    className="px-6 pt-5 pb-4 flex flex-col gap-3"
                    style={{
                        background:   "var(--bg-raised)",
                        borderBottom: "1px solid var(--border-default)",
                    }}
                >
                    {/* Row 1 — title · live count · mode controls */}
                    <div className="flex items-center justify-between">
                        <h1
                            className="text-[1.25rem] font-bold tracking-tight m-0 leading-none"
                            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                        >
                            Alert Dashboard
                        </h1>

                        <div className="flex items-center gap-2">
                            <span
                                aria-live="polite"
                                aria-atomic="true"
                                className="flex items-center gap-[5px] px-[9px] py-[3px] rounded-full"
                                style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border:     "1px solid var(--border-subtle)",
                                }}
                            >
                                <span style={{
                                    display:      "inline-block",
                                    width:        5, height: 5,
                                    borderRadius: "50%",
                                    background:   activeTab === "active" ? "var(--status-online)" : "var(--text-disabled)",
                                    boxShadow:    activeTab === "active" ? "0 0 4px var(--status-online)" : "none",
                                    animation:    activeTab === "active" ? "pulse-dot 1.5s ease infinite" : "none",
                                    flexShrink:   0,
                                }} />
                                <span
                                    className="text-[0.58rem] tracking-[0.06em]"
                                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
                                >
                                    {activeTab === "active"
                                        ? `${alerts.length} active`
                                        : `${historyTotal} historical`}
                                </span>
                            </span>
                            <ModeControls />
                        </div>
                    </div>

                    {/* Row 2 — subtitle centred */}
                    <div className="flex justify-center">
                        <p
                            className="text-[0.63rem] tracking-[0.04em] m-0"
                            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
                        >
                            Nairobi Traffic Command — real-time alert management &amp; audit trail
                        </p>
                    </div>

                    {/* Row 3 — full-width segmented tab pill */}
                    <TabBar
                        active={activeTab}
                        onChange={setActiveTab}
                        counts={{ active: alerts.length, history: historyTotal }}
                        tabId={tabId}
                        panelId={panelId}
                    />
                </header>

                {/* ── Active panel ── */}
                <div
                    id={panelId("active")}
                    role="tabpanel"
                    aria-labelledby={tabId("active")}
                    hidden={activeTab !== "active"}
                    className="flex-1 overflow-hidden flex flex-col"
                    style={{ display: activeTab === "active" ? "flex" : "none" }}
                >
                    {/* Sub-header */}
                    <div
                        className="px-6 py-3 flex flex-col gap-[6px] shrink-0"
                        style={{ borderBottom: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}
                    >
                        <div className="flex items-center justify-between">
                            <span
                                className="text-[0.72rem] font-bold tracking-[0.08em] uppercase"
                                style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
                            >
                                Active Alerts
                            </span>
                            <span
                                className="flex items-center gap-[5px] px-[9px] py-[3px] rounded-full"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)" }}
                            >
                                <span style={{
                                    display:      "inline-block",
                                    width:        5, height: 5,
                                    borderRadius: "50%",
                                    background:   alerts.length > 0 ? "var(--severity-high)"        : "var(--text-disabled)",
                                    boxShadow:    alerts.length > 0 ? "0 0 4px var(--severity-high)" : "none",
                                    animation:    alerts.length > 0 ? "pulse-dot 1.5s ease infinite" : "none",
                                    flexShrink:   0,
                                }} />
                                <span className="text-[0.58rem] tracking-[0.06em] "
                                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                    {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
                                </span>
                            </span>
                        </div>
                        <div className="flex justify-center">
                            <p className="text-[0.58rem] tracking-[0.04em] m-0"
                               style={{ color: "var(--text-disabled)", fontFamily: "var(--font-mono)" }}>
                                {alerts.length === 0
                                    ? "All clear — no active alerts"
                                    : "Select an alert to review, approve, dispatch or escalate"}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {alerts.length > 20 ? (
                            <VirtualAlertList
                                alerts={alerts}
                                focusedAlertId={focusedAlertId}
                                pendingActions={pendingActions}
                                onAlertSelect={handleAlertSelect}
                                onApprove={handleApprove}
                                onIgnore={handleIgnore}
                                onDispatch={handleDispatch}
                                onEscalate={handleEscalate}
                                listLabel="Active alerts"
                            />
                        ) : (
                            <AlertPanel
                                alerts={alerts}
                                focusedAlertId={focusedAlertId ?? undefined}
                                pendingActions={pendingActions}
                                onAlertSelect={handleAlertSelect}
                                onApprove={handleApprove}
                                onIgnore={handleIgnore}
                                onDispatch={handleDispatch}
                                onEscalate={handleEscalate}
                            />
                        )}
                    </div>
                </div>

                {/* ── History panel ── */}
                <div
                    id={panelId("history")}
                    role="tabpanel"
                    aria-labelledby={tabId("history")}
                    hidden={activeTab !== "history"}
                    className="flex-1 overflow-hidden flex flex-col"
                    style={{ display: activeTab === "history" ? "flex" : "none" }}
                >
                    {/* Sub-header */}
                    <div
                        className="px-6 py-3 flex flex-col gap-[6px] shrink-0"
                        style={{ borderBottom: "1px solid var(--border-default)", background: "var(--bg-elevated)" }}
                    >
                        <div className="flex items-center justify-between">
                            <span
                                className="text-[0.72rem] font-bold tracking-[0.08em] uppercase"
                                style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
                            >
                                Alert History
                            </span>
                            <span
                                className="flex items-center gap-[5px] px-[9px] py-[3px] rounded-full"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)" }}
                            >
                                <span style={{
                                    display:      "inline-block",
                                    width:        5, height: 5,
                                    borderRadius: "50%",
                                    background:   "var(--text-disabled)",
                                    flexShrink:   0,
                                }} />
                                <span className="text-[0.58rem] tracking-[0.06em]"
                                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                    {historyTotal} historical
                                </span>
                            </span>
                        </div>
                        <div className="flex justify-center">
                            <p className="text-[0.58rem] tracking-[0.04em] m-0"
                               style={{ color: "var(--text-disabled)", fontFamily: "var(--font-mono)" }}>
                                Resolved, ignored and escalated alerts — full audit trail
                            </p>
                        </div>
                    </div>

                    {/* Chip-based filter bar */}
                    <HistoryFilterBar
                        status={historyStatus}
                        severity={historySeverity}
                        onStatusChange={setHistoryStatus}
                        onSeverityChange={setHistorySeverity}
                        onRefetch={refetch}
                    />

                    <div className="flex-1 overflow-auto">
                        <AlertHistoryTable
                            groups={groups}
                            isLoading={historyLoading}
                            error={historyError}
                        />
                    </div>
                </div>
            </div>

            {focusedAlert && (
                <AlertDrawer
                    alert={focusedAlert}
                    onClose={() => setFocusedAlertId(null)}
                    onApprove={handleApprove}
                    onEscalate={handleEscalate}
                    onIgnore={handleDrawerIgnore}
                    onDispatch={handleDispatch}
                />
            )}
        </>
    );
}