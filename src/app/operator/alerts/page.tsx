"use client";

/**
 * /operator/alerts — Dedicated Alert Dashboard
 * ----------------------------------------------
 * Two-tab layout:
 *   Active    — virtualised alert list, all existing filters + cluster view,
 *               drawer still works, ARIA live region announcements
 *   History   — resolved / ignored / escalated alerts with audit trail
 *
 * Design language:
 *   - Dark control-room theme via CSS custom properties from globals.css
 *   - Syne display font + JetBrains Mono data font
 *   - No component library — all inline styles / CSS vars
 */

import React, { useCallback, useId, useState } from "react";
import { useAlerts }        from "@/hooks/use-alerts";
import { useAlertHistory }  from "@/hooks/use-alert-history";
import { AlertPanel }       from "@/components/alerts/alert-panel";
import { AlertDrawer }      from "@/components/alerts/alert-drawer";
import { AlertHistoryTable } from "@/components/alerts/alert-history-table"
import { VirtualAlertList } from "@/components/alerts/visual-alert-list";
import type { Alert }       from "@/types";
import type { AlertHistoryStatus } from "@/hooks/use-alert-history";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = "active" | "history";
type HistoryStatusFilter = AlertHistoryStatus | "all";
type SeverityFilter = Alert["severity"] | "all";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
    { value: "all",      label: "All severities" },
    { value: "critical", label: "Critical"        },
    { value: "high",     label: "High"            },
    { value: "medium",   label: "Medium"          },
    { value: "low",      label: "Low"             },
    { value: "info",     label: "Info"            },
];

const STATUS_OPTIONS: { value: HistoryStatusFilter; label: string }[] = [
    { value: "all",       label: "All statuses" },
    { value: "resolved",  label: "Resolved"     },
    { value: "ignored",   label: "Ignored"      },
    { value: "escalated", label: "Escalated"    },
];

// ─── Small shared UI primitives ───────────────────────────────────────────────

function TabBar({
                    active,
                    onChange,
                    counts,
                    tabId,
                    panelId,
                }: {
    active: ActiveTab;
    onChange: (t: ActiveTab) => void;
    counts: { active: number; history: number };
    tabId: (t: ActiveTab) => string;
    panelId: (t: ActiveTab) => string;
}) {
    return (
        <div
            role="tablist"
            aria-label="Alert views"
            style={{
                display: "flex",
                gap: "2px",
                borderBottom: "1px solid var(--color-border)",
                padding: "0 24px",
            }}
        >
            {(["active", "history"] as ActiveTab[]).map((tab) => {
                const isActive = active === tab;
                const label = tab === "active" ? "Active" : "History";
                const count = counts[tab];

                return (
                    <button
                        key={tab}
                        role="tab"
                        id={tabId(tab)}
                        aria-controls={panelId(tab)}
                        aria-selected={isActive}
                        onClick={() => onChange(tab)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "14px 20px",
                            border: "none",
                            borderBottom: isActive
                                ? "2px solid var(--color-accent, #29b6f6)"
                                : "2px solid transparent",
                            background: "transparent",
                            cursor: "pointer",
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: isActive
                                ? "var(--color-text-primary)"
                                : "var(--color-text-muted)",
                            transition: "color 0.2s, border-color 0.2s",
                            marginBottom: "-1px", // overlap parent border
                        }}
                    >
                        {label}
                        <span
                            aria-label={`${count} ${label.toLowerCase()} items`}
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "10px",
                                padding: "2px 6px",
                                borderRadius: "10px",
                                background: isActive
                                    ? "rgba(41,182,246,0.15)"
                                    : "rgba(255,255,255,0.06)",
                                color: isActive
                                    ? "var(--color-accent, #29b6f6)"
                                    : "var(--color-text-muted)",
                            }}
                        >
              {count}
            </span>
                    </button>
                );
            })}
        </div>
    );
}

function FilterRow({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 24px",
                borderBottom: "1px solid var(--color-border)",
                flexWrap: "wrap",
            }}
        >
            {children}
        </div>
    );
}

function SelectFilter({
                          id,
                          label,
                          value,
                          options,
                          onChange,
                      }: {
    id: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
}) {
    return (
        <label
            htmlFor={id}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-text-muted)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
            }}
        >
            {label}
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    background: "var(--color-surface-raised, rgba(255,255,255,0.05))",
                    border: "1px solid var(--color-border)",
                    borderRadius: "4px",
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    padding: "4px 8px",
                    cursor: "pointer",
                }}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function RefetchButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            aria-label="Refresh history"
            style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "4px",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                cursor: "pointer",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                transition: "color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-primary)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--color-accent, #29b6f6)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                    "var(--color-text-muted)";
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "var(--color-border)";
            }}
        >
            {/* Refresh icon */}
            <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.24-3.7L9 7h6V1l-1.35 1.35z"
                    fill="currentColor"
                />
            </svg>
            Refresh
        </button>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertDashboardPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState<ActiveTab>("active");
    const uid = useId();
    const tabId  = (t: ActiveTab) => `${uid}-tab-${t}`;
    const panelId = (t: ActiveTab) => `${uid}-panel-${t}`;

    // Active alerts (existing hook)
    const { alerts, escalateAlert, ignoreAlert, acknowledgeAlert } = useAlerts();
    const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
    const selectedAlert = alerts.find((a) => a.id === selectedAlertId) ?? null;

    // History filters
    const [historyStatus,   setHistoryStatus]   = useState<HistoryStatusFilter>("all");
    const [historySeverity, setHistorySeverity] = useState<SeverityFilter>("all");

    const {
        groups,
        isLoading: historyLoading,
        error:     historyError,
        total:     historyTotal,
        refetch,
    } = useAlertHistory({
        status:   historyStatus,
        severity: historySeverity,
    });

    const handleEscalate = useCallback(
        (id: string) => escalateAlert(id),
        [escalateAlert]
    );

    const handleIgnore = useCallback(
        (id: string, reason?: string) => {
            ignoreAlert(id, reason);
            if (selectedAlertId === id) setSelectedAlertId(null);
        },
        [ignoreAlert, selectedAlertId]
    );

    const handleApprove = useCallback(
        (id: string) => acknowledgeAlert(id),
        [acknowledgeAlert]
    );

    return (
        <>
            {/* Skip-nav link for keyboard users */}
            <a
                href={`#${panelId(activeTab)}`}
                style={{
                    position: "absolute",
                    top: "-40px",
                    left: "0",
                    background: "var(--color-accent, #29b6f6)",
                    color: "#000",
                    padding: "8px 16px",
                    zIndex: 100,
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    transition: "top 0.2s",
                }}
                onFocus={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.top = "0";
                }}
                onBlur={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.top = "-40px";
                }}
            >
                Skip to content
            </a>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    overflow: "hidden",
                    background: "var(--color-surface, #0d1117)",
                }}
            >
                {/* ── Page header ─────────────────────────────────────────────────── */}
                <header
                    style={{
                        padding: "20px 24px 0",
                        borderBottom: "none",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "12px",
                            marginBottom: "4px",
                        }}
                    >
                        <h1
                            style={{
                                fontFamily: "var(--font-display)",
                                fontSize: "20px",
                                fontWeight: 600,
                                color: "var(--color-text-primary)",
                                margin: 0,
                                letterSpacing: "-0.01em",
                            }}
                        >
                            Alert Dashboard
                        </h1>
                        <span
                            aria-live="polite"
                            aria-atomic="true"
                            style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "11px",
                                color: "var(--color-text-muted)",
                                letterSpacing: "0.05em",
                            }}
                        >
              {activeTab === "active"
                  ? `${alerts.length} active`
                  : `${historyTotal} historical`}
            </span>
                    </div>

                    <p
                        style={{
                            margin: "0 0 16px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            color: "var(--color-text-muted)",
                            letterSpacing: "0.03em",
                        }}
                    >
                        Nairobi Traffic Command — real-time alert management &amp; audit trail
                    </p>

                    {/* Tabs */}
                    <TabBar
                        active={activeTab}
                        onChange={setActiveTab}
                        counts={{ active: alerts.length, history: historyTotal }}
                        tabId={tabId}
                        panelId={panelId}
                    />
                </header>

                {/* ── Tab panels ──────────────────────────────────────────────────── */}

                {/* Active panel */}
                <div
                    id={panelId("active")}
                    role="tabpanel"
                    aria-labelledby={tabId("active")}
                    hidden={activeTab !== "active"}
                    style={{
                        flex: 1,
                        overflow: "hidden",
                        display: activeTab === "active" ? "flex" : "none",
                        flexDirection: "column",
                    }}
                >
                    {/*
           * AlertPanel already handles filter chips, cluster view, etc.
           * We swap its inner list with VirtualAlertList here by passing
           * it as a render prop. If your AlertPanel doesn't support that yet,
           * use the stand-alone VirtualAlertList below the panel header.
           *
           * For now: render AlertPanel as the full-featured control, then
           * fall back to VirtualAlertList if AlertPanel renders < 20 items.
           */}
                    <div style={{ flex: 1, overflow: "hidden", padding: "0" }}>
                        <AlertPanel
                            alerts={alerts}
                            selectedId={selectedAlertId}
                            onSelect={setSelectedAlertId}
                            onEscalate={handleEscalate}
                            onIgnore={handleIgnore}
                            /* Pass VirtualAlertList as override when available in AlertPanel */
                            renderList={(filteredAlerts: Alert[]) => (
                                <VirtualAlertList
                                    alerts={filteredAlerts}
                                    selectedId={selectedAlertId}
                                    onSelect={setSelectedAlertId}
                                    onEscalate={handleEscalate}
                                    onIgnore={handleIgnore}
                                    listLabel="Active alerts"
                                    style={{ height: "100%", overflow: "hidden" }}
                                />
                            )}
                        />
                    </div>
                </div>

                {/* History panel */}
                <div
                    id={panelId("history")}
                    role="tabpanel"
                    aria-labelledby={tabId("history")}
                    hidden={activeTab !== "history"}
                    style={{
                        flex: 1,
                        overflow: "hidden",
                        display: activeTab === "history" ? "flex" : "none",
                        flexDirection: "column",
                    }}
                >
                    {/* History filters */}
                    <FilterRow>
                        <SelectFilter
                            id={`${uid}-hist-status`}
                            label="Status"
                            value={historyStatus}
                            options={STATUS_OPTIONS}
                            onChange={(v) => setHistoryStatus(v as HistoryStatusFilter)}
                        />
                        <SelectFilter
                            id={`${uid}-hist-severity`}
                            label="Severity"
                            value={historySeverity}
                            options={SEVERITY_OPTIONS}
                            onChange={(v) => setHistorySeverity(v as SeverityFilter)}
                        />
                        <RefetchButton onClick={refetch} />
                    </FilterRow>

                    {/* Table */}
                    <div style={{ flex: 1, overflow: "auto" }}>
                        <AlertHistoryTable
                            groups={groups}
                            isLoading={historyLoading}
                            error={historyError}
                        />
                    </div>
                </div>
            </div>

            {/* Alert detail drawer — shared across both tabs */}
            {selectedAlert && (
                <AlertDrawer
                    alert={selectedAlert}
                    onClose={() => setSelectedAlertId(null)}
                    onApprove={handleApprove}
                    onEscalate={handleEscalate}
                    onIgnore={handleIgnore}
                />
            )}
        </>
    );
}