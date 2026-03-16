'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { MOCK_PREDICTIVE } from '@/lib/mock-data';
import { TIMELINE_SLOTS }  from '@/lib/utils';
import type { TimelineSlot, PredictiveSnapshot } from '@/types';

interface UsePredictiveReturn {
    activeSlot:   TimelineSlot;
    snapshot:     PredictiveSnapshot;
    allSnapshots: PredictiveSnapshot[];
    setSlot:      (slot: TimelineSlot) => void;
    slotIndex:    number;
    isLoading:    boolean;
}

export function usePredictive(): UsePredictiveReturn {
    const [activeSlot, setActiveSlot]   = useState<TimelineSlot>('now');
    const [snapshots, setSnapshots]     = useState<PredictiveSnapshot[]>(MOCK_PREDICTIVE);
    const [isLoading, setIsLoading]     = useState(false);

    // ── Fetch on mount ──────────────────────
    useEffect(() => {
        setIsLoading(true);
        fetch('/api/predictive')
            .then(r => r.json())
            .then((data: PredictiveSnapshot[]) => {
                if (Array.isArray(data) && data.length > 0) setSnapshots(data);
            })
            .catch(() => { /* keep mock */ })
            .finally(() => setIsLoading(false));
    }, []);

    const setSlot = useCallback((slot: TimelineSlot) => setActiveSlot(slot), []);

    const snapshot = useMemo(
        () => snapshots.find(s => s.slot === activeSlot) ?? snapshots[0],
        [snapshots, activeSlot]
    );

    const slotIndex = TIMELINE_SLOTS.indexOf(activeSlot);

    return {
        activeSlot,
        snapshot,
        allSnapshots: snapshots,
        setSlot,
        slotIndex,
        isLoading,
    };
}