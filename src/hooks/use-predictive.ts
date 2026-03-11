'use client';

import { useState, useCallback, useMemo } from 'react';
import { MOCK_PREDICTIVE } from '@/lib/mock-data';
import { TIMELINE_SLOTS }  from '@/lib/utils';
import type { TimelineSlot, PredictiveSnapshot } from '@/types';

interface UsePredictiveReturn {
    activeSlot:  TimelineSlot;
    snapshot:    PredictiveSnapshot;
    setSlot:     (slot: TimelineSlot) => void;
    slotIndex:   number;
    allSnapshots: PredictiveSnapshot[];
}

export function usePredictive(): UsePredictiveReturn {
    const [activeSlot, setActiveSlot] = useState<TimelineSlot>('now');

    const setSlot = useCallback((slot: TimelineSlot) => setActiveSlot(slot), []);

    const snapshot = useMemo(
        () => MOCK_PREDICTIVE.find(s => s.slot === activeSlot) ?? MOCK_PREDICTIVE[0],
        [activeSlot]
    );

    const slotIndex = TIMELINE_SLOTS.indexOf(activeSlot);

    return { activeSlot, snapshot, setSlot, slotIndex, allSnapshots: MOCK_PREDICTIVE };
}