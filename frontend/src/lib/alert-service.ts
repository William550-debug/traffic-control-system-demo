import type { Alert } from '@/types';

const BASE = '/api/alerts';

/** Ensures string dates are real Date objects before reaching the UI */
function hydrateAlert(alert: any): Alert {
    return {
        ...alert,
        detectedAt: new Date(alert.detectedAt),
        updatedAt:  new Date(alert.updatedAt),
        escalatedAt: alert.escalatedAt ? new Date(alert.escalatedAt) : undefined,
    } as Alert;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            'X-Operator-Id': (window as any).__atmsOperator || ''
        },
        ...options,
    });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error ?? 'Request failed');
    return body.data as T;
}

export const getAllAlerts = async () => (await apiFetch<any[]>('/')).map(hydrateAlert);
export const acknowledgeAlert = (id: string) => apiFetch<any>(`/${id}/acknowledge`, { method: 'POST' }).then(hydrateAlert);
export const ignoreAlert = (id: string, reason?: string) => apiFetch<any>(`/${id}/ignore`, { method: 'POST', body: JSON.stringify({ reason }) }).then(hydrateAlert);
export const escalateAlert = (id: string) => apiFetch<any>(`/escalate`, { method: 'POST', body: JSON.stringify({ id }) }).then(hydrateAlert);
export const dispatchAlert = (id: string, service?: string) => apiFetch<any>(`/${id}/dispatch`, { method: 'POST', body: JSON.stringify({ service }) }).then(hydrateAlert);
export const claimAlert = (id: string) => apiFetch<any>(`/${id}/claim`, { method: 'POST' }).then(hydrateAlert);
export const releaseAlert = (id: string) => apiFetch<any>(`/${id}/release`, { method: 'POST' }).then(hydrateAlert);