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

async function patchRecommendation(
    id: string,
    action: 'approve' | 'reject' | 'modify',
    reason?: string,
): Promise<void> {
    try {
        await fetch('/api/recommendations', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, action, reason }),
        });
    } catch {
        // Apply locally regardless
    }
}

export function useRecommendations(): RecommendationsState {
    const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);
    const [isLoading, setIsLoading]             = useState(false);

    // ── Fetch on mount ──────────────────────
    useEffect(() => {
        setIsLoading(true);
        fetch('/api/recommendations')
            .then(r => r.json())
            .then((data: Recommendation[]) => {
                if (Array.isArray(data) && data.length > 0) setRecommendations(data.map(reviveRecommendation));
            })
            .catch(() => { /* keep mock */ })
            .finally(() => setIsLoading(false));
    }, []);

    // ── WebSocket new recommendations ───────
    useWsEvent<Recommendation>('recommendation:new', useCallback((event) => {
        const rec = reviveRecommendation(event.payload);
        setRecommendations(prev => {
            if (prev.some(r => r.id === rec.id)) return prev;
            return [rec, ...prev];
        });
    }, []));

    // ── Actions ──────────────────────────────
    const approve = useCallback((id: string) => {
        void patchRecommendation(id, 'approve');
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'approved', approvedAt: new Date() } : r
        ));
    }, []);

    const reject = useCallback((id: string, reason: string) => {
        void patchRecommendation(id, 'reject', reason);
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'rejected', rejectionReason: reason } : r
        ));
    }, []);

    const modify = useCallback((id: string) => {
        void patchRecommendation(id, 'modify');
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'modified' } : r
        ));
    }, []);

    return {
        recommendations: recommendations.filter(r => r.status === 'pending'),
        isLoading,
        approve,
        reject,
        modify,
    };
}