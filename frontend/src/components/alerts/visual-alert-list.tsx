"use client";

/**
 * VirtualAlertList
 * ----------------
 * Virtualised alert list using IntersectionObserver — no react-window dependency.
 * Renders only visible rows plus a configurable overscan buffer.
 *
 * Prop contract matches AlertCard exactly:
 *   focused / onSelect(alert) / onApprove / onIgnore / onEscalate / onDispatch
 */

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { AlertCard } from "@/components/alerts/alert-card";
import type { Alert, AlertPendingAction } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT_COLLAPSED = 120;  // px — matches AlertCard collapsed height
const ROW_HEIGHT_FOCUSED   = 224;  // px — matches AlertCard expanded height
const ROW_GAP              = 8;    // px — gap between cards
const OVERSCAN             = 3;    // extra rows rendered above/below viewport

// ─── Public props ─────────────────────────────────────────────────────────────

export interface VirtualAlertListProps {
    alerts:          Alert[];
    focusedAlertId?: string | null;
    pendingActions?: Record<string, AlertPendingAction>;
    isHumanMode?:    boolean;
    onAlertSelect:   (alert: Alert) => void;
    onApprove:       (id: string) => void;
    onIgnore:        (id: string, reason?: string) => void;
    onDispatch?:     (id: string) => void;
    onEscalate?:     (id: string) => void;
    listLabel?:      string;
}

// ─── ARIA live-region announcer ───────────────────────────────────────────────

function useAlertsAnnouncer(alerts: Alert[]): string {
    const [announcement, setAnnouncement] = useState("");
    const prevIdsRef = useRef(new Set(alerts.map((a) => a.id)));

    useEffect(() => {
        const newAlerts = alerts.filter((a) => !prevIdsRef.current.has(a.id));
        if (newAlerts.length > 0) {
            const critical = newAlerts.filter((a) => a.severity === "critical");
            setAnnouncement(
                critical.length > 0
                    ? `${critical.length} new critical alert${critical.length > 1 ? "s" : ""}: ${critical.map((a) => a.title).join(", ")}`
                    : `${newAlerts.length} new alert${newAlerts.length > 1 ? "s" : ""} received`
            );
        }
        prevIdsRef.current = new Set(alerts.map((a) => a.id));
    }, [alerts]);

    useEffect(() => {
        if (!announcement) return;
        const t = setTimeout(() => setAnnouncement(""), 500);
        return () => clearTimeout(t);
    }, [announcement]);

    return announcement;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div
            role="status"
            aria-label="No alerts"
            style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", height: "200px", gap: "12px",
                color: "var(--color-text-muted)", fontFamily: "var(--font-mono)",
                fontSize: "13px", letterSpacing: "0.05em",
            }}
        >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="16" cy="16" r="14" stroke="var(--color-border)" strokeWidth="1.5" />
                <path d="M10 16.5l4.5 4.5 7.5-9" stroke="var(--color-success, #22c55e)"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>No alerts match the current filters</span>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VirtualAlertList({
                                     alerts,
                                     focusedAlertId,
                                     pendingActions = {},
                                     isHumanMode    = false,
                                     onAlertSelect,
                                     onApprove,
                                     onIgnore,
                                     onDispatch,
                                     onEscalate,
                                     listLabel = "Active alerts",
                                 }: VirtualAlertListProps) {
    const scrollRef   = useRef<HTMLDivElement>(null);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

    // Row height helper — accounts for focused card being taller
    const rowHeight = useCallback(
        (index: number) =>
            (alerts[index]?.id === focusedAlertId ? ROW_HEIGHT_FOCUSED : ROW_HEIGHT_COLLAPSED) + ROW_GAP,
        [alerts, focusedAlertId]
    );

    // Total scrollable height — sum of all row heights
    const totalHeight = alerts.reduce((sum, _, i) => sum + rowHeight(i), 0);

    // Pixel offset of each row's top edge
    const rowOffsets = React.useMemo(() => {
        const offsets: number[] = [];
        let acc = 0;
        for (let i = 0; i < alerts.length; i++) {
            offsets.push(acc);
            acc += rowHeight(i);
        }
        return offsets;
    }, [alerts, rowHeight]);

    // Recalculate visible range on scroll
    const updateVisibleRange = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const { scrollTop, clientHeight } = el;
        const viewTop    = scrollTop - OVERSCAN * ROW_HEIGHT_COLLAPSED;
        const viewBottom = scrollTop + clientHeight + OVERSCAN * ROW_HEIGHT_COLLAPSED;

        let start = 0;
        let end   = alerts.length - 1;

        for (let i = 0; i < rowOffsets.length; i++) {
            if (rowOffsets[i] < viewTop) start = i;
            if (rowOffsets[i] <= viewBottom) end = i;
            else break;
        }

        setVisibleRange({ start: Math.max(0, start), end: Math.min(alerts.length - 1, end) });
    }, [alerts.length, rowOffsets]);

    useEffect(() => {
        updateVisibleRange();
    }, [updateVisibleRange]);

    // Scroll focused alert into view
    useEffect(() => {
        if (!focusedAlertId) return;
        const idx = alerts.findIndex((a) => a.id === focusedAlertId);
        if (idx === -1 || !scrollRef.current) return;
        const el        = scrollRef.current;
        const itemTop   = rowOffsets[idx] ?? 0;
        const itemBot   = itemTop + rowHeight(idx);
        const { scrollTop, clientHeight } = el;
        if (itemTop < scrollTop) {
            el.scrollTo({ top: itemTop - ROW_GAP, behavior: "smooth" });
        } else if (itemBot > scrollTop + clientHeight) {
            el.scrollTo({ top: itemBot - clientHeight + ROW_GAP, behavior: "smooth" });
        }
    }, [focusedAlertId, alerts, rowOffsets, rowHeight]);

    // Keyboard navigation ↑ / ↓
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const idx = alerts.findIndex((a) => a.id === focusedAlertId);
            if (e.key === "ArrowDown") {
                e.preventDefault();
                const next = alerts[Math.min(idx + 1, alerts.length - 1)];
                if (next) onAlertSelect(next);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const prev = alerts[Math.max(idx - 1, 0)];
                if (prev) onAlertSelect(prev);
            }
        },
        [alerts, focusedAlertId, onAlertSelect]
    );

    const announcement = useAlertsAnnouncer(alerts);

    if (alerts.length === 0) return <EmptyState />;

    return (
        <div
            style={{ position: "relative", width: "100%", height: "100%" }}
            role="region"
            aria-label={listLabel}
        >
            {/* Visually-hidden ARIA live region */}
            <div
                role="log"
                aria-live="assertive"
                aria-atomic="true"
                aria-relevant="additions"
                style={{
                    position: "absolute", width: "1px", height: "1px",
                    overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
                }}
            >
                {announcement}
            </div>

            {/* Scrollable viewport */}
            <div
                ref={scrollRef}
                onScroll={updateVisibleRange}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="list"
                style={{
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "hidden",
                    outline: "none",
                    scrollbarWidth: "thin",
                    scrollbarColor: "var(--color-border) transparent",
                    position: "relative",
                }}
            >
                {/* Spacer that establishes full scroll height */}
                <div style={{ height: totalHeight, position: "relative" }}>
                    {alerts.slice(visibleRange.start, visibleRange.end + 1).map((alert, relIdx) => {
                        const absIdx  = visibleRange.start + relIdx;
                        const top     = rowOffsets[absIdx] ?? 0;
                        const focused = alert.id === focusedAlertId;

                        return (
                            <div
                                key={alert.id}
                                role="listitem"
                                style={{
                                    position: "absolute",
                                    top,
                                    left:   0,
                                    right:  "4px",
                                    height: rowHeight(absIdx) - ROW_GAP,
                                }}
                            >
                                <AlertCard
                                    alert={alert}
                                    focused={focused}
                                    pendingAction={pendingActions[alert.id]}
                                    isHumanMode={isHumanMode}
                                    onSelect={onAlertSelect}
                                    onApprove={onApprove}
                                    onIgnore={onIgnore}
                                    onDispatch={onDispatch}
                                    onEscalate={onEscalate}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}