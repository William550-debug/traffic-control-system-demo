"use client";

/**
 * AlertHistoryTable
 * -----------------
 * Displays resolved / ignored / escalated alerts grouped by date.
 * Matches the dark control-room design language from globals.css.
 *
 * Features:
 * - Date group headers with entry counts
 * - Status badge (resolved / ignored / escalated)
 * - Severity indicator dot
 * - Dismiss reason expandable row (Human-Validated mode)
 * - Duration column
 * - Operator column
 * - Accessible: role="table" with proper thead/tbody, aria-labels
 */

import React, { useState } from "react";
import type { AlertHistoryEntry, AlertHistoryGroup } from "@/hooks/use-alert-history";
import type { Alert } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertHistoryTableProps {
    groups: AlertHistoryGroup[];
    isLoading?: boolean;
    error?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms?: number): string {
    if (!ms) return "—";
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<Alert["severity"], string> = {
    critical: "var(--color-severity-critical, #ff6d00)",
    high:     "var(--color-severity-high,     #ffd600)",
    medium:   "var(--color-severity-medium,   #29b6f6)",
    low:      "var(--color-severity-low,      #66bb6a)",
    info:     "var(--color-severity-info,     #94a3b8)",
};

const STATUS_STYLES: Record<
    AlertHistoryEntry["status"],
    { bg: string; color: string; label: string }
> = {
    resolved:  { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", label: "Resolved"  },
    ignored:   { bg: "rgba(100,116,139,0.2)", color: "#94a3b8", label: "Ignored"   },
    escalated: { bg: "rgba(251,146,60,0.15)", color: "#fb923c", label: "Escalated" },
};

function SeverityDot({ severity }: { severity: Alert["severity"] }) {
    return (
        <span
            aria-label={severity}
            style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: SEVERITY_COLORS[severity],
                flexShrink: 0,
                boxShadow: `0 0 6px ${SEVERITY_COLORS[severity]}`,
            }}
        />
    );
}

function StatusBadge({ status }: { status: AlertHistoryEntry["status"] }) {
    const s = STATUS_STYLES[status];
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: s.bg,
                color: s.color,
                whiteSpace: "nowrap",
            }}
        >
      {s.label}
    </span>
    );
}

function ExpandableRow({ entry }: { entry: AlertHistoryEntry }) {
    const [open, setOpen] = useState(false);
    const hasReason = Boolean(entry.dismissReason);

    return (
        <>
            <tr
                style={{
                    borderBottom: "1px solid var(--color-border)",
                    transition: "background 0.15s",
                    cursor: hasReason ? "pointer" : "default",
                }}
                onClick={() => hasReason && setOpen((v) => !v)}
                aria-expanded={hasReason ? open : undefined}
                tabIndex={hasReason ? 0 : -1}
                onKeyDown={(e) => {
                    if (hasReason && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setOpen((v) => !v);
                    }
                }}
            >
                {/* Time */}
                <td
                    style={{
                        padding: "10px 12px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {formatTime(entry.actionAt)}
                </td>

                {/* Severity + Title */}
                <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <SeverityDot severity={entry.severity} />
                        <span
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-primary)",
                                fontFamily: "var(--font-display)",
                            }}
                        >
              {entry.title}
            </span>
                        {hasReason && (
                            <span
                                aria-hidden="true"
                                style={{
                                    marginLeft: "auto",
                                    fontSize: "11px",
                                    color: "var(--color-text-muted)",
                                    fontFamily: "var(--font-mono)",
                                    transition: "transform 0.2s",
                                    transform: open ? "rotate(90deg)" : "rotate(0deg)",
                                    display: "inline-block",
                                }}
                            >
                ▶
              </span>
                        )}
                    </div>
                </td>

                {/* Zone */}
                <td
                    style={{
                        padding: "10px 12px",
                        fontSize: "12px",
                        color: "var(--color-text-secondary)",
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {entry.zone}
                </td>

                {/* Status */}
                <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <StatusBadge status={entry.status} />
                </td>

                {/* Duration */}
                <td
                    style={{
                        padding: "10px 12px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        color: "var(--color-text-muted)",
                        whiteSpace: "nowrap",
                        textAlign: "right",
                    }}
                >
                    {formatDuration(entry.durationMs)}
                </td>

                {/* Operator */}
                <td
                    style={{
                        padding: "10px 12px",
                        fontSize: "12px",
                        color: "var(--color-text-secondary)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {entry.operatorName}
                </td>
            </tr>

            {/* Expanded reason row */}
            {hasReason && open && (
                <tr
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                    aria-label="Dismiss reason detail"
                >
                    <td />
                    <td
                        colSpan={5}
                        style={{ padding: "0 12px 12px 28px" }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "8px",
                                padding: "10px 14px",
                                borderRadius: "6px",
                                background: "rgba(148,163,184,0.06)",
                                borderLeft: "2px solid var(--color-border)",
                            }}
                        >
              <span
                  style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      paddingTop: "1px",
                      flexShrink: 0,
                  }}
              >
                Reason
              </span>
                            <span
                                style={{
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                    lineHeight: 1.5,
                                    fontStyle: "italic",
                                }}
                            >
                &ldquo;{entry.dismissReason}&rdquo;
              </span>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

function DateGroupHeader({
                             dateLabel,
                             count,
                         }: {
    dateLabel: string;
    count: number;
}) {
    return (
        <tr>
            <td
                colSpan={6}
                style={{
                    padding: "20px 12px 8px",
                    borderBottom: "1px solid var(--color-border)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                    }}
                >
          <span
              style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--color-text-primary)",
              }}
          >
            {dateLabel}
          </span>
                    <span
                        style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                            color: "var(--color-text-muted)",
                            background: "var(--color-surface-raised, rgba(255,255,255,0.05))",
                            padding: "1px 7px",
                            borderRadius: "10px",
                        }}
                        aria-label={`${count} entries`}
                    >
            {count}
          </span>
                    <div
                        aria-hidden="true"
                        style={{
                            flex: 1,
                            height: "1px",
                            background: "var(--color-border)",
                            opacity: 0.4,
                        }}
                    />
                </div>
            </td>
        </tr>
    );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} style={{ padding: "12px" }}>
                            <div
                                style={{
                                    height: "12px",
                                    borderRadius: "4px",
                                    background: "var(--color-surface-raised, rgba(255,255,255,0.05))",
                                    animation: "pulse 1.5s ease-in-out infinite",
                                    width: j === 1 ? "70%" : "50%",
                                    opacity: 1 - i * 0.15,
                                }}
                            />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AlertHistoryTable({
                                      groups,
                                      isLoading,
                                      error,
                                  }: AlertHistoryTableProps) {
    const totalEntries = groups.reduce((sum, g) => sum + g.entries.length, 0);

    return (
        <div
            style={{
                width: "100%",
                overflowX: "auto",
                overflowY: "auto",
                maxHeight: "100%",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--color-border) transparent",
            }}
            role="region"
            aria-label="Alert history"
            aria-live="polite"
            aria-busy={isLoading}
        >
            {error && (
                <div
                    role="alert"
                    style={{
                        padding: "16px",
                        color: "var(--color-severity-high, #ffd600)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                    }}
                >
                    Failed to load history: {error}
                </div>
            )}

            <table
                style={{ width: "100%", borderCollapse: "collapse" }}
                aria-label={`Alert history — ${totalEntries} entries`}
                aria-rowcount={totalEntries + groups.length} // includes group header rows
            >
                <thead>
                <tr
                    style={{
                        borderBottom: "2px solid var(--color-border)",
                        position: "sticky",
                        top: 0,
                        background: "var(--color-surface, #0d1117)",
                        zIndex: 1,
                    }}
                >
                    {(
                        [
                            ["Time",     "auto",  "left"],
                            ["Alert",    "40%",   "left"],
                            ["Zone",     "auto",  "left"],
                            ["Status",   "auto",  "left"],
                            ["Duration", "auto",  "right"],
                            ["Operator", "auto",  "left"],
                        ] as [string, string, string][]
                    ).map(([label, width, align]) => (
                        <th
                            key={label}
                            scope="col"
                            style={{
                                padding: "8px 12px",
                                textAlign: align as "left" | "right",
                                width,
                                fontFamily: "var(--font-mono)",
                                fontSize: "11px",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: "var(--color-text-muted)",
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {label}
                        </th>
                    ))}
                </tr>
                </thead>

                <tbody>
                {isLoading ? (
                    <SkeletonRows />
                ) : groups.length === 0 ? (
                    <tr>
                        <td
                            colSpan={6}
                            style={{
                                padding: "48px 0",
                                textAlign: "center",
                                color: "var(--color-text-muted)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "13px",
                            }}
                        >
                            No history entries match the current filters
                        </td>
                    </tr>
                ) : (
                    groups.map((group) => (
                        <React.Fragment key={group.dateKey}>
                            <DateGroupHeader
                                dateLabel={group.dateLabel}
                                count={group.entries.length}
                            />
                            {group.entries.map((entry) => (
                                <ExpandableRow key={entry.alertId} entry={entry} />
                            ))}
                        </React.Fragment>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
}