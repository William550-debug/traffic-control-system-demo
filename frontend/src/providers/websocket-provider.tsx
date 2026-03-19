'use client';

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import type { WsEvent, WsEventType } from '@/types';

// ── Connection states ─────────────────────
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

type Listener<T = unknown> = (event: WsEvent<T>) => void;
type ListenerMap = Map<WsEventType | '*', Set<Listener>>;

// ── Context shape ─────────────────────────
interface WebSocketContextValue {
    connectionState: ConnectionState;
    lastEvent: WsEvent | null;
    subscribe: <T = unknown>(type: WsEventType | '*', listener: Listener<T>) => () => void;
    send: (type: WsEventType, payload: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// ── Mock event generator (dev only) ──────
// Replace with actual WS URL in production
const MOCK_WS_URL = null; // set to 'ws://localhost:3001' when backend is ready

function createMockEvents(): WsEvent[] {
    const now = new Date();
    return [
        {
            type: 'alert:new',
            payload: {
                id: `alert-ws-${Date.now()}`,
                type: 'congestion',
                severity: ['high', 'medium', 'critical'][Math.floor(Math.random() * 3)],
                status: 'active',
                title: [
                    'Slow traffic — Ngong Road south',
                    'Signal fault — Westlands junction',
                    'Heavy congestion — Moi Avenue',
                    'Incident reported — Lang\'ata Road',
                ][Math.floor(Math.random() * 4)],
                description: 'Auto-detected via IoT sensor network.',
                location: { lat: -1.295 + (Math.random() - 0.5) * 0.04, lng: 36.82 + (Math.random() - 0.5) * 0.04, label: 'Nairobi CBD', zone: 'CBD' },
                confidence: Math.floor(Math.random() * 20) + 78,
                detectedAt: now,
                updatedAt:  now,
                affectedIntersections: [],
            },
            timestamp: now,
            sourceAgency: 'traffic',
        },
        {
            type: 'health:updated',
            payload: {
                iotNetworkPercent: 90 + Math.random() * 8,
                aiConfidence:      75 + Math.random() * 20,
                uptimePercent:     99.6 + Math.random() * 0.4,
                dataDelaySeconds:  Math.floor(Math.random() * 3),
                activeOperators:   2 + Math.floor(Math.random() * 4),
            },
            timestamp: now,
        },
        {
            type: 'corridor:updated',
            payload: {
                id: ['corridor-001','corridor-002','corridor-003','corridor-004','corridor-005'][Math.floor(Math.random() * 5)],
                flowRate:    Math.floor(Math.random() * 2000),
                avgSpeedKph: Math.floor(Math.random() * 60) + 5,
            },
            timestamp: now,
        },
        {
            type: 'recommendation:new',
            payload: {
                id:       `rec-ws-${Date.now()}`,
                title:    'Extend green phase — Uhuru Highway southbound',
                confidence: 89,
                expectedImpact: { congestionReduction: 18 },
            },
            timestamp: now,
        },
        // Occasionally simulate a mode change (low probability — only 1 in 4 cycles)
        ...(Math.random() > 0.75 ? [{
            type: 'mode:changed' as const,
            payload: {
                mode:   (Math.random() > 0.5 ? 'Human-Validated' : 'AI-Prioritized') as import('@/types').OperatingMode,
                reason: Math.random() > 0.5 ? 'Peak traffic threshold exceeded' : 'AI confidence restored above threshold',
            },
            timestamp: now,
        }] : []),
    ];
}

// ── Provider ──────────────────────────────
interface WebSocketProviderProps {
    children: ReactNode;
    url?: string;
}

export function WebSocketProvider({ children, url = MOCK_WS_URL ?? '' }: WebSocketProviderProps) {
    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
    const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);

    const wsRef         = useRef<WebSocket | null>(null);
    const listenersRef  = useRef<ListenerMap>(new Map());
    const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mockTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

    // Dispatch to all matching listeners
    const dispatch = useCallback((event: WsEvent) => {
        setLastEvent(event);
        const typed = listenersRef.current.get(event.type);
        const wildcard = listenersRef.current.get('*');
        typed?.forEach((fn) => fn(event));
        wildcard?.forEach((fn) => fn(event));
    }, []);

    // Subscribe to events
    const subscribe = useCallback(
        <T = unknown>(type: WsEventType | '*', listener: Listener<T>): (() => void) => {
            if (!listenersRef.current.has(type)) {
                listenersRef.current.set(type, new Set());
            }
            listenersRef.current.get(type)!.add(listener as Listener);

            return () => {
                listenersRef.current.get(type)?.delete(listener as Listener);
            };
        },
        []
    );

    // Send message
    const send = useCallback((type: WsEventType, payload: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, payload, timestamp: new Date() }));
        }
    }, []);

    // Connect logic
    useEffect(() => {
        if (!url) {
            // Dev mode — simulate events
            setConnectionState('connected');

            // Fire initial mock data
            setTimeout(() => {
                createMockEvents().forEach((ev, i) => {
                    setTimeout(() => dispatch(ev), i * 500);
                });
            }, 800);

            // Periodic mock updates
            mockTimerRef.current = setInterval(() => {
                const events = createMockEvents();
                const randomEvent = events[Math.floor(Math.random() * events.length)];
                dispatch(randomEvent);
            }, 15_000);

            return () => {
                if (mockTimerRef.current) clearInterval(mockTimerRef.current);
            };
        }

        // Real WebSocket connection
        function connect() {
            setConnectionState('connecting');
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => setConnectionState('connected');

            ws.onmessage = (msg) => {
                try {
                    const event = JSON.parse(msg.data) as WsEvent;
                    event.timestamp = new Date(event.timestamp);
                    dispatch(event);
                } catch {
                    console.warn('[WS] Failed to parse message', msg.data);
                }
            };

            ws.onclose = () => {
                setConnectionState('reconnecting');
                reconnectRef.current = setTimeout(connect, 3000);
            };

            ws.onerror = () => {
                setConnectionState('disconnected');
            };
        }

        connect();

        return () => {
            wsRef.current?.close();
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
        };
    }, [url, dispatch]);

    return (
        <WebSocketContext.Provider value={{ connectionState, lastEvent, subscribe, send }}>
            {children}
        </WebSocketContext.Provider>
    );
}

// ── Hook ──────────────────────────────────
export function useWebSocket(): WebSocketContextValue {
    const ctx = useContext(WebSocketContext);
    if (!ctx) throw new Error('useWebSocket must be used inside <WebSocketProvider>');
    return ctx;
}

// ── Event-specific hook ───────────────────
export function useWsEvent<T = unknown>(
    type: WsEventType | '*',
    handler: (event: WsEvent<T>) => void
) {
    const { subscribe } = useWebSocket();

    useEffect(() => {
        return subscribe<T>(type, handler);
    }, [subscribe, type, handler]);
}