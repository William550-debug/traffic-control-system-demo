// lib/incident-service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service layer: single source of truth for all incident API calls.
//
// Rules:
//   • Every function returns the typed backend shape or throws an ApiError.
//   • Never import this directly in components — go through useIncidents hook.
//   • BASE_URL is empty string so all calls hit the Next.js proxy (/api/...).
//     The proxy (app/api/incidents/[...path]/route.ts) forwards to the backend.
// ─────────────────────────────────────────────────────────────────────────────

import type {
    Incident,
    Recommendation,
    Responder,
    IncidentStatus,
} from '@/types';

// ─── Internal helpers ─────────────────────────────────────────────────────────

const BASE = '/api/incidents';

/** Deserialises Date strings returned by JSON into real Date objects. */
function hydrateDates(inc: Incident): Incident {
    return {
        ...inc,
        detectedAt: new Date(inc.detectedAt),
        updatedAt:  new Date(inc.updatedAt),
        timeline: inc.timeline.map(e => ({ ...e, time: new Date(e.time) })),
        recommendations: inc.recommendations.map(r => ({
            ...r,
            generatedAt: new Date(r.generatedAt),
            expiresAt:   new Date(r.expiresAt),
            approvedAt:  r.approvedAt ? new Date(r.approvedAt) : undefined,
        })),
    };
}

/** Typed fetch wrapper — throws a plain Error with a readable message on failure. */
async function apiFetch<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    const body = await res.json().catch(() => ({ ok: false, error: 'Invalid JSON from server' }));

    if (!res.ok || !body.ok) {
        throw new Error(body.error ?? `Request failed: ${res.status}`);
    }

    return body.data as T;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/** Fetch all incidents (list view / queue panel). */
export async function getAllIncidents(): Promise<Incident[]> {
    const list = await apiFetch<Incident[]>('/');
    return list.map(hydrateDates);
}

/** Fetch a single incident by ID. */
export async function getIncidentById(id: string): Promise<Incident> {
    const inc = await apiFetch<Incident>(`/${id}`);
    return hydrateDates(inc);
}

// ─── Status & lifecycle ───────────────────────────────────────────────────────

/** Patch the incident's status to any valid IncidentStatus value. */
export async function updateStatus(
    id: string,
    status: IncidentStatus,
): Promise<Incident> {
    const inc = await apiFetch<Incident>(`/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    return hydrateDates(inc);
}

/** Confirm a detected incident (shortcut — sets status = 'confirmed'). */
export async function confirmIncident(id: string): Promise<Incident> {
    const inc = await apiFetch<Incident>(`/${id}/confirm`, { method: 'POST' });
    return hydrateDates(inc);
}

/** Escalate an incident to a supervisor with an optional reason. */
export async function escalateIncident(
    id: string,
    reason?: string,
): Promise<Incident> {
    const inc = await apiFetch<Incident>(`/${id}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
    return hydrateDates(inc);
}

/** Mark an incident as cleared / resolved. */
export async function resolveIncident(id: string): Promise<Incident> {
    const inc = await apiFetch<Incident>(`/${id}/resolve`, { method: 'POST' });
    return hydrateDates(inc);
}

// ─── Recommendations ──────────────────────────────────────────────────────────

/** Approve an AI recommendation. */
export async function approveRecommendation(
    incidentId: string,
    recId: string,
): Promise<Recommendation> {
    return apiFetch<Recommendation>(
        `/${incidentId}/recommendations/${recId}/approve`,
        { method: 'POST' },
    );
}

/** Reject an AI recommendation with an optional reason. */
export async function rejectRecommendation(
    incidentId: string,
    recId: string,
    reason?: string,
): Promise<Recommendation> {
    return apiFetch<Recommendation>(
        `/${incidentId}/recommendations/${recId}/reject`,
        { method: 'POST', body: JSON.stringify({ reason }) },
    );
}

// ─── Traffic & signals ────────────────────────────────────────────────────────

/** Activate a traffic reroute for the incident. */
export async function rerouteTraffic(
    id: string,
    routeId?: string,
): Promise<{ message: string; congestionIndex: number }> {
    return apiFetch(`/${id}/traffic/reroute`, {
        method: 'POST',
        body: JSON.stringify({ routeId }),
    });
}

/** Apply adjusted signal timing around the incident. */
export async function adjustSignals(
    id: string,
): Promise<{ message: string; junctions: number }> {
    return apiFetch(`/${id}/signals/adjust`, { method: 'POST' });
}

// ─── Responders ───────────────────────────────────────────────────────────────

/** Dispatch a responder to the incident with an optional ETA override. */
export async function dispatchResponder(
    incidentId: string,
    responderId: string,
    eta?: number,
): Promise<Responder> {
    return apiFetch<Responder>(
        `/${incidentId}/responders/${responderId}/dispatch`,
        { method: 'POST', body: JSON.stringify({ eta }) },
    );
}

/** Optimise a responder's route (AI-driven ETA reduction). */
export async function optimiseResponderRoute(
    incidentId: string,
    responderId: string,
    newEta?: number,
): Promise<Responder> {
    return apiFetch<Responder>(
        `/${incidentId}/responders/${responderId}/route`,
        {
            method: 'PATCH',
            body: JSON.stringify({ optimize: true, newEta }),
        },
    );
}