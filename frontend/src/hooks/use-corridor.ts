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

// ── API helpers ───────────────────────────────────────────────────────────────
// Backend endpoints:
//   Timing update → PATCH /api/corridors/:id/timing
//   Lock          → POST  /api/corridors/:id/lock
//   Unlock        → POST  /api/corridors/:id/unlock
//
// The operator identity is read from window.__atmsOperator and forwarded
// as the X-Operator-Id header — the backend logs it in the audit trail.

function getOperatorHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const op = (window as Window & { __atmsOperator?: string }).__atmsOperator;
    return op ? { 'X-Operator-Id': op } : {};
}

// ── SignalTiming bridge ───────────────────────────────────────────────────────
// Frontend type:  { greenSeconds, yellowSeconds, redSeconds, adaptive }
// Backend type:   { greenDuration, redDuration, yellowDuration, cycleLength }
//
// We convert before sending and after receiving so neither side changes.

interface BackendTiming {
    greenDuration:  number;
    redDuration:    number;
    yellowDuration: number;
    cycleLength:    number;
}

function toBackendTiming(t: SignalTiming): BackendTiming {
    return {
        greenDuration:  t.greenSeconds,
        redDuration:    t.redSeconds,
        yellowDuration: t.yellowSeconds,
        cycleLength:    t.greenSeconds + t.yellowSeconds + t.redSeconds,
    };
}

function fromBackendTiming(t: BackendTiming): SignalTiming {
    return {
        greenSeconds:  t.greenDuration,
        yellowSeconds: t.yellowDuration,
        redSeconds:    t.redDuration,
        adaptive:      false, // backend does not track this field yet
    };
}

async function corridorPatch(path: string, body?: object): Promise<void> {
    try {
        await fetch(path, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json', ...getOperatorHeader() },
            body:    body ? JSON.stringify(body) : undefined,
        });
    } catch {
        // Optimistic update already applied — swallow network errors silently
    }
}

async function corridorPost(path: string, body?: object): Promise<void> {
    try {
        await fetch(path, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', ...getOperatorHeader() },
            body:    body ? JSON.stringify(body) : undefined,
        });
    } catch {
        // Optimistic update already applied
    }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCorridor(): CorridorState {
    const [corridors,  setCorridors]  = useState<Corridor[]>(seedTiming(MOCK_CORRIDORS));
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading,  setIsLoading]  = useState(false);

    // ── Fetch on mount ────────────────────────────────────────────────────────
    // Backend returns { ok: true, data: Corridor[] } — unwrap accordingly.
    // Falls back to MOCK_CORRIDORS if unreachable.
    useEffect(() => {
        setIsLoading(true);
        fetch('/api/corridors')
            .then(r => r.json())
            .then((json: unknown) => {
                // Support both { ok, data: Corridor[] } and raw Corridor[]
                const data = Array.isArray(json)
                    ? json
                    : (json as { ok?: boolean; data?: Corridor[] }).data;

                if (Array.isArray(data) && data.length > 0) {
                    setCorridors(seedTiming(data.map(reviveCorridor)));
                }
            })
            .catch(() => { /* keep mock */ })
            .finally(() => setIsLoading(false));
    }, []);

    // ── Stable setter ref ─────────────────────────────────────────────────────
    const setCorridorsRef = useRef(setCorridors);
    setCorridorsRef.current = setCorridors;

    // ── WebSocket live corridor updates ───────────────────────────────────────
    useWsEvent<{ id: string; flowRate?: number; avgSpeedKph?: number; status?: CorridorStatus }>(
        'corridor:updated',
        useCallback((event) => {
            startTransition(() => {
                setCorridorsRef.current(prev => prev.map((c: Corridor) =>
                    c.id === event.payload.id ? { ...c, ...event.payload } : c,
                ));
            });
        }, []),
    );

    // ── Selection ─────────────────────────────────────────────────────────────
    const selectCorridor = useCallback((id: string) => setSelectedId(id), []);
    const clearCorridor  = useCallback(() => setSelectedId(null), []);

    // ── Actions ───────────────────────────────────────────────────────────────

    const updateTiming = useCallback((corridorId: string, timing: SignalTiming) => {
        // Optimistic local update first — UI feels instant
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, signalTiming: timing } : c,
        ));
        // Send to backend with field names it expects
        void corridorPatch(
            `/api/corridors/${corridorId}/timing`,
            toBackendTiming(timing),
        );
    }, []);

    const lockCorridor = useCallback((corridorId: string, by: string) => {
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, lockedBy: by, lockedAt: new Date() } : c,
        ));
        void corridorPost(`/api/corridors/${corridorId}/lock`);
        // 'by' is forwarded via X-Operator-Id header — backend reads it from there
    }, []);

    const unlockCorridor = useCallback((corridorId: string) => {
        setCorridors(prev => prev.map((c: Corridor) =>
            c.id === corridorId ? { ...c, lockedBy: undefined, lockedAt: undefined } : c,
        ));
        void corridorPost(`/api/corridors/${corridorId}/unlock`);
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