// hooks/use-websocket.ts
// ─────────────────────────────────────────────────────────────────────────────
// Singleton WebSocket hook.
//
// Design decisions:
//   • One WS connection per browser tab (singleton ref pattern).
//   • Auto-reconnects with exponential back-off (max 30 s).
//   • Typed via WsEvent<T> — consumers register typed handlers.
//   • Ping/pong keepalive keeps the connection alive through idle proxies.
//   • Exported as a named hook so multiple components can listen without
//     opening multiple sockets.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import type { WsEvent, WsEventType } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000';

const PING_INTERVAL_MS  = 25_000;   // send ping every 25 s
const INITIAL_DELAY_MS  = 1_000;    // first reconnect after 1 s
const MAX_DELAY_MS      = 30_000;   // cap back-off at 30 s

// ─── Module-level singleton (survives component re-renders) ───────────────────

let socket:    WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let delay = INITIAL_DELAY_MS;

// Listener registry: eventType → Set of handlers
const listeners = new Map<WsEventType, Set<(payload: unknown) => void>>();

function getOrAddSet(type: WsEventType) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    return listeners.get(type)!;
}

// ─── Core connection logic ────────────────────────────────────────────────────

function connect() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

    socket = new WebSocket(WS_URL);

    // ── Keepalive ping ──
    let pingHandle: ReturnType<typeof setInterval> | null = null;

    socket.onopen = () => {
        delay = INITIAL_DELAY_MS;   // reset back-off on successful connection
        pingHandle = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping' }));
            }
        }, PING_INTERVAL_MS);
    };

    socket.onmessage = (ev: MessageEvent) => {
        let msg: WsEvent;
        try { msg = JSON.parse(ev.data as string); }
        catch { return; }  // ignore malformed frames

        // Dispatch to all registered listeners for this event type
        listeners.get(msg.type as WsEventType)?.forEach(fn => fn(msg.payload));
    };

    socket.onclose = () => {
        if (pingHandle) clearInterval(pingHandle);
        scheduleReconnect();
    };

    socket.onerror = () => {
        socket?.close();  // triggers onclose → scheduleReconnect
    };
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        delay = Math.min(delay * 2, MAX_DELAY_MS);   // exponential back-off
        connect();
    }, delay);
}

// ─── Public hook ──────────────────────────────────────────────────────────────

/**
 * Subscribe to one or more WebSocket event types.
 *
 * @example
 * useWebSocket('incident:updated', (payload) => {
 *     setIncident(payload as Incident);
 * });
 */
export function useWebSocket<T = unknown>(
    eventType: WsEventType | WsEventType[],
    handler: (payload: T) => void,
): void {
    // Stable ref so we never need to re-register on every render
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    const stableHandler = useCallback((payload: unknown) => {
        handlerRef.current(payload as T);
    }, []);

    useEffect(() => {
        // Ensure the singleton connection exists
        connect();

        const types = Array.isArray(eventType) ? eventType : [eventType];

        types.forEach(t => getOrAddSet(t).add(stableHandler));

        return () => {
            types.forEach(t => listeners.get(t)?.delete(stableHandler));
        };
    }, [eventType, stableHandler]);
}

/**
 * Returns the current WebSocket readyState (0–3).
 * Use for connection status badges — poll with a setInterval if needed.
 */
export function getWsReadyState(): number {
    return socket?.readyState ?? WebSocket.CLOSED;
}