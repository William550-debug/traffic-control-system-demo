'use client';

import { useState, useCallback } from 'react';
import { MOCK_CORRIDORS } from '@/lib/mock-data';
import type { Corridor, SignalTiming } from '@/types';

interface CorridorState {
    corridors:        Corridor[];
    selectedCorridor: Corridor | null;
    selectCorridor:   (id: string) => void;
    clearCorridor:    () => void;
    updateTiming:     (corridorId: string, timing: SignalTiming) => void;
    lockCorridor:     (corridorId: string, by: string) => void;
    unlockCorridor:   (corridorId: string) => void;
}

export function useCorridor(): CorridorState {
    const [corridors, setCorridors] = useState<Corridor[]>(
        // Seed corridors with default signal timing
        MOCK_CORRIDORS.map((c: Corridor) => ({
            ...c,
            signalTiming: c.signalTiming ?? {
                greenSeconds:  45,
                yellowSeconds: 5,
                redSeconds:    30,
                adaptive:      false,
            },
        }))
    );
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectCorridor = useCallback((id: string) => {
        setSelectedId(id);
    }, []);

    const clearCorridor = useCallback(() => {
        setSelectedId(null);
    }, []);

    const updateTiming = useCallback((corridorId: string, timing: SignalTiming) => {
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, signalTiming: timing } : c
        ));
    }, []);

    const lockCorridor = useCallback((corridorId: string, by: string) => {
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, lockedBy: by, lockedAt: new Date() } : c
        ));
    }, []);

    const unlockCorridor = useCallback((corridorId: string) => {
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, lockedBy: undefined, lockedAt: undefined } : c
        ));
    }, []);

    const selectedCorridor = corridors.find((c: Corridor) => c.id === selectedId) ?? null;

    return {
        corridors,
        selectedCorridor,
        selectCorridor,
        clearCorridor,
        updateTiming,
        lockCorridor,
        unlockCorridor,
    };
}