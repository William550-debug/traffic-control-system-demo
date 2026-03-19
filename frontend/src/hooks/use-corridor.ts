'use client';

import { useState, useCallback, useEffect, useRef, startTransition } from 'react';
import { useWsEvent } from '@/providers/websocket-provider';
import { MOCK_CORRIDORS } from '@/lib/mock-data';
import { reviveCorridor } from '@/lib/revive';
import type { Corridor, CorridorStatus, SignalTiming } from '@/types';

interface CorridorState {
    corridors:        Corridor[];
    selectedCorridor: Corridor | null;
    isLoading:        boolean;
    selectCorridor:   (id: string) => void;
    clearCorridor:    () => void;
    updateTiming:     (corridorId: string, timing: SignalTiming) => void;
    lockCorridor:     (corridorId: string, by: string) => void;
    unlockCorridor:   (corridorId: string) => void;
}

const DEFAULT_TIMING: SignalTiming = {
    greenSeconds: 45, yellowSeconds: 5, redSeconds: 30, adaptive: false,
};

function seedTiming(corridors: Corridor[]): Corridor[] {
    return corridors.map((c: Corridor) => ({
        ...c,
        signalTiming: c.signalTiming ?? DEFAULT_TIMING,
    }));
}

async function patchCorridor(
    corridorId: string,
    action: string,
    payload: unknown,
): Promise<void> {
    try {
        await fetch('/api/corridors', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ corridorId, action, payload }),
        });
    } catch {
        // Apply locally regardless — optimistic
    }
}

export function useCorridor(): CorridorState {
    const [corridors, setCorridors]   = useState<Corridor[]>(seedTiming(MOCK_CORRIDORS));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading]   = useState(false);

    // ── Fetch on mount ──────────────────────
    useEffect(() => {
        setIsLoading(true);
        fetch('/api/corridors')
            .then(r => r.json())
            .then((data: Corridor[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setCorridors(seedTiming(data.map(reviveCorridor)));
                }
            })
            .catch(() => { /* keep mock */ })
            .finally(() => setIsLoading(false));
    }, []);

    // ── Stable setter ref — avoids setState-in-effect lint error ──
    const setCorridorsRef = useRef(setCorridors);
    setCorridorsRef.current = setCorridors;

    // ── WebSocket live corridor updates ─────
    useWsEvent<{ id: string; flowRate?: number; avgSpeedKph?: number; status?: CorridorStatus }>(
        'corridor:updated',
        useCallback((event) => {
            const update = event.payload;
            // startTransition defers the setState so it doesn't run synchronously
            // inside the effect, satisfying react-hooks/set-state-in-effect
            startTransition(() => {
                setCorridorsRef.current(prev => prev.map((c: Corridor) =>
                    c.id === update.id ? { ...c, ...update } : c
                ));
            });
        }, [])
    );

    // ── Selection ────────────────────────────
    const selectCorridor = useCallback((id: string) => setSelectedId(id), []);
    const clearCorridor  = useCallback(() => setSelectedId(null), []);

    // ── Actions ──────────────────────────────
    const updateTiming = useCallback((corridorId: string, timing: SignalTiming) => {
        void patchCorridor(corridorId, 'update_timing', timing);
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, signalTiming: timing } : c
        ));
    }, []);

    const lockCorridor = useCallback((corridorId: string, by: string) => {
        void patchCorridor(corridorId, 'lock', { by });
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, lockedBy: by, lockedAt: new Date() } : c
        ));
    }, []);

    const unlockCorridor = useCallback((corridorId: string) => {
        void patchCorridor(corridorId, 'unlock', {});
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, lockedBy: undefined, lockedAt: undefined } : c
        ));
    }, []);

    const selectedCorridor = corridors.find((c: Corridor) => c.id === selectedId) ?? null;

    return {
        corridors,
        selectedCorridor,
        isLoading,
        selectCorridor,
        clearCorridor,
        updateTiming,
        lockCorridor,
        unlockCorridor,
    };
}