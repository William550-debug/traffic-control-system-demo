'use client';

import { useState, useCallback } from 'react';
import { useWsEvent } from '@/providers/websocket-provider';
import { MOCK_RECOMMENDATIONS } from '@/lib/mock-data';
import type { Recommendation } from '@/types';

interface RecommendationsState {
    recommendations: Recommendation[];
    approve:  (id: string) => void;
    reject:   (id: string, reason: string) => void;
    modify:   (id: string) => void;
}

export function useRecommendations(): RecommendationsState {
    const [recommendations, setRecommendations] = useState<Recommendation[]>(MOCK_RECOMMENDATIONS);

    useWsEvent<Recommendation>('recommendation:new', useCallback((event) => {
        setRecommendations(prev => {
            if (prev.some(r => r.id === event.payload.id)) return prev;
            return [event.payload, ...prev];
        });
    }, []));

    const approve = useCallback((id: string) => {
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'approved', approvedAt: new Date() } : r
        ));
    }, []);

    const reject = useCallback((id: string, reason: string) => {
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'rejected', rejectionReason: reason } : r
        ));
    }, []);

    const modify = useCallback((id: string) => {
        setRecommendations(prev => prev.map(r =>
            r.id === id ? { ...r, status: 'modified' } : r
        ));
    }, []);

    return {
        recommendations: recommendations.filter(r => r.status === 'pending'),
        approve,
        reject,
        modify,
    };
}