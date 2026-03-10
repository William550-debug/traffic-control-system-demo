'use client';

import { useState, useCallback, useMemo } from 'react';
import { useWsEvent } from '@/providers/websocket-provider';
import { MOCK_ALERTS } from '@/lib/mock-data';
import { sortBySeverity } from '@/lib/utils';
import type { Alert, Severity, AlertPendingAction } from '@/types';

// Track which action is pending per alert id
type PendingMap = Record<string, AlertPendingAction>;

interface AlertsState {
    alerts:           Alert[];
    criticalCount:    number;
    activeCount:      number;
    alertsBySeverity: Record<Severity, Alert[]>;
    pendingActions:   PendingMap;
    acknowledgeAlert: (id: string) => void;
    ignoreAlert:      (id: string) => void;
    resolveAlert:     (id: string) => void;
    dispatchAlert:    (id: string) => void;
}

// Simulate async server round-trip — resolves after ~900ms
function simulateServerAction(fn: () => void): Promise<void> {
    return new Promise(resolve => {
        setTimeout(() => {
            fn();
            resolve();
        }, 900);
    });
}

export function useAlerts(): AlertsState {
    const [alerts, setAlerts]   = useState<Alert[]>(MOCK_ALERTS);
    const [pending, setPending] = useState<PendingMap>({});

    // ── WebSocket events ────────────────────
    useWsEvent<Alert>('alert:new', useCallback((event) => {
        const newAlert = event.payload;
        setAlerts(prev => {
            if (prev.some(a => a.id === newAlert.id)) return prev;
            return sortBySeverity([newAlert, ...prev]);
        });
    }, []));

    useWsEvent<Alert>('alert:updated', useCallback((event) => {
        const updated = event.payload;
        setAlerts(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
    }, []));

    useWsEvent<{ id: string }>('alert:resolved', useCallback((event) => {
        const { id } = event.payload;
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
    }, []));

    // ── Optimistic helpers ──────────────────
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

    // ── Actions (optimistic + simulated async) ──
    const acknowledgeAlert = useCallback((id: string) => {
        // Optimistic: immediately show as acknowledged in the card
        setPendingFor(id, 'approve');
        void simulateServerAction(() => {
            setAlerts(prev => prev.map(a =>
                a.id === id ? { ...a, status: 'acknowledged', updatedAt: new Date() } : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    const ignoreAlert = useCallback((id: string) => {
        setPendingFor(id, 'ignore');
        void simulateServerAction(() => {
            setAlerts(prev => prev.map(a =>
                a.id === id ? { ...a, status: 'ignored', updatedAt: new Date() } : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    const resolveAlert = useCallback((id: string) => {
        setPendingFor(id, 'approve');
        void simulateServerAction(() => {
            setAlerts(prev => prev.map(a =>
                a.id === id ? { ...a, status: 'resolved', updatedAt: new Date() } : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    const dispatchAlert = useCallback((id: string) => {
        setPendingFor(id, 'dispatch');
        void simulateServerAction(() => {
            setAlerts(prev => prev.map(a =>
                a.id === id ? { ...a, status: 'acknowledged', updatedAt: new Date() } : a
            ));
            clearPendingFor(id);
        });
    }, [setPendingFor, clearPendingFor]);

    // ── Derived ────────────────────────────
    const activeAlerts = useMemo(
        () => alerts.filter(a => a.status === 'active' || a.status === 'acknowledged'),
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
        alerts: activeAlerts,
        criticalCount,
        activeCount:  activeAlerts.length,
        alertsBySeverity,
        pendingActions: pending,
        acknowledgeAlert,
        ignoreAlert,
        resolveAlert,
        dispatchAlert,
    };
}