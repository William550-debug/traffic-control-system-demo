"use client";

/**
 * AlertHistoryTable
 *
 * Spacing philosophy: each data row mirrors an AlertCard.
 *   – ROW_PY = "py-[11px]" on every TableCell → ~44px row height
 *   – 4px gap between consecutive rows via row margin trick
 *   – Date-group headers have generous top/bottom padding
 *   – Everything else matches the existing design tokens
 */

import React, { useState } from "react";
import {
    CheckCircle2,
    MinusCircle,
    ArrowUpCircle,
    Clock,
    MapPin,
    User,
    Timer,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Flame,
    AlertCircle,
    Info,
    Radio,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge }      from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AlertHistoryEntry, AlertHistoryGroup } from "@/hooks/use-alert-history";
import type { Alert } from "@/types";

// ─── Design tokens ────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Alert["severity"], string> = {
    critical: "var(--severity-critical)",
    high:     "var(--severity-high)",
    medium:   "var(--severity-medium)",
    low:      "var(--severity-low)",
    info:     "var(--severity-info)",
};

const SEVERITY_BG: Record<Alert["severity"], string> = {
    critical: "rgba(255,59,59,0.07)",
    high:     "rgba(255,136,0,0.06)",
    medium:   "rgba(245,197,24,0.05)",
    low:      "rgba(59,158,255,0.05)",
    info:     "rgba(78,205,196,0.04)",
};

const SEVERITY_ICON: Record<Alert["severity"], React.ElementType> = {
    critical: AlertTriangle,
    high:     Flame,
    medium:   AlertCircle,
    low:      Info,
    info:     Radio,
};

const SEVERITY_LABEL: Record<Alert["severity"], string> = {
    critical: "Critical",
    high:     "High",
    medium:   "Medium",
    low:      "Low",
    info:     "Info",
};

const STATUS_CFG: Record<
    AlertHistoryEntry["status"],
    { icon: React.ElementType; bg: string; border: string; color: string; label: string }
> = {
    resolved:  {
        icon:   CheckCircle2,
        bg:     "rgba(34,197,94,0.08)",
        border: "rgba(34,197,94,0.28)",
        color:  "var(--status-online)",
        label:  "Resolved",
    },
    ignored:   {
        icon:   MinusCircle,
        bg:     "rgba(74,90,110,0.15)",
        border: "rgba(74,90,110,0.38)",
        color:  "var(--text-muted)",
        label:  "Ignored",
    },
    escalated: {
        icon:   ArrowUpCircle,
        bg:     "rgba(124,106,247,0.12)",
        border: "rgba(124,106,247,0.32)",
        color:  "var(--accent-secondary)",
        label:  "Escalated",
    },
};

// ─── Spacing constants ────────────────────────────────────────────────────────
/*
 * ROW_PY is applied to every <TableCell> in a data row.
 * Combined with the row's min-height this produces ~44px rows —
 * the same visual weight as an AlertCard in compact mode.
 *
 * CELL_PL / CELL_PR give the first and last cells their edge gutters
 * so content never touches the left severity stripe or the right edge.
 */
const ROW_PY    = "py-[11px]";   // vertical padding on every data cell
const CELL_PL   = "pl-4";        // first cell left padding (after 3px stripe)
const CELL_PR   = "pr-4";        // last cell right padding

// ─── Column widths ────────────────────────────────────────────────────────────

const COL = {
    status:   "w-[108px] min-w-[108px]",
    severity: "w-[110px] min-w-[110px]",
    title:    "min-w-[200px]",
    zone:     "w-[130px] min-w-[110px]",
    operator: "w-[124px] min-w-[110px]",
    duration: "w-[70px]  min-w-[62px]  text-right",
    time:     "w-[60px]  min-w-[54px]  text-right",
    expand:   "w-[38px]  min-w-[38px]  text-center",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms?: number): string {
    if (!ms) return "—";
    const mins = Math.floor(ms / 60_000);
    if (mins < 60)  return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-KE", {
        hour: "2-digit", minute: "2-digit", hour12: false,
    });
}

// ─── HeadLabel ────────────────────────────────────────────────────────────────

function HeadLabel({
                       children, icon, right = false,
                   }: {
    children: React.ReactNode;
    icon?:    React.ReactNode;
    right?:   boolean;
}) {
    return (
        <span
            className={`flex items-center gap-[4px] ${right ? "justify-end" : ""}`}
            style={{
                fontFamily:    "var(--font-mono)",
                fontSize:      "clamp(0.5rem, 0.44rem + 0.16vw, 0.56rem)",
                fontWeight:    600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color:         "var(--text-muted)",
                whiteSpace:    "nowrap",


            }}
        >
            {icon && (
                <span style={{ color: "var(--text-disabled)", flexShrink: 0 }}>
                    {icon}
                </span>
            )}
            {children}
        </span>
    );
}

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: AlertHistoryEntry }) {
    const [open, setOpen] = useState(false);

    const hasReason  = Boolean(entry.dismissReason);
    const cfg        = STATUS_CFG[entry.status];
    const StatusIcon = cfg.icon;
    const SevIcon    = SEVERITY_ICON[entry.severity];
    const sevColor   = SEVERITY_COLOR[entry.severity];
    const sevBg      = SEVERITY_BG[entry.severity];
    const isCritical = entry.severity === "critical";

    return (
        <>
            <TableRow
                data-state={open ? "selected" : undefined}
                onClick={() => hasReason && setOpen(v => !v)}
                role={hasReason ? "button" : undefined}
                tabIndex={hasReason ? 0 : undefined}
                aria-expanded={hasReason ? open : undefined}
                onKeyDown={e => {
                    if (hasReason && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setOpen(v => !v);
                    }
                }}
                className="group transition-all duration-150"
                style={{
                    /*
                     * 3px left severity stripe — same as alert-panel group header borders.
                     * `borderLeft` on TableRow is the only reliable cross-browser way to
                     * get a true flush-left stripe without extra wrapper divs.
                     */
                    borderLeft:   `3px solid ${sevColor}`,
                    background:   open
                        ? sevBg
                        : isCritical
                            ? "rgba(255,59,59,0.025)"
                            : "transparent",
                    cursor:       hasReason ? "pointer" : "default",
                    /*
                     * Bottom border acts as row gap — 4px of visual space between rows
                     * without adding extra DOM nodes.
                     */
                    borderBottom: "4px solid var(--bg-base)",

                }}
            >
                {/* ── Status ── */}
                <TableCell className={`${COL.status} ${ROW_PY} ${CELL_PL}`}>
                    <div className="flex items-center gap-[8px]">
                        {/* Framed icon circle */}
                        <div
                            className="flex items-center justify-center shrink-0 rounded-full"
                            style={{
                                width:      26,
                                height:     26,
                                background: cfg.bg,
                                border:     `1px solid ${cfg.border}`,
                            }}
                        >
                            <StatusIcon size={12} strokeWidth={2.2} style={{ color: cfg.color }} />
                        </div>
                        <span style={{
                            fontFamily:    "var(--font-mono)",
                            fontSize:      "clamp(0.56rem, 0.5rem + 0.18vw, 0.64rem)",
                            fontWeight:    600,
                            letterSpacing: "0.04em",
                            color:         cfg.color,
                            whiteSpace:    "nowrap",
                        }}>
                            {cfg.label}
                        </span>
                    </div>
                </TableCell>

                {/* ── Severity ── */}
                <TableCell className={`${COL.severity} ${ROW_PY}`}>
                    <div className="flex items-center gap-[7px]">
                        {/* Framed icon square — mirrors alert-panel group header icon box */}
                        <div
                            className="flex items-center justify-center shrink-0 rounded-md"
                            style={{
                                width:      26,
                                height:     26,
                                background: `${sevColor}15`,
                                border:     `1px solid ${sevColor}35`,
                                boxShadow:  isCritical ? `0 0 6px ${sevColor}28` : "none",
                            }}
                        >
                            <SevIcon
                                size={13}
                                strokeWidth={isCritical ? 2.5 : 2}
                                style={{
                                    color:     sevColor,
                                    animation: isCritical ? "pulse-dot 1.4s ease infinite" : "none",
                                }}
                            />
                        </div>
                        {/* Severity label text — no badge, cleaner at this size */}
                        <span style={{
                            fontFamily:    "var(--font-mono)",
                            fontSize:      "clamp(0.56rem, 0.5rem + 0.18vw, 0.64rem)",
                            fontWeight:    700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color:         sevColor,
                            whiteSpace:    "nowrap",
                        }}>
                            {SEVERITY_LABEL[entry.severity]}
                        </span>
                    </div>
                </TableCell>

                {/* ── Alert title ── */}
                <TableCell className={`${COL.title} ${ROW_PY}`}>
                    <div className="flex flex-col gap-[3px]">
                        <span style={{
                            fontFamily: "var(--font-display)",
                            fontSize:   "clamp(0.68rem, 0.58rem + 0.28vw, 0.78rem)",
                            fontWeight: 600,
                            color:      "var(--text-primary)",
                            lineHeight: 1.25,
                        }}>
                            {entry.title}
                        </span>
                        {/* Subtle type/category sub-label if available */}
                        {entry.type && (
                            <span style={{
                                fontFamily:    "var(--font-mono)",
                                fontSize:      "0.5rem",
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                color:         "var(--text-disabled)",
                            }}>
                                {entry.type}
                            </span>
                        )}
                    </div>
                </TableCell>

                {/* ── Zone ── */}
                <TableCell className={`${COL.zone} ${ROW_PY}`}>
                    <span
                        className="flex items-center gap-[6px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        <MapPin size={11} strokeWidth={2} className="shrink-0" />
                        <span
                            className="truncate"
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize:   "clamp(0.56rem, 0.5rem + 0.18vw, 0.64rem)",
                            }}
                        >
                            {entry.zone}
                        </span>
                    </span>
                </TableCell>

                {/* ── Operator ── */}
                <TableCell className={`${COL.operator} ${ROW_PY}`}>
                    <span
                        className="flex items-center gap-[6px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        <User size={11} strokeWidth={2} className="shrink-0" />
                        <span
                            className="truncate"
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize:   "clamp(0.56rem, 0.5rem + 0.18vw, 0.64rem)",
                            }}
                        >
                            {entry.operatorName}
                        </span>
                    </span>
                </TableCell>

                {/* ── Duration ── */}
                <TableCell className={`${COL.duration} ${ROW_PY}`}>
                    <span
                        className="flex items-center justify-end gap-[5px]"
                        style={{ color: "var(--text-muted)" }}
                    >
                        <Timer size={10} strokeWidth={2} className="shrink-0" />
                        <span
                            className="tabular-nums"
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize:   "clamp(0.56rem, 0.5rem + 0.18vw, 0.64rem)",
                            }}
                        >
                            {formatDuration(entry.durationMs)}
                        </span>
                    </span>
                </TableCell>

                {/* ── Time ── */}
                <TableCell className={`${COL.time} ${ROW_PY}`}>
                    <span
                        className="flex items-center justify-end gap-[5px]"
                        style={{ color: "var(--text-disabled)" }}
                    >
                        <Clock size={10} strokeWidth={2} className="shrink-0" />
                        <span
                            className="tabular-nums"
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize:   "clamp(0.56rem, 0.5rem + 0.18vw, 0.64rem)",
                            }}
                        >
                            {formatTime(entry.actionAt)}
                        </span>
                    </span>
                </TableCell>

                {/* ── Expand chevron ── */}
                <TableCell className={`${COL.expand} ${ROW_PY} ${CELL_PR}`}>
                    {hasReason ? (
                        <div
                            className="flex items-center justify-center mx-auto rounded-md transition-all duration-150"
                            style={{
                                width:      24,
                                height:     24,
                                background: open ? "rgba(255,255,255,0.08)" : "transparent",
                                border:     `1px solid ${open ? "var(--border-strong)" : "transparent"}`,
                                color:      open ? "var(--text-secondary)" : "var(--text-disabled)",
                            }}
                        >
                            {open
                                ? <ChevronUp   size={12} strokeWidth={2.5} />
                                : <ChevronDown size={12} strokeWidth={2} />
                            }
                        </div>
                    ) : null}
                </TableCell>
            </TableRow>

            {/* ── Expanded dismiss reason ── */}
            {hasReason && open && (
                <TableRow
                    className="hover:bg-transparent"
                    style={{
                        background:   sevBg,
                        borderLeft:   `3px solid ${sevColor}60`,
                        borderBottom: "4px solid var(--bg-base)",
                    }}
                >
                    <TableCell colSpan={8} className="pt-0 pb-4 px-5">
                        <div
                            className="rounded-xl px-4 py-3"
                            style={{
                                background: "rgba(255,255,255,0.025)",
                                border:     "1px solid var(--border-subtle)",
                                borderLeft: `2px solid ${sevColor}55`,
                                animation:  "slide-in-up 150ms ease",
                            }}
                        >
                            <p
                                className="m-0 mb-[5px]"
                                style={{
                                    fontFamily:    "var(--font-mono)",
                                    fontSize:      "0.5rem",
                                    letterSpacing: "0.1em",
                                    textTransform: "uppercase",
                                    color:         "var(--text-muted)",
                                }}
                            >
                                Dismiss reason
                            </p>
                            <p
                                className="m-0 italic leading-relaxed"
                                style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize:   "clamp(0.62rem, 0.54rem + 0.2vw, 0.7rem)",
                                    color:      "var(--text-secondary)",
                                }}
                            >
                                &ldquo;{entry.dismissReason}&rdquo;
                            </p>
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

// ─── Date-group separator ─────────────────────────────────────────────────────

function DateSection({ group }: { group: AlertHistoryGroup }) {
    return (
        <>
            {/* Group header — spans all 8 columns, has its own generous padding */}
            <TableRow
                className="hover:bg-transparent select-none"
                style={{
                    background:   "rgba(255,255,255,0.025)",  // ← faint lifted surface
                    border:       "1px solid var(--border-subtle)",
                    borderRadius: 8,                            // won't work on tr directly —
                    cursor:       "default",                    // use outline trick below instead
                    borderBottom: "none",
                    borderTop:    "8px solid var(--bg-base)",
                    outline:      "1px solid var(--border-subtle)", // ← this works on tr
                }}
            >
                <TableCell colSpan={8} className="py-[10px] px-5">
                    <div className="flex items-center gap-[10px]">
                        {/* Accent bar */}
                        <div
                            className="shrink-0 rounded-full"
                            style={{
                                width:      3,
                                height:     16,
                                background: "var(--accent-primary)",
                                opacity:    0.75,
                            }}
                        />
                        {/* Date label */}
                        <span style={{
                            fontFamily:    "var(--font-mono)",
                            fontSize:      "clamp(0.6rem, 0.52rem + 0.22vw, 0.68rem)",
                            fontWeight:    700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color:         "var(--text-primary)",
                            whiteSpace:    "nowrap",
                            minWidth: "24px", // Force minimum width even when squeezed
                            textAlign: "center"
                        }}>
                            {group.dateLabel}
                        </span>
                        {/* Count badge */}
                        <Badge
                            variant="outline"
                            className="h-[17px] px-[8px] leading-none rounded-full shrink-0"
                            style={{
                                fontFamily:    "var(--font-mono)",
                                fontSize:      "0.48rem",
                                fontWeight:    700,
                                letterSpacing: "0.06em",
                                background:    "rgba(255,255,255,0.04)",
                                borderColor:   "var(--border-default)",
                                color:         "var(--text-muted)",
                            }}
                        >
                            {group.entries.length}
                        </Badge>
                        {/* Horizontal rule */}
                        <div
                            className="flex-1 h-px"
                            style={{ background: "var(--border-subtle)" }}
                        />
                    </div>
                </TableCell>
            </TableRow>

            {/* Entry rows */}
            {group.entries.map(entry => (
                <EntryRow key={entry.alertId} entry={entry} />
            ))}
        </>
    );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <TableRow
                    key={i}
                    className="hover:bg-transparent"
                    style={{
                        opacity:      Math.max(0.15, 1 - i * 0.17),
                        borderBottom: "4px solid var(--bg-base)",
                        borderLeft:   "3px solid var(--border-subtle)",

                    }}
                >
                    <TableCell className={`${COL.status} ${ROW_PY} ${CELL_PL}`}>
                        <div className="flex items-center gap-2">
                            <div className="skeleton w-[26px] h-[26px] rounded-full shrink-0" />
                            <div className="skeleton h-[10px] rounded-md w-[48px]" />
                        </div>
                    </TableCell>
                    <TableCell className={`${COL.severity} ${ROW_PY}`}>
                        <div className="flex items-center gap-[7px]">
                            <div className="skeleton w-[26px] h-[26px] rounded-md shrink-0" />
                            <div className="skeleton h-[10px] rounded-md w-[44px]" />
                        </div>
                    </TableCell>
                    <TableCell className={`${COL.title} ${ROW_PY}`}>
                        <div className="flex flex-col gap-[5px]">
                            <div className="skeleton h-[12px] rounded-md w-[62%]" />
                            <div className="skeleton h-[8px]  rounded-md w-[32%]" />
                        </div>
                    </TableCell>
                    <TableCell className={`${COL.zone} ${ROW_PY}`}>
                        <div className="skeleton h-[10px] rounded-md w-[75%]" />
                    </TableCell>
                    <TableCell className={`${COL.operator} ${ROW_PY}`}>
                        <div className="skeleton h-[10px] rounded-md w-[70%]" />
                    </TableCell>
                    <TableCell className={`${COL.duration} ${ROW_PY}`}>
                        <div className="skeleton h-[10px] rounded-md w-[28px] ml-auto" />
                    </TableCell>
                    <TableCell className={`${COL.time} ${ROW_PY}`}>
                        <div className="skeleton h-[10px] rounded-md w-[32px] ml-auto" />
                    </TableCell>
                    <TableCell className={`${COL.expand} ${ROW_PY} ${CELL_PR}`} />
                </TableRow>
            ))}
        </>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={8} className="py-28 text-center">
                <div
                    className="flex flex-col items-center gap-4"
                    style={{ color: "var(--text-disabled)" }}
                >
                    <div
                        className="flex items-center justify-center w-10 h-10 rounded-full"
                        style={{
                            background: "rgba(255,255,255,0.03)",
                            border:     "1px solid var(--border-subtle)",
                        }}
                    >
                        <MinusCircle size={18} strokeWidth={1.5} style={{ opacity: 0.5 }} />
                    </div>
                    <span style={{
                        fontFamily:    "var(--font-mono)",
                        fontSize:      "clamp(0.58rem, 0.5rem + 0.2vw, 0.66rem)",
                        letterSpacing: "0.06em",
                    }}>
                        No history entries match the current filters
                    </span>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AlertHistoryTableProps {
    groups:     AlertHistoryGroup[];
    isLoading?: boolean;
    error?:     string | null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AlertHistoryTable({ groups, isLoading, error }: AlertHistoryTableProps) {
    return (
        <ScrollArea className="h-full">
            {/* Error banner */}
            {error && (
                <div
                    role="alert"
                    className="mx-5 mt-4 mb-1 px-4 py-3 rounded-xl flex items-center gap-3"
                    style={{
                        background: "rgba(255,136,0,0.07)",
                        border:     "1px solid rgba(255,136,0,0.28)",
                    }}
                >
                    <span style={{
                        display:      "inline-block",
                        width:        5, height: 5,
                        borderRadius: "50%",
                        background:   "var(--severity-high)",
                        boxShadow:    "0 0 4px var(--severity-high)",
                        animation:    "pulse-dot 1.2s ease infinite",
                        flexShrink:   0,
                    }} />
                    <span style={{
                        fontFamily: "var(--font-mono)",
                        fontSize:   "clamp(0.58rem, 0.5rem + 0.2vw, 0.66rem)",
                        color:      "var(--severity-high)",
                    }}>
                        Failed to load history: {error}
                    </span>
                </div>
            )}

            <Table>
                {/*
                 * Sticky header — bg-elevated + 2px bottom border matches
                 * the panel sub-header row in page.tsx exactly.
                 */}
                <TableHeader className="sticky top-0 z-10">
                    <TableRow
                        className="hover:bg-transparent"
                        style={{
                            background:   "var(--bg-elevated)",
                            borderBottom: "2px solid var(--border-default)",
                            borderLeft:   "3px solid transparent", // keep stripe column consistent
                            minWidth: "24px", // Force minimum width even when squeezed
                            textAlign: "center"
                        }}
                    >
                        <TableHead className={`${COL.status} py-3 ${CELL_PL}`}>
                            <HeadLabel>Status</HeadLabel>
                        </TableHead>
                        <TableHead className={`${COL.severity} py-3`}>
                            <HeadLabel>Severity</HeadLabel>
                        </TableHead>
                        <TableHead className={`${COL.title} py-3`}>
                            <HeadLabel>Alert</HeadLabel>
                        </TableHead>
                        <TableHead className={`${COL.zone} py-3`}>
                            <HeadLabel icon={<MapPin size={9} strokeWidth={2} />}>Zone</HeadLabel>
                        </TableHead>
                        <TableHead className={`${COL.operator} py-3`}>
                            <HeadLabel icon={<User size={9} strokeWidth={2} />}>Operator</HeadLabel>
                        </TableHead>
                        <TableHead className={`${COL.duration} py-3`}>
                            <HeadLabel right icon={<Timer size={9} strokeWidth={2} />}>Dur.</HeadLabel>
                        </TableHead>
                        <TableHead className={`${COL.time} py-3`}>
                            <HeadLabel right icon={<Clock size={9} strokeWidth={2} />}>Time</HeadLabel>
                        </TableHead>
                        <TableHead
                            className={`${COL.expand} py-3 ${CELL_PR}`}
                            aria-label="Expand row"
                        />
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {isLoading ? (
                        <SkeletonRows />
                    ) : groups.length === 0 ? (
                        <EmptyState />
                    ) : (
                        groups.map(group => (
                            <DateSection key={group.dateKey} group={group} />
                        ))
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}