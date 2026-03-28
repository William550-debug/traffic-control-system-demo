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

// ── Backend WS URL ────────────────────────
// Set NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws in .env.local to connect to
// the Node.js backend. Leave unset (or null) to keep mock simulation running.
const BACKEND_WS_URL: string | null =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) || null;

// ── Event type aliases ────────────────────
// The backend emits 'alert:created' for new alerts.
// All existing hooks subscribe to 'alert:new'.
// This map re-fires events under their frontend name so no subscriber
// code needs to change anywhere in the app.
const EVENT_ALIASES: Partial<Record<WsEventType, WsEventType>> = {
    'alert:created': 'alert:new',
};

// ── Mock event generator (dev only) ──────
function createMockEvents(): WsEvent[] {
    const now = new Date();
    return [
        {
            type: 'alert:new',
            payload: {
                id: `alert-ws-${Date.now()}`,
                type: 'congestion',
                severity: (['high', 'medium', 'critical'] as const)[Math.floor(Math.random() * 3)],
                status: 'active',
                title: [
                    'Slow traffic — Ngong Road south',
                    'Signal fault — Westlands junction',
                    'Heavy congestion — Moi Avenue',
                    'Incident reported — Lang\'ata Road',
                ][Math.floor(Math.random() * 4)],
                description: 'Auto-detected via IoT sensor network.',
                location: {
                    lat: -1.295 + (Math.random() - 0.5) * 0.04,
                    lng:  36.82 + (Math.random() - 0.5) * 0.04,
                    label: 'Nairobi CBD',
                    zone:  'CBD',
                },
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
                iotNetworkPercent: 90  + Math.random() * 8,
                aiConfidence:      75  + Math.random() * 20,
                uptimePercent:     99.6 + Math.random() * 0.4,
                dataDelaySeconds:  Math.floor(Math.random() * 3),
                activeOperators:   2   + Math.floor(Math.random() * 4),
            },
            timestamp: now,
        },
        {
            type: 'corridor:updated',
            payload: {
                id: ['corridor-001','corridor-002','corridor-003','corridor-004','corridor-005'][
                    Math.floor(Math.random() * 5)
                    ],
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
            type: 'mode:changed' as WsEventType,
            payload: {
                mode:   (Math.random() > 0.5 ? 'Human-Validated' : 'AI-Prioritized') as import('@/types').OperatingMode,
                reason: Math.random() > 0.5
                    ? 'Peak traffic threshold exceeded'
                    : 'AI confidence restored above threshold',
            },
            timestamp: now,
        }] : []),
    ];
}

// ── Provider ──────────────────────────────
interface WebSocketProviderProps {
    children: ReactNode;
    /** Explicit URL override — useful in tests. Falls back to NEXT_PUBLIC_WS_URL. */
    url?: string | null;
}

export function WebSocketProvider({
                                      children,
                                      url = BACKEND_WS_URL,
                                  }: WebSocketProviderProps) {
    const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
    const [lastEvent, setLastEvent] = useState<WsEvent | null>(null);

    const wsRef        = useRef<WebSocket | null>(null);
    const listenersRef = useRef<ListenerMap>(new Map());
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Tracks whether the component has unmounted so callbacks don't setState after cleanup
    const unmountedRef = useRef(false);

    // ── Dispatch ──────────────────────────────────────────────────────────────
    // Normalises timestamp to Date (backend sends ISO string, mock sends Date).
    // Fires the primary listener set then any registered alias (alert:created → alert:new).
    const dispatch = useCallback((rawEvent: WsEvent) => {
        // Normalization: Handle both Date objects (mock) and ISO strings (backend)
        const normalizedTimestamp = typeof rawEvent.timestamp === 'string'
            ? new Date(rawEvent.timestamp)
            : (rawEvent.timestamp as Date);

        const event: WsEvent = {
            ...rawEvent,
            timestamp: normalizedTimestamp,
        };

        if (!unmountedRef.current) {
            setLastEvent(event);
        }

        listenersRef.current.get(event.type)?.forEach(fn => fn(event));
        listenersRef.current.get('*')?.forEach(fn => fn(event));

        const alias = EVENT_ALIASES[event.type];
        if (alias) {
            const aliased: WsEvent = { ...event, type: alias };
            listenersRef.current.get(alias)?.forEach(fn => fn(aliased));
        }
    }, []);

    // ── Subscribe ─────────────────────────────────────────────────────────────
    const subscribe = useCallback(
        <T = unknown>(
            type: WsEventType | '*',
            listener: Listener<T>,
        ): (() => void) => {
            if (!listenersRef.current.has(type)) {
                listenersRef.current.set(type, new Set());
            }
            listenersRef.current.get(type)!.add(listener as Listener);
            return () => listenersRef.current.get(type)?.delete(listener as Listener);
        },
        [],
    );

    // ── Send ──────────────────────────────────────────────────────────────────
    const send = useCallback((type: WsEventType, payload: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({ type, payload, timestamp: new Date().toISOString() }),
            );
        }
    }, []);

    // ── Connection effect ─────────────────────────────────────────────────────
    useEffect(() => {
        unmountedRef.current = false;

        if (!url) {
            // Wrap in a microtask or timeout to resolve ESLint cascading render warning
            const timer = setTimeout(() => {
                if (!unmountedRef.current) setConnectionState('connected');
            }, 0);

            mockTimerRef.current = setInterval(() => {
                const events = createMockEvents();
                dispatch(events[Math.floor(Math.random() * events.length)]);
            }, 15_000);

            return () => {
                unmountedRef.current = true;
                clearTimeout(timer);
                if (mockTimerRef.current) clearInterval(mockTimerRef.current);
            };
        }

        // ── Real WebSocket — connects to Node.js backend ──────────────────────
        let reconnectDelay = 1_000;
        const MAX_DELAY    = 30_000;

        function connect() {
            if (unmountedRef.current) return;
            setConnectionState('connecting');

            const ws = new WebSocket(url as string);
            wsRef.current = ws;

            ws.onopen = () => {
                if (unmountedRef.current) { ws.close(); return; }
                setConnectionState('connected');
                reconnectDelay = 1_000; // reset backoff on successful connect
                // Confirm handshake with backend
                ws.send(JSON.stringify({
                    type: 'ping', payload: {}, timestamp: new Date().toISOString(),
                }));
            };

            ws.onmessage = (msg) => {
                try {
                    const event = JSON.parse(msg.data as string) as WsEvent;
                    dispatch(event);
                } catch {
                    console.warn('[WS] Failed to parse message:', msg.data);
                }
            };

            ws.onclose = (evt) => {
                if (unmountedRef.current) return;
                // Code 1000 = intentional close (unmount) — don't reconnect
                if (evt.code === 1000) return;
                setConnectionState('reconnecting');
                reconnectRef.current = setTimeout(() => {
                    reconnectDelay = Math.min(reconnectDelay * 2, MAX_DELAY);
                    connect();
                }, reconnectDelay);
            };

            ws.onerror = () => {
                // onerror always precedes onclose — let onclose drive reconnect
                setConnectionState('disconnected');
            };
        }

        connect();

        return () => {
            unmountedRef.current = true;
            wsRef.current?.close(1000, 'Component unmounted');
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
    handler: (event: WsEvent<T>) => void,
) {
    const { subscribe } = useWebSocket();
    useEffect(() => subscribe<T>(type, handler), [subscribe, type, handler]);
}