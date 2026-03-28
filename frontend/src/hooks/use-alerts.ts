'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWebSocket } from './use-websocket';
import { sortBySeverity } from '@/lib/utils';
import { reviveAlert } from '@/lib/revive';
import type { Alert, Severity, AlertPendingAction } from '@/types';

type PendingMap = Record<string, AlertPendingAction>;

// ── API helpers ───────────────────────────────────────────────────────────────

function getOperatorHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const op = (window as any).__atmsOperator;
    return op ? { 'X-Operator-Id': op } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json', ...getOperatorHeader() },
        ...options,
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error ?? 'Request failed');
    return body.data as T;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [pending, setPending] = useState<PendingMap>({});
    const [isLoading, setIsLoading] = useState(true);

    // ── Fetch on mount ────────────────────────────────────────────────────────
    useEffect(() => {
        apiFetch<Alert[]>('/api/alerts')
            .then(data => setAlerts(sortBySeverity(data.map(reviveAlert))))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    // ── WebSocket events ──────────────────────────────────────────────────────
    useWebSocket<Alert>('alert:created', useCallback((newAlert) => {
        const hydrated = reviveAlert(newAlert);
        setAlerts(prev => prev.some(a => a.id === hydrated.id) ? prev : sortBySeverity([hydrated, ...prev]));
    }, []));

    useWebSocket<Alert>('alert:updated', useCallback((updated) => {
        const hydrated = reviveAlert(updated);
        setAlerts(prev => prev.map(a => a.id === hydrated.id ? hydrated : a));
    }, []));

    // ── Action Wrapper ────────────────────────────────────────────────────────
    const performAction = async (id: string, action: AlertPendingAction, call: () => Promise<Alert>) => {
        setPending(prev => ({ ...prev, [id]: action }));
        try {
            const updated = await call();
            setAlerts(prev => prev.map(a => a.id === id ? updated : a));
        } catch (err) {
            console.error(`Action ${action} failed:`, err);
        } finally {
            setPending(prev => { const n = { ...prev }; delete n[id]; return n; });
        }
    };

    // ── Actions matching Component Names ──────────────────────────────────────
    return {
        alerts,
        pendingActions: pending,
        isLoading,
        acknowledgeAlert: (id: string) => performAction(id, 'approve', () => apiFetch<Alert>(`/api/alerts/${id}/acknowledge`, { method: 'POST' })),
        ignoreAlert: (id: string, reason?: string) => performAction(id, 'ignore', () => apiFetch<Alert>(`/api/alerts/${id}/ignore`, { method: 'POST', body: JSON.stringify({ reason }) })),
        escalateAlert: (id: string) => performAction(id, 'escalate', () => apiFetch<Alert>(`/api/alerts/escalate`, { method: 'POST', body: JSON.stringify({ id }) })),
        dispatchAlert: (id: string, service?: string) => performAction(id, 'dispatch', () => apiFetch<Alert>(`/api/alerts/${id}/dispatch`, { method: 'POST', body: JSON.stringify({ service }) })),
        claimAlert: (id: string) => performAction(id, 'approve', () => apiFetch<Alert>(`/api/alerts/${id}/claim`, { method: 'POST' })),
        releaseAlert: (id: string) => performAction(id, 'approve', () => apiFetch<Alert>(`/api/alerts/${id}/release`, { method: 'POST' })),
        onApproveAll: async (ids: string[]) => {
            for (const id of ids) {
                await apiFetch<Alert>(`/api/alerts/${id}/acknowledge`, { method: 'POST' });
            }
        },
        isClaiming: (id: string) => pending[id] === 'approve', // Simplified for this logic
        isReleasing: (id: string) => pending[id] === 'ignore',
    };
}