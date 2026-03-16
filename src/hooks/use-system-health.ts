'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWsEvent } from '@/providers/websocket-provider';
import { MOCK_SYSTEM_HEALTH } from '@/lib/mock-data';
import type { SystemHealth } from '@/types';

function clamp(val: number, min: number, max: number) {
    return Math.min(max, Math.max(min, val));
}

export function useSystemHealth(): SystemHealth {
    const [health, setHealth] = useState<SystemHealth>(MOCK_SYSTEM_HEALTH);

    // ── Fetch on mount ──────────────────────
    useEffect(() => {
        fetch('/api/health')
            .then(r => r.json())
            .then((data: SystemHealth) => {
                setHealth({ ...data, lastRefreshedAt: new Date(data.lastRefreshedAt) });
            })
            .catch(() => { /* keep mock */ });

        // Re-fetch every 30s to stay in sync
        const id = setInterval(() => {
            fetch('/api/health')
                .then(r => r.json())
                .then((data: SystemHealth) => {
                    setHealth(prev => ({
                        ...prev,
                        ...data,
                        lastRefreshedAt: new Date(),
                    }));
                })
                .catch(() => {});
        }, 30_000);

        return () => clearInterval(id);
    }, []);

    // ── WebSocket live updates ──────────────
    useWsEvent<Partial<SystemHealth>>('health:updated', useCallback((event) => {
        setHealth(prev => ({
            ...prev,
            ...event.payload,
            lastRefreshedAt: new Date(),
        }));
    }, []));

    // ── Dev fluctuation ─────────────────────
    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        const id = setInterval(() => {
            setHealth(prev => ({
                ...prev,
                iotNetworkPercent: clamp(prev.iotNetworkPercent + (Math.random() - 0.5) * 0.4, 88, 100),
                aiConfidence:      clamp(prev.aiConfidence      + (Math.random() - 0.5) * 1,   65, 98),
                lastRefreshedAt:   new Date(),
            }));
        }, 8_000);
        return () => clearInterval(id);
    }, []);

    return health;
}