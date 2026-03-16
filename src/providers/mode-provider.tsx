'use client';

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    type ReactNode,
} from 'react';
import { useWsEvent } from '@/providers/websocket-provider';
import type { OperatingMode, ModeThresholds, ModeTransition, SystemHealth } from '@/types';

// ── Defaults ──────────────────────────────
const DEFAULT_THRESHOLDS: ModeThresholds = {
    trafficVolume:   4000,   // veh/h
    incidentActive:  false,
    weatherImpact:   false,
    eventActive:     false,
    emergencyActive: false,
    aiConfidenceMin: 70,
};

const MODE_SWITCH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// ── Context shape ─────────────────────────
interface ModeContextValue {
    currentMode:           OperatingMode;
    previousMode:          OperatingMode | null;
    thresholds:            ModeThresholds;
    autoTransitionEnabled: boolean;
    transitions:           ModeTransition[];
    pendingBanner:         ModeTransition | null;
    dismissBanner:         () => void;
    manualOverride:        (mode: OperatingMode, reason: string, operatorId: string) => void;
    setAutoTransition:     (enabled: boolean) => void;
    canOverride:           boolean;
}

const ModeContext = createContext<ModeContextValue | null>(null);

// ── Provider ──────────────────────────────
interface ModeProviderProps {
    children:     ReactNode;
    canOverride?: boolean;   // based on role in operator shell
}

export function ModeProvider({ children, canOverride = false }: ModeProviderProps) {
    const [currentMode, setCurrentMode]           = useState<OperatingMode>('AI-Prioritized');
    const [previousMode, setPreviousMode]         = useState<OperatingMode | null>(null);
    const [autoEnabled, setAutoEnabled]           = useState(true);
    const [transitions, setTransitions]           = useState<ModeTransition[]>([]);
    const [pendingBanner, setPendingBanner]       = useState<ModeTransition | null>(null);
    const lastTransitionRef                       = useRef<number>(0);

    // ── Internal transition helper ─────────
    const doTransition = useCallback((
        to:          OperatingMode,
        reason:      string,
        triggeredBy: 'auto' | 'manual',
        operatorId?: string,
    ) => {
        setCurrentMode(prev => {
            if (prev === to) return prev;
            const t: ModeTransition = {
                id:          `mode-${Date.now()}`,
                from:        prev,
                to,
                reason,
                triggeredBy,
                triggeredAt: new Date(),
                operatorId,
            };
            setPreviousMode(prev);
            setTransitions(hist => [t, ...hist].slice(0, 100));
            setPendingBanner(t);
            lastTransitionRef.current = Date.now();
            return to;
        });
    }, []);

    // ── WebSocket mode:changed ─────────────
    useWsEvent<{ mode: OperatingMode; reason: string }>('mode:changed', useCallback((ev) => {
        doTransition(ev.payload.mode, ev.payload.reason, 'auto');
    }, [doTransition]));

    // ── Health updates → auto-transition ──
    useWsEvent<Partial<SystemHealth>>('health:updated', useCallback((ev) => {
        if (!autoEnabled) return;
        const sinceLastSwitch = Date.now() - lastTransitionRef.current;
        if (sinceLastSwitch < MODE_SWITCH_COOLDOWN_MS) return;

        const { aiConfidence } = ev.payload;
        if (typeof aiConfidence === 'number') {
            if (aiConfidence < DEFAULT_THRESHOLDS.aiConfidenceMin) {
                doTransition('Human-Validated', `AI confidence dropped to ${aiConfidence.toFixed(0)}%`, 'auto');
            } else if (aiConfidence >= 80 && currentMode === 'Human-Validated') {
                doTransition('AI-Prioritized', `AI confidence restored to ${aiConfidence.toFixed(0)}%`, 'auto');
            }
        }
    }, [autoEnabled, currentMode, doTransition]));

    // ── Emergency → force Human-Validated ─
    useWsEvent('emergency:activated', useCallback(() => {
        doTransition('Human-Validated', 'Emergency activated — all actions require human approval', 'auto');
    }, [doTransition]));

    // ── Manual override ────────────────────
    const manualOverride = useCallback((
        mode:       OperatingMode,
        reason:     string,
        operatorId: string,
    ) => {
        doTransition(mode, reason, 'manual', operatorId);
        // Persist to server (non-blocking)
        void fetch('/api/modes', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ mode, reason, operatorId, bypassCooldown: true }),
        }).catch(() => {/* local state already updated */});
    }, [doTransition]);

    // ── Auto-dismiss banner after 10s ─────
    useEffect(() => {
        if (!pendingBanner) return;
        const t = setTimeout(() => setPendingBanner(null), 10_000);
        return () => clearTimeout(t);
    }, [pendingBanner]);

    const dismissBanner     = useCallback(() => setPendingBanner(null), []);
    const setAutoTransition = useCallback((v: boolean) => setAutoEnabled(v), []);

    return (
        <ModeContext.Provider value={{
            currentMode,
            previousMode,
            thresholds:            DEFAULT_THRESHOLDS,
            autoTransitionEnabled: autoEnabled,
            transitions,
            pendingBanner,
            dismissBanner,
            manualOverride,
            setAutoTransition,
            canOverride,
        }}>
            {children}
        </ModeContext.Provider>
    );
}

// ── Hooks ──────────────────────────────────
export function useMode(): ModeContextValue {
    const ctx = useContext(ModeContext);
    if (!ctx) throw new Error('useMode must be used inside <ModeProvider>');
    return ctx;
}

export function useIsHumanValidated(): boolean {
    return useMode().currentMode === 'Human-Validated';
}