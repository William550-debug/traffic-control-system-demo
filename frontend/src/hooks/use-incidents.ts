// hooks/use-incidents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Primary data hook for the Incident Command Center.
//
// Responsibilities:
//   1. Fetch the active incident from the backend via incidentService.
//   2. Listen for real-time WebSocket patches (incident:updated, responder:updated).
//   3. Expose a setIncident updater so page.tsx can apply optimistic mutations
//      without re-fetching (the WS will confirm the real state shortly after).
//   4. Expose getAllIncidents for the IncidentQueuePanel sidebar.
//
// What this hook does NOT do:
//   • It does not call the API directly — all fetches go through incidentService.
//   • It does not manage selection state — that stays in page.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Incident, Responder } from '@/types';
import * as incidentService from '@/lib/incident-service';
import { useWebSocket } from './use-websocket';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseIncidentsReturn {
    /** The currently active incident, or null while loading / on error. */
    incident:    Incident | null;
    /** All incidents — used by IncidentQueuePanel. Null until first load. */
    allIncidents: Incident[] | null;
    isLoading:   boolean;
    error:       string | null;
    /** Apply an optimistic local mutation before the WS echo arrives. */
    setIncident: React.Dispatch<React.SetStateAction<Incident | null>>;
    /** Force a hard re-fetch (e.g. after a network error). */
    refetch:     () => void;
}

// ─── Responder WS patch shape ─────────────────────────────────────────────────

interface ResponderPatch {
    incidentId:  string;
    responderId: string;
    status?:     Responder['status'];
    eta?:        number | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIncidents(activeIncidentId: string): UseIncidentsReturn {
    const [incident,     setIncident]     = useState<Incident | null>(null);
    const [allIncidents, setAllIncidents] = useState<Incident[] | null>(null);
    const [isLoading,    setIsLoading]    = useState(true);
    const [error,        setError]        = useState<string | null>(null);
    const [fetchKey,     setFetchKey]     = useState(0);   // bump to force refetch

    // Track which incident ID was last fetched to detect queue switches
    const lastFetchedId = useRef<string | null>(null);

    // ── Initial fetch (and re-fetch on id change or manual retry) ──────────────
    useEffect(() => {
        let cancelled = false;

        async function load() {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch active incident + full list in parallel
                const [active, all] = await Promise.all([
                    incidentService.getIncidentById(activeIncidentId),
                    // Only re-fetch the list when switching incidents or on first load
                    lastFetchedId.current !== activeIncidentId
                        ? incidentService.getAllIncidents()
                        : Promise.resolve(allIncidents),
                ]);

                if (cancelled) return;

                setIncident(active);
                if (all) setAllIncidents(all);
                lastFetchedId.current = activeIncidentId;
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Unknown error');
                setIncident(null);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIncidentId, fetchKey]);

    // ── Real-time: full incident patch ─────────────────────────────────────────
    // Backend emits incident:updated whenever any handler mutates the incident.
    useWebSocket<Incident>('incident:updated', useCallback((updated) => {
        if (updated.id !== activeIncidentId) return;  // irrelevant incident

        // Hydrate Date strings — WS payload comes as serialised JSON
        setIncident({
            ...updated,
            detectedAt: new Date(updated.detectedAt),
            updatedAt:  new Date(updated.updatedAt),
            timeline: updated.timeline.map(e => ({ ...e, time: new Date(e.time) })),
            recommendations: updated.recommendations.map(r => ({
                ...r,
                generatedAt: new Date(r.generatedAt),
                expiresAt:   new Date(r.expiresAt),
            })),
        });

        // Also patch the summary in allIncidents so the queue panel stays fresh
        setAllIncidents(prev =>
            prev
                ? prev.map(inc => inc.id === updated.id
                    ? { ...inc, status: updated.status, updatedAt: new Date(updated.updatedAt) }
                    : inc)
                : prev
        );
    }, [activeIncidentId]));

    // ── Real-time: surgical responder patch ────────────────────────────────────
    // Backend emits responder:updated with just the changed fields (lighter payload).
    useWebSocket<ResponderPatch>('responder:updated', useCallback((patch) => {
        if (patch.incidentId !== activeIncidentId) return;

        setIncident(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                responders: prev.responders.map(r =>
                    r.id === patch.responderId
                        ? { ...r, ...patch }
                        : r
                ),
            };
        });
    }, [activeIncidentId]));

    const refetch = useCallback(() => setFetchKey(k => k + 1), []);

    return { incident, allIncidents, isLoading, error, setIncident, refetch };
}