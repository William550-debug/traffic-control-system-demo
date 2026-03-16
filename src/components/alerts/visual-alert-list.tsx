"use client";

/**
 * VirtualAlertList
 * ----------------
 * A react-window VariableSizeList wrapper around AlertCard.
 * Handles variable row heights (cards expand when selected),
 * ARIA live-region announcements, and keyboard navigation.
 *
 * Usage:
 *   <VirtualAlertList
 *     alerts={alerts}
 *     selectedId={selectedId}
 *     onSelect={setSelectedId}
 *     height={600}          // px — parent controls this
 *   />
 */

import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { VariableSizeList } from "react-window";
import type { ListChildComponentProps } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { AlertCard } from "@/components/alerts/alert-card";
import type { Alert } from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Collapsed card height (matches the card's own CSS) */
const ROW_HEIGHT_COLLAPSED = 112;
/** Expanded / selected card height */
const ROW_HEIGHT_EXPANDED = 220;
/** Padding between rows */
const ROW_GAP = 8;

// ─── Types ───────────────────────────────────────────────────────────────────

interface VirtualAlertListProps {
    alerts: Alert[];
    selectedId?: string | null;
    onSelect?: (id: string | null) => void;
    /** Optional controlled height; if omitted AutoSizer fills the container */
    height?: number;
    /** Passed straight through to AlertCard */
    onEscalate?: (id: string) => void;
    onIgnore?: (id: string, reason: string) => void;
    className?: string;
    /** aria-label for the outer list element */
    listLabel?: string;
}

// ─── Row renderer ────────────────────────────────────────────────────────────

interface RowData {
    alerts: Alert[];
    selectedId?: string | null;
    onSelect: (id: string | null) => void;
    onEscalate?: (id: string) => void;
    onIgnore?: (id: string, reason: string) => void;
}

const Row = React.memo(
    ({ index, style, data }: ListChildComponentProps<RowData>) => {
        const { alerts, selectedId, onSelect, onEscalate, onIgnore } = data;
        const alert = alerts[index];
        const isSelected = alert.id === selectedId;

        return (
            <div
                style={{
                    ...style,
                    // Shrink the row's rendered area by the gap so cards don't touch
                    top: `${parseFloat(style.top as string) + ROW_GAP / 2}px`,
                    height: `${parseFloat(style.height as string) - ROW_GAP}px`,
                    paddingRight: "4px", // room for custom scrollbar
                }}
            >
                <AlertCard
                    alert={alert}
                    isSelected={isSelected}
                    onClick={() => onSelect(isSelected ? null : alert.id)}
                    onEscalate={onEscalate}
                    onIgnore={onIgnore}
                />
            </div>
        );
    }
);
Row.displayName = "VirtualAlertRow";

// ─── ARIA announcer ──────────────────────────────────────────────────────────

/**
 * Maintains a visually-hidden live region so screen readers announce
 * incoming high-severity alerts without disrupting focus.
 */
function useAlertsAnnouncer(alerts: Alert[]) {
    const [announcement, setAnnouncement] = useState("");
    const prevCountRef = useRef(alerts.length);
    const prevIdsRef = useRef(new Set(alerts.map((a) => a.id)));

    useEffect(() => {
        const currentIds = new Set(alerts.map((a) => a.id));
        const newAlerts = alerts.filter((a) => !prevIdsRef.current.has(a.id));

        if (newAlerts.length > 0) {
            const critical = newAlerts.filter(
                (a) => a.severity === "critical"
            );
            if (critical.length > 0) {
                setAnnouncement(
                    `${critical.length} new critical alert${
                        critical.length > 1 ? "s" : ""
                    }: ${critical.map((a) => a.title).join(", ")}`
                );
            } else {
                setAnnouncement(
                    `${newAlerts.length} new alert${newAlerts.length > 1 ? "s" : ""} received`
                );
            }
        }

        prevIdsRef.current = currentIds;
        prevCountRef.current = alerts.length;
    }, [alerts]);

    // Clear announcement after it's been read (500ms is enough for AT)
    useEffect(() => {
        if (!announcement) return;
        const t = setTimeout(() => setAnnouncement(""), 500);
        return () => clearTimeout(t);
    }, [announcement]);

    return announcement;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function VirtualAlertList({
                                     alerts,
                                     selectedId,
                                     onSelect,
                                     height,
                                     onEscalate,
                                     onIgnore,
                                     className,
                                     listLabel = "Active alerts",
                                 }: VirtualAlertListProps) {
    const listRef = useRef<VariableSizeList>(null);

    const handleSelect = useCallback(
        (id: string | null) => {
            onSelect?.(id);
        },
        [onSelect]
    );

    // Row height function — expanded row gets more space
    const getItemSize = useCallback(
        (index: number) => {
            const alert = alerts[index];
            const isSelected = alert?.id === selectedId;
            return (isSelected ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT_COLLAPSED) + ROW_GAP;
        },
        [alerts, selectedId]
    );

    // When selectedId changes we must tell react-window to recalculate sizes
    // from the previously selected item onward
    const prevSelectedIdRef = useRef<string | null | undefined>(null);
    useLayoutEffect(() => {
        if (prevSelectedIdRef.current !== selectedId) {
            // Reset from the earlier of the two indices
            const oldIdx = alerts.findIndex((a) => a.id === prevSelectedIdRef.current);
            const newIdx = alerts.findIndex((a) => a.id === selectedId);
            const resetFrom = Math.max(
                0,
                Math.min(
                    oldIdx === -1 ? Infinity : oldIdx,
                    newIdx === -1 ? Infinity : newIdx
                )
            );
            if (resetFrom !== Infinity) {
                listRef.current?.resetAfterIndex(resetFrom);
            }
            prevSelectedIdRef.current = selectedId;
        }
    }, [selectedId, alerts]);

    // Scroll newly-selected item into view
    useEffect(() => {
        if (selectedId == null) return;
        const idx = alerts.findIndex((a) => a.id === selectedId);
        if (idx !== -1) {
            listRef.current?.scrollToItem(idx, "smart");
        }
    }, [selectedId, alerts]);

    // Keyboard navigation: ↑/↓ moves selection, Enter opens drawer, Esc clears
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const idx = alerts.findIndex((a) => a.id === selectedId);
            if (e.key === "ArrowDown") {
                e.preventDefault();
                const next = Math.min(idx + 1, alerts.length - 1);
                handleSelect(alerts[next]?.id ?? null);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const prev = Math.max(idx - 1, 0);
                handleSelect(alerts[prev]?.id ?? null);
            } else if (e.key === "Escape") {
                handleSelect(null);
            }
        },
        [alerts, selectedId, handleSelect]
    );

    const itemData = useMemo<RowData>(
        () => ({ alerts, selectedId, onSelect: handleSelect, onEscalate, onIgnore }),
        [alerts, selectedId, handleSelect, onEscalate, onIgnore]
    );

    const announcement = useAlertsAnnouncer(alerts);

    const inner = (listHeight: number) => (
        <VariableSizeList
            ref={listRef}
            height={listHeight}
            itemCount={alerts.length}
            itemSize={getItemSize}
            itemData={itemData}
            width="100%"
            overscanCount={4}
            // Let react-window know the outer element needs role/aria attributes
            outerElementType={OuterElement}
            innerElementType={InnerElement}
        >
            {Row}
        </VariableSizeList>
    );

    return (
        <div
            className={className}
            style={{ position: "relative", width: "100%", height: height ?? "100%" }}
            onKeyDown={handleKeyDown}
            role="region"
            aria-label={listLabel}
        >
            {/* ARIA live region — visually hidden, always in DOM */}
            <div
                role="log"
                aria-live="assertive"
                aria-atomic="true"
                aria-relevant="additions"
                style={{
                    position: "absolute",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                    clip: "rect(0 0 0 0)",
                    whiteSpace: "nowrap",
                }}
            >
                {announcement}
            </div>

            {alerts.length === 0 ? (
                <EmptyState />
            ) : height != null ? (
                inner(height)
            ) : (
                <AutoSizer>{({ height: h }: { height: number; width: number }) => inner(h)}</AutoSizer>
            )}
        </div>
    );
}

// ─── Custom outer / inner elements for react-window ──────────────────────────

/**
 * The outer scrollable div — we add role="listbox" so AT treats each card
 * as an option and announces selection state.
 */
const OuterElement = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
    <div
        ref={ref}
        {...props}
        role="listbox"
        aria-multiselectable="false"
        tabIndex={0}
        style={{
            ...(props.style as React.CSSProperties),
            // Custom slim scrollbar — matches control-room dark theme
            scrollbarWidth: "thin",
            scrollbarColor: "var(--color-border) transparent",
        }}
    />
));
OuterElement.displayName = "VirtualListOuter";

/** Inner div — just a plain div, no extra role needed */
const InnerElement = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <div ref={ref} {...props} role="presentation" />);
InnerElement.displayName = "VirtualListInner";

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                gap: "12px",
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                letterSpacing: "0.05em",
            }}
            role="status"
            aria-label="No alerts"
        >
            {/* Simple checkmark icon inline so no icon lib dependency */}
            <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
            >
                <circle
                    cx="16"
                    cy="16"
                    r="14"
                    stroke="var(--color-border)"
                    strokeWidth="1.5"
                />
                <path
                    d="M10 16.5l4.5 4.5 7.5-9"
                    stroke="var(--color-success, #22c55e)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <span>No alerts match the current filters</span>
        </div>
    );
}