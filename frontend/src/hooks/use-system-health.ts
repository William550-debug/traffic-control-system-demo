'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWsEvent }         from '@/providers/websocket-provider';
import { MOCK_SYSTEM_HEALTH }  from '@/lib/mock-data';
import type { SystemHealth }   from '@/types';

function clamp(val: number, min: number, max: number) {
    return Math.min(max, Math.max(min, val));
}

// ── Backend → Frontend normalizer ─────────────────────────────────────────────
// Backend fields differ from frontend SystemHealth:
//
//   Backend               Frontend
//   ──────────────────    ──────────────────────
//   updatedAt             lastRefreshedAt
//   activeSensors         iotNetworkPercent  (derived: activeSensors/sensors * 100)
//   sensors               (not in SystemHealth — used only for derivation)
//   latencyMs             (not in SystemHealth — used only for metrics display)
//   overall               (not in SystemHealth)
//
// We keep sensor counts only in BackendHealth (never spread into SystemHealth)
// to avoid TS errors about unknown properties.

interface BackendHealth {
    overall?:           string;
    sensors?:           number;
    activeSensors?:     number;
    latencyMs?:         number;
    uptime?:            number;
    updatedAt?:         string | Date;
    // Frontend fields may also be present on legacy endpoints
    iotNetworkPercent?: number;
    aiConfidence?:      number;
    uptimePercent?:     number;
    activeOperators?:   number;
    dataDelaySeconds?:  number;
    lastRefreshedAt?:   string | Date;
}

function normalizeHealth(raw: BackendHealth, prev: SystemHealth): SystemHealth {
    const sensors       = raw.sensors       ?? 248;
    const activeSensors = raw.activeSensors ?? sensors;

    // Derive iotNetworkPercent from sensor coverage if backend provides counts,
    // otherwise use the explicit value if present, else keep previous state.
    const iotNetworkPercent =
        raw.iotNetworkPercent != null
            ? raw.iotNetworkPercent
            : raw.activeSensors != null || raw.sensors != null
                ? clamp((activeSensors / sensors) * 100, 0, 100)
                : prev.iotNetworkPercent;

    // aiConfidence — backend doesn't track this field yet; keep previous value.
    const aiConfidence = raw.aiConfidence ?? prev.aiConfidence;

    // uptimePercent — use backend value if present
    const uptimePercent = raw.uptime ?? raw.uptimePercent ?? prev.uptimePercent;

    // activeOperators / dataDelaySeconds — pass through if present
    const activeOperators  = raw.activeOperators  ?? prev.activeOperators;
    const dataDelaySeconds = raw.dataDelaySeconds != null
        ? raw.dataDelaySeconds
        : raw.latencyMs != null
            ? Math.round(raw.latencyMs / 1000)
            : prev.dataDelaySeconds;

    // lastRefreshedAt — prefer updatedAt, then explicit lastRefreshedAt
    const rawDate = raw.updatedAt ?? raw.lastRefreshedAt;
    const lastRefreshedAt = rawDate ? new Date(rawDate as string) : new Date();

    return {
        iotNetworkPercent,
        aiConfidence,
        uptimePercent,
        activeOperators,
        dataDelaySeconds,
        lastRefreshedAt,
    };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSystemHealth(): SystemHealth {
    const [health, setHealth] = useState<SystemHealth>(MOCK_SYSTEM_HEALTH);

    // Fetch on mount + every 30s
    useEffect(() => {
        async function fetchHealth() {
            try {
                const res  = await fetch('/api/health');
                const json = await res.json() as unknown;

                // Support both { ok, data } and raw SystemHealth
                const raw: BackendHealth =
                    (json as { ok?: boolean; data?: BackendHealth }).data ??
                    (json as BackendHealth);

                setHealth(prev => normalizeHealth(raw, prev));
            } catch {
                // Keep current state on error
            }
        }

        void fetchHealth();
        const id = setInterval(() => void fetchHealth(), 30_000);
        return () => clearInterval(id);
    }, []);

    // Live WebSocket updates from backend simulation
    useWsEvent<Partial<BackendHealth>>('health:updated', useCallback((event) => {
        setHealth(prev => normalizeHealth(event.payload as BackendHealth, prev));
    }, []));

    // Dev drift — keeps the status bar looking alive without a backend
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        const id = setInterval(() => {
            setHealth(prev => ({
                ...prev,
                iotNetworkPercent: clamp(
                    prev.iotNetworkPercent + (Math.random() - 0.5) * 0.4,
                    88, 100,
                ),
                aiConfidence: clamp(
                    prev.aiConfidence + (Math.random() - 0.5),
                    65, 98,
                ),
                lastRefreshedAt: new Date(),
            }));
        }, 8_000);
        return () => clearInterval(id);
    }, []);

    return health;
}