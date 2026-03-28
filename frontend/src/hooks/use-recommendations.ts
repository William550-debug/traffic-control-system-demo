'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWsEvent } from '@/providers/websocket-provider';
import { MOCK_RECOMMENDATIONS } from '@/lib/mock-data';
import { reviveRecommendation } from '@/lib/revive';
import type { Recommendation } from '@/types';

interface RecommendationsState {
    recommendations: Recommendation[];
    isLoading:       boolean;
    approve:         (id: string) => void;
    reject:          (id: string, reason: string) => void;
    modify:          (id: string) => void;
}

// ── API helpers ───────────────────────────────────────────────────────────────
// Backend endpoints:
//   Approve → POST /api/recommendations/:id/approve
//   Reject  → POST /api/recommendations/:id/reject  { reason }
//   Modify  → UI-only (opens form) — no backend call

async function postRecommendationAction(
    path:  string,
    body?: object,
): Promise<void> {
    try {
        await fetch(path, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    body ? JSON.stringify(body) : undefined,
        });
    } catch {
        // Optimistic update already applied — safe to ignore
    }
}

export function useRecommendations(): RecommendationsState {
    const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
    const [isLoading, setIsLoading]             = useState(false);

    // ── Fetch on mount ────────────────────────────────────────────────────────
    // Backend returns { ok: true, data: Recommendation[] } — unwrap accordingly.
    // Falls back to MOCK_RECOMMENDATIONS if unreachable.
    useEffect(() => {
        setIsLoading(true);
        fetch('/api/recommendations')
            .then(r => r.json())
            .then((json: unknown) => {
                const data = Array.isArray(json)
                    ? json
                    : (json as { ok?: boolean; data?: Recommendation[] }).data;

                if (Array.isArray(data) && data.length > 0) {
                    setRecommendations(data.map(reviveRecommendation));
                }
            })
            .catch(() => { /* keep mock */ })
            .finally(() => setIsLoading(false));
    }, []);

    // ── WebSocket — new / updated recommendations ─────────────────────────────
    useWsEvent<Recommendation>('recommendation:new', useCallback((event) => {
        const rec = reviveRecommendation(event.payload);
        setRecommendations(prev => {
            // Upsert: update if exists, prepend if new
            const exists = prev.some(r => r.id === rec.id);
            return exists
                ? prev.map(r => r.id === rec.id ? { ...r, ...rec } : r)
                : [rec, ...prev];
        });
    }, []));

    // ── Actions ───────────────────────────────────────────────────────────────

    const approve = useCallback((id: string) => {
        // Optimistic update first — UI stays responsive
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'approved', approvedAt: new Date() } : r,
        ));
        void postRecommendationAction(`/api/recommendations/${id}/approve`);
    }, []);

    const reject = useCallback((id: string, reason: string) => {
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'rejected', rejectionReason: reason } : r,
        ));
        void postRecommendationAction(`/api/recommendations/${id}/reject`, { reason });
    }, []);

    // modify is UI-only — opens a modification form. The recommendation stays
    // 'pending' until the operator submits the modified version, at which point
    // approve() is called with the adjusted rec. No backend call here.
    const modify = useCallback((id: string) => {
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'modified' } : r,
        ));
    }, []);

    return {
        // Only surface pending recs — approved/rejected are archived
        recommendations: recommendations.filter(r => r.status === 'pending'),
        isLoading,
        approve,
        reject,
        modify,
    };
}