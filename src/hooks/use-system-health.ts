'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWsEvent } from '@/providers/websocket-provider';
import { MOCK_SYSTEM_HEALTH } from '@/lib/mock-data';
import type { SystemHealth } from '@/types';

export function useSystemHealth(): SystemHealth {
    const [health, setHealth] = useState<SystemHealth>(MOCK_SYSTEM_HEALTH);

    // Update from live WS events
    useWsEvent<Partial<SystemHealth>>('health:updated', useCallback((event) => {
        setHealth(prev => ({
            ...prev,
            ...event.payload,
            lastRefreshedAt: new Date(),
        }));
    }, []));

    // Simulate minor fluctuation in dev
    useEffect(() => {
        const id = setInterval(() => {
            setHealth(prev => ({
                ...prev,
                iotNetworkPercent: clamp(prev.iotNetworkPercent + (Math.random() - 0.5) * 0.4, 88, 100),
                aiConfidence:      clamp(prev.aiConfidence      + (Math.random() - 0.5) * 1,   65, 98),
                lastRefreshedAt:   new Date(),
            }));
        }, 8000);
        return () => clearInterval(id);
    }, []);

    return health;
}

function clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
}