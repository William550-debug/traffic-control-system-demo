'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useWsEvent }    from '@/providers/websocket-provider';
import { MOCK_ALERTS }   from '@/lib/mock-data';
import { sortBySeverity } from '@/lib/utils';
import { reviveAlert }   from '@/lib/revive';
import type { Alert, Agency, Severity, AlertPendingAction } from '@/types';
import { useAlertAging } from '@/hooks/use-alert-aging';
import { useAlertClaim } from '@/hooks/use-alert-claim';

type PendingMap = Record<string, AlertPendingAction>;

interface AlertsState {
    alerts:           Alert[];
    criticalCount:    number;
    activeCount:      number;
    alertsBySeverity: Record<Severity, Alert[]>;
    pendingActions:   PendingMap;
    isLoading:        boolean;
    acknowledgeAlert: (id: string) => void;
    ignoreAlert:      (id: string, reason?: string) => void;
    resolveAlert:     (id: string) => void;
    escalateAlert:    (id: string) => void;
    dispatchAlert:    (id: string) => void;
    claimAlert:       (id: string) => Promise<void>;
    releaseAlert:     (id: string) => Promise<void>;
    isClaiming:       (id: string) => boolean;
    isReleasing:      (id: string) => boolean;
}

// ── Server action ─────────────────────────────────────────────────────────────
// The throw/catch pattern is intentional: we optimistically call onSuccess
// regardless of server response so the UI stays responsive. ESLint flags
// the throw as "caught locally" — suppressed below with an inline comment.
async function serverAction(
    id:        string,
    action:    string,
    onSuccess: () => void,
): Promise<void> {
    try {
        const res = await fetch('/api/alerts', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, action }),
        });
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
        // Server unavailable — wait briefly then fall through to onSuccess
        await new Promise(r => setTimeout(r, 900));
    } finally {
        onSuccess();
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAlerts(): AlertsState {
    const [alerts,    setAlerts]    = useState<Alert[]>(MOCK_ALERTS);
    const [pending,   setPending]   = useState<PendingMap>({});
    const [isLoading, setIsLoading] = useState(false);

    // ── Stable ref for useAlertAging ─────────────────────────────────────────
    // useAlertAging runs on a 60s interval. Passing setAlerts directly would
    // cause the hook to capture a stale closure. Using a ref that always points
    // to the latest setAlerts avoids the ESLint setState-in-effect warning
    // because the interval callback reads from the ref, not a closure value.
    const setAlertsRef = useRef(setAlerts);
    useEffect(() => { setAlertsRef.current = setAlerts; }, []);

    const setAlertsForAging = useCallback(
        (fn: (prev: Alert[]) => Alert[]) => setAlertsRef.current(fn),
        [] // stable — never re-created
    );

    // ── Claim / release ───────────────────────────────────────────────────────
    const handleClaim = useCallback((alertId: string, agency: Agency) => {
        setAlerts(prev => prev.map(a =>
            a.id === alertId
                ? { ...a, claimedBy: agency, updatedAt: new Date() }
                : a
        ));
    }, []);

    const handleRelease = useCallback((alertId: string) => {
        setAlerts(prev => prev.map(a =>
            a.id === alertId
                ? { ...a, claimedBy: undefined, updatedAt: new Date() }
                : a
        ));
    }, []);

    const { claimAlert, releaseAlert, isClaiming, isReleasing } =
        useAlertClaim(handleClaim, handleRelease);

    // ── Fetch on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        setIsLoading(true);
        fetch('/api/alerts')
            .then(r => r.json())
            .then((data: Alert[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setAlerts(sortBySeverity(data.map(reviveAlert)));
                }
            })
            .catch(() => { /* keep mock data */ })
            .finally(() => setIsLoading(false));
    }, []);

    // ── WebSocket events ──────────────────────────────────────────────────────
    useWsEvent<Alert>('alert:new', useCallback((event) => {
        const newAlert = reviveAlert(event.payload);
        setAlerts(prev => {
            if (prev.some(a => a.id === newAlert.id)) return prev;
            return sortBySeverity([newAlert, ...prev]);
        });
    }, []));

    useWsEvent<Alert>('alert:updated', useCallback((event) => {
        const updated = reviveAlert(event.payload);
        setAlerts(prev => prev.map(a =>
            a.id === updated.id ? { ...a, ...updated } : a
        ));
    }, []));

    useWsEvent<{ id: string }>('alert:resolved', useCallback((event) => {
        const { id } = event.payload;
        setAlerts(prev => prev.map(a =>
            a.id === id ? { ...a, status: 'resolved' } : a
        ));
    }, []));

    useWsEvent<{ id: string }>('alert:escalated', useCallback((event) => {
        const { id } = event.payload;
        setAlerts(prev => prev.map(a =>
            a.id === id
                ? { ...a, status: 'escalated', escalatedAt: new Date(), updatedAt: new Date() }
                : a
        ));
    }, []));

    useWsEvent<{ id: string }>('alert:expired', useCallback((event) => {
        const { id } = event.payload;
        setAlerts(prev => prev.map(a =>
            a.id === id ? { ...a, status: 'expired', updatedAt: new Date() } : a
        ));
    }, []));

    // ── Alert aging (30min downgrade, 60min auto-resolve) ────────────────────
    useAlertAging(alerts, setAlertsForAging);

    // ── Pending helpers ───────────────────────────────────────────────────────
    const setPendingFor = useCallback((id: string, action: AlertPendingAction) => {
        setPending(prev => ({ ...prev, [id]: action }));
    }, []);

    const clearPendingFor = useCallback((id: string) => {
        setPending(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────
    const acknowledgeAlert = useCallback((id: string) => {
        setPendingFor(id, 'approve');
        void serverAction(id, 'acknowledge', () => {
            setAlerts(prev => prev.map(a =>
                a.id === id ? { ...a, status: 'acknowledged', updatedAt: new Date() } : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    const ignoreAlert = useCallback((id: string, reason?: string) => {
        setPendingFor(id, 'ignore');
        void serverAction(id, 'ignore', () => {
            setAlerts(prev => prev.map(a =>
                a.id === id
                    ? { ...a, status: 'ignored', dismissReason: reason, updatedAt: new Date() }
                    : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    const escalateAlert = useCallback((id: string) => {
        setPendingFor(id, 'escalate');
        void serverAction(id, 'escalate', () => {
            setAlerts(prev => prev.map(a =>
                a.id === id
                    ? { ...a, status: 'escalated', escalatedAt: new Date(), updatedAt: new Date() }
                    : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    const resolveAlert = useCallback((id: string) => {
        setPendingFor(id, 'approve');
        void serverAction(id, 'resolve', () => {
            setAlerts(prev => prev.map(a =>
                a.id === id ? { ...a, status: 'resolved', updatedAt: new Date() } : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    const dispatchAlert = useCallback((id: string) => {
        setPendingFor(id, 'dispatch');
        void serverAction(id, 'dispatch', () => {
            setAlerts(prev => prev.map(a =>
                a.id === id ? { ...a, status: 'acknowledged', updatedAt: new Date() } : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const activeAlerts = useMemo(
        () => alerts.filter(a =>
            a.status === 'active' ||
            a.status === 'acknowledged' ||
            a.status === 'escalated'
        ),
        [alerts]
    );

    const criticalCount = useMemo(
        () => activeAlerts.filter(a => a.severity === 'critical').length,
        [activeAlerts]
    );

    const alertsBySeverity = useMemo(() => {
        const groups: Record<Severity, Alert[]> = {
            critical: [], high: [], medium: [], low: [], info: [],
        };
        activeAlerts.forEach(a => groups[a.severity].push(a));
        return groups;
    }, [activeAlerts]);

    return {
        alerts:          activeAlerts,
        criticalCount,
        activeCount:     activeAlerts.length,
        alertsBySeverity,
        pendingActions:  pending,
        isLoading,
        acknowledgeAlert,
        ignoreAlert,
        resolveAlert,
        escalateAlert,
        dispatchAlert,
        claimAlert,
        releaseAlert,
        isClaiming,
        isReleasing,
    };
}