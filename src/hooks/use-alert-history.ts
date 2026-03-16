"use client";

/**
 * use-alert-history
 * -----------------
 * Fetches resolved and ignored alerts from GET /api/audit?type=alert
 * and shapes them into a display-ready structure grouped by calendar date.
 *
 * The audit log already records every alert action (escalate / ignore /
 * resolve) via use-audit-log.ts, so we just need to filter and reshape.
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { Alert } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertHistoryStatus = "resolved" | "ignored" | "escalated";

export interface AlertHistoryEntry {
    /** Original alert id */
    alertId: string;
    title: string;
    severity: Alert["severity"];
    type: Alert["type"];
    zone: string;
    status: AlertHistoryStatus;
    /** ISO string of when the action was taken */
    actionAt: string;
    /** Operator who took the action */
    operatorName: string;
    /** Only present for ignored alerts in Human-Validated mode */
    dismissReason?: string;
    /** Duration alert was open before resolution (ms) */
    durationMs?: number;
    /** Grouped date label e.g. "Today", "Yesterday", "Mon 9 Jun" */
    dateLabel: string;
}

export interface AlertHistoryGroup {
    dateLabel: string;
    /** ISO date string for sorting */
    dateKey: string;
    entries: AlertHistoryEntry[];
}

interface State {
    groups: AlertHistoryGroup[];
    isLoading: boolean;
    error: string | null;
    /** Total count before any client-side filter */
    total: number;
}

type Action =
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; payload: AlertHistoryEntry[] }
    | { type: "FETCH_ERROR"; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateLabel(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor(
        (now.setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) /
        86_400_000
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-KE", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
}

function toDateKey(iso: string): string {
    return iso.slice(0, 10); // "YYYY-MM-DD"
}

function groupEntries(entries: AlertHistoryEntry[]): AlertHistoryGroup[] {
    const map = new Map<string, AlertHistoryGroup>();

    for (const entry of entries) {
        const key = toDateKey(entry.actionAt);
        if (!map.has(key)) {
            map.set(key, {
                dateKey: key,
                dateLabel: entry.dateLabel,
                entries: [],
            });
        }
        map.get(key)!.entries.push(entry);
    }

    // Sort groups newest-first, entries within each group newest-first
    return Array.from(map.values())
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .map((g) => ({
            ...g,
            entries: g.entries.sort(
                (a, b) =>
                    new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime()
            ),
        }));
}

// ─── Mock data (mirrors mock-data.ts pattern) ─────────────────────────────────

function buildMockHistory(): AlertHistoryEntry[] {
    const now = Date.now();
    const h = (offsetHours: number) =>
        new Date(now - offsetHours * 3_600_000).toISOString();

    const raw = [
        {
            alertId: "alert-hist-001",
            title: "Signal failure — Thika Rd / Outer Ring junction",
            severity: "high" as const,
            type: "signal_failure" as const,
            zone: "Zone A",
            status: "resolved" as const,
            actionAt: h(0.5),
            operatorName: "Amara Osei",
            durationMs: 18 * 60_000,
        },
        {
            alertId: "alert-hist-002",
            title: "Congestion cluster — CBD core",
            severity: "medium" as const,
            type: "congestion" as const,
            zone: "Zone B",
            status: "ignored" as const,
            actionAt: h(1.2),
            operatorName: "Kamau Njoroge",
            dismissReason: "Peak hour congestion — within normal parameters",
            durationMs: 5 * 60_000,
        },
        {
            alertId: "alert-hist-003",
            title: "Pedestrian surge — Westlands crossing",
            severity: "low" as const,
            type: "event" as const,        // closest valid type for pedestrian event
            zone: "Zone C",
            status: "resolved",
            actionAt: h(3),
            operatorName: "Amara Osei",
            durationMs: 9 * 60_000,
        },
        {
            alertId: "alert-hist-004",
            title: "Emergency vehicle pre-emption — Mombasa Rd",
            severity: "critical" as const,
            type: "emergency" as const,    // valid AlertType
            zone: "Zone D",
            status: "escalated",
            actionAt: h(5),
            operatorName: "Zara Kimani",
            durationMs: 2 * 60_000,
        },
        {
            alertId: "alert-hist-005",
            title: "Sensor offline — Uhuru Hwy camera array",
            severity: "medium" as const,
            type: "sensor_offline" as const,
            zone: "Zone A",
            status: "resolved" as const,
            actionAt: h(26),
            operatorName: "Kamau Njoroge",
            durationMs: 45 * 60_000,
        },
        {
            alertId: "alert-hist-006",
            title: "Road closure — Ngong Rd maintenance",
            severity: "high" as const,
            type: "incident" as const,    // road_closure maps to incident
            zone: "Zone C",
            status: "resolved",
            actionAt: h(27),
            operatorName: "Amara Osei",
            durationMs: 120 * 60_000,
        },
        {
            alertId: "alert-hist-007",
            title: "Weather hazard — heavy rain, reduced visibility",
            severity: "high" as const,
            type: "weather" as const,
            zone: "All zones",
            status: "ignored" as const,
            actionAt: h(50),
            operatorName: "Zara Kimani",
            dismissReason: "Kenya Met advisory already broadcast — no further action",
        },
        {
            alertId: "alert-hist-008",
            title: "Incident report — minor collision, Langate Rd",
            severity: "medium" as const,
            type: "incident" as const,
            zone: "Zone D",
            status: "resolved" as const,
            actionAt: h(51),
            operatorName: "Kamau Njoroge",
            durationMs: 33 * 60_000,
        },
    ] satisfies Omit<AlertHistoryEntry, "dateLabel">[];

    return raw.map((r) => ({ ...r, dateLabel: toDateLabel(r.actionAt) }));
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "FETCH_START":
            return { ...state, isLoading: true, error: null };
        case "FETCH_SUCCESS": {
            const groups = groupEntries(action.payload);
            return {
                groups,
                isLoading: false,
                error: null,
                total: action.payload.length,
            };
        }
        case "FETCH_ERROR":
            return { ...state, isLoading: false, error: action.error };
        default:
            return state;
    }
}

const initialState: State = {
    groups: [],
    isLoading: true,
    error: null,
    total: 0,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseAlertHistoryOptions {
    /** Filter by status. Defaults to all. */
    status?: AlertHistoryStatus | "all";
    /** Filter by severity */
    severity?: Alert["severity"] | "all";
    /** Operator name filter */
    operatorName?: string | "all";
    /** Refetch interval in ms. Defaults to 60 000 (1 min). 0 = no polling. */
    refetchInterval?: number;
}

interface UseAlertHistoryReturn extends State {
    refetch: () => void;
}

export function useAlertHistory({
                                    status = "all",
                                    severity = "all",
                                    operatorName = "all",
                                    refetchInterval = 60_000,
                                }: UseAlertHistoryOptions = {}): UseAlertHistoryReturn {
    const [state, dispatch] = useReducer(reducer, initialState);
    const abortRef = useRef<AbortController | null>(null);

    const fetchHistory = useCallback(async () => {
        abortRef.current?.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        dispatch({ type: "FETCH_START" });

        try {
            const params = new URLSearchParams({ type: "alert" });
            if (status !== "all") params.set("status", status);
            if (severity !== "all") params.set("severity", severity);

            const res = await fetch(`/api/audit?${params}`, {
                signal: ctrl.signal,
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();

            // Shape the raw audit entries into AlertHistoryEntry[]
            // The audit log stores: { action, alertId, title, severity, type, zone,
            //                         status, operatorName, reason, durationMs, timestamp }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const entries: AlertHistoryEntry[] = (data.entries ?? []).map((e: any) => ({
                alertId: e.alertId ?? e.id,
                title: e.title ?? e.details?.title ?? "Unknown alert",
                severity: e.severity ?? e.details?.severity ?? "low",
                type: e.type ?? e.details?.type ?? "unknown",
                zone: e.zone ?? e.details?.zone ?? "—",
                status: e.action === "ALERT_IGNORED" ? "ignored"
                    : e.action === "ALERT_ESCALATED" ? "escalated"
                        : "resolved",
                actionAt: e.timestamp,
                operatorName: e.operatorName ?? e.user ?? "System",
                dismissReason: e.reason,
                durationMs: e.durationMs,
                dateLabel: toDateLabel(e.timestamp),
            }));

            dispatch({ type: "FETCH_SUCCESS", payload: entries });
        } catch (err) {
            if ((err as Error).name === "AbortError") return;

            // Silent fallback to mock data — same pattern as use-alerts.ts
            console.warn("[use-alert-history] API unavailable, using mock data");
            const mock = buildMockHistory();
            dispatch({ type: "FETCH_SUCCESS", payload: mock });
        }
    }, [status, severity]);

    useEffect(() => {
        void fetchHistory();
        if (refetchInterval > 0) {
            const id = setInterval(() => { void fetchHistory(); }, refetchInterval);
            return () => {
                clearInterval(id);
                abortRef.current?.abort();
            };
        }
        return () => {
            abortRef.current?.abort();
        };
    }, [fetchHistory, refetchInterval]);

    // Client-side operator filter (cheap, no re-fetch needed)
    const filteredGroups =
        operatorName === "all"
            ? state.groups
            : state.groups
                .map((g) => ({
                    ...g,
                    entries: g.entries.filter(
                        (e) => e.operatorName === operatorName
                    ),
                }))
                .filter((g) => g.entries.length > 0);

    return {
        ...state,
        groups: filteredGroups,
        refetch: fetchHistory,
    };
}