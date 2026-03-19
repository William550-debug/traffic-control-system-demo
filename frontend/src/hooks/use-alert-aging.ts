'use client';

/**
 * useAlertAging
 * -------------
 * Client-side alert lifecycle manager. Runs on a 60-second interval and:
 *
 *  - AUTO-DOWNGRADE (30 min):
 *    critical  → high
 *    high      → medium
 *    medium    → low
 *    Only applies to 'active' alerts with no assignedAgency (unattended).
 *    Adds a "⬇ Auto-downgraded" prefix to the dismissReason for audit trail.
 *
 *  - AUTO-RESOLVE (60 min):
 *    Any 'active' or 'acknowledged' alert older than 60min is set to 'resolved'.
 *    POSTs to /api/alerts PATCH for server sync (non-blocking, silent on fail).
 *
 *  - EXPIRY (alert.expiresAt):
 *    If alert.expiresAt is set and has passed, status → 'expired'.
 *    Server fires 'alert:expired' WS event too — this handles the case
 *    where WS is delayed or missed.
 *
 * Usage:
 *   Call once inside useAlerts() or at the top of OperatorShell.
 *   Pass the current alerts array and a setter from useAlerts.
 *
 * Fires PATCH /api/alerts for each aged/resolved alert — non-blocking,
 * silent fallback (optimistic local update already applied).
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Alert, Severity } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const DOWNGRADE_AFTER_MS =  30 * 60 * 1000;  // 30 minutes
const RESOLVE_AFTER_MS   =  60 * 60 * 1000;  // 60 minutes //4* 60 * 1000;
const CHECK_INTERVAL_MS  = 60 * 1000;        // check every 60 seconds // 15 * 1000

const SEVERITY_DOWNGRADE: Partial<Record<Severity, Severity>> = {
    critical: 'high',
    high:     'medium',
    medium:   'low',
    // low and info are not downgraded
};

// ─── Server sync (fire-and-forget) ───────────────────────────────────────────

async function syncToServer(id: string, patch: Partial<Alert>): Promise<void> {
    try {
        await fetch('/api/alerts', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, ...patch }),
        });
    } catch {
        // silent — local state already updated optimistically
    }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgingResult {
    /** IDs of alerts that were downgraded */
    downgraded: string[];
    /** IDs of alerts that were resolved */
    resolved:   string[];
    /** IDs of alerts that were expired */
    expired:    string[];
}

type AlertUpdater = (fn: (prev: Alert[]) => Alert[]) => void;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAlertAging(
    alerts:     Alert[],
    setAlerts:  AlertUpdater,
): void {
    // Keep a stable ref so the interval closure always reads latest alerts
    const alertsRef = useRef<Alert[]>(alerts);
    useEffect(() => { alertsRef.current = alerts; }, [alerts]);

    const runAging = useCallback((): AgingResult => {
        const now       = Date.now();
        const result: AgingResult = { downgraded: [], resolved: [], expired: [] };
        const patches: Array<{ id: string; patch: Partial<Alert> }> = [];

        const updated = alertsRef.current.map(alert => {
            // Only process active/acknowledged alerts
            if (alert.status !== 'active' && alert.status !== 'acknowledged') {
                return alert;
            }

            const ageMs = now - new Date(alert.detectedAt).getTime();

            // ── 1. Check expiresAt ───────────────────────────────────────────────
            if (alert.expiresAt && new Date(alert.expiresAt).getTime() < now) {
                const patch: Partial<Alert> = { status: 'expired', updatedAt: new Date() };
                result.expired.push(alert.id);
                patches.push({ id: alert.id, patch });
                return { ...alert, ...patch };
            }

            // ── 2. Auto-resolve after 60 min ─────────────────────────────────────
            if (ageMs >= RESOLVE_AFTER_MS) {
                const patch: Partial<Alert> = {
                    status:    'resolved',
                    updatedAt: new Date(),
                };
                result.resolved.push(alert.id);
                patches.push({ id: alert.id, patch });
                return { ...alert, ...patch };
            }

            // ── 3. Auto-downgrade after 30 min (unattended only) ─────────────────
            if (
                ageMs >= DOWNGRADE_AFTER_MS &&
                alert.status === 'active' &&       // not already acknowledged/escalated
                !alert.assignedAgency &&           // not claimed by any agency
                !alert.claimedBy &&
                SEVERITY_DOWNGRADE[alert.severity] // severity can be downgraded
            ) {
                const newSeverity = SEVERITY_DOWNGRADE[alert.severity]!;

                // Only downgrade once: check if dismissReason already marks a downgrade
                const alreadyDowngraded = alert.dismissReason?.startsWith('⬇ Auto-downgraded');
                if (alreadyDowngraded) return alert;

                const patch: Partial<Alert> = {
                    severity:      newSeverity,
                    updatedAt:     new Date(),
                    dismissReason: `⬇ Auto-downgraded from ${alert.severity} after 30min unattended`,
                };
                result.downgraded.push(alert.id);
                patches.push({ id: alert.id, patch });
                return { ...alert, ...patch };
            }

            return alert;
        });

        // Apply batch update only if something changed
        if (patches.length > 0) {
            setAlerts(() => updated);
            // Fire server syncs in parallel, non-blocking
            patches.forEach(({ id, patch }) => void syncToServer(id, patch));
        }

        return result;
    }, [setAlerts]);

    useEffect(() => {
        // Run immediately on mount to catch any already-aged alerts
        runAging();

        const interval = setInterval(runAging, CHECK_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [runAging]);
}

// ─── Utility: get aging state for a single alert ─────────────────────────────

export interface AlertAgingState {
    /** Minutes since detection */
    ageMinutes:     number;
    /** Whether the alert is past the 30-min downgrade threshold */
    isStale:        boolean;
    /** Whether the alert is approaching the 60-min resolve threshold */
    isNearExpiry:   boolean;
    /** 0–100 progress toward auto-resolve */
    resolveProgress: number;
}

export function getAlertAgingState(alert: Alert): AlertAgingState {
    const ageMs         = Date.now() - new Date(alert.detectedAt).getTime();
    const ageMinutes    = Math.floor(ageMs / 60_000);
    const isStale       = ageMs >= DOWNGRADE_AFTER_MS;
    const isNearExpiry  = ageMs >= RESOLVE_AFTER_MS * 0.75; // 45min+
    const resolveProgress = Math.min(100, (ageMs / RESOLVE_AFTER_MS) * 100);

    return { ageMinutes, isStale, isNearExpiry, resolveProgress };
}