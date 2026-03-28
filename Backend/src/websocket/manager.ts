import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';
import type { WsEvent, WsEventType } from '../types/backend-index.js';

// ─── WebSocket manager ────────────────────────────────────────────────────────

export class WebSocketManager {
    private wss: WebSocketServer | null = null;
    private clients = new Set<WebSocket>();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    init(server: Server): void {
        this.wss = new WebSocketServer({ server, path: '/ws' });

        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            const ip = req.socket.remoteAddress ?? 'unknown';
            console.log(`[WS] Client connected from ${ip} — total: ${this.clients.size + 1}`);
            this.clients.add(ws);

            // Send welcome + current state summary
            this.sendTo(ws, { type: 'ping', payload: { message: 'ATMS WebSocket connected', timestamp: new Date().toISOString() }, timestamp: new Date().toISOString() });

            ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw.toString()) as WsEvent;
                    if (msg.type === 'ping') {
                        this.sendTo(ws, { type: 'pong', payload: {}, timestamp: new Date().toISOString() });
                    }
                } catch {
                    // Ignore malformed messages
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log(`[WS] Client disconnected — remaining: ${this.clients.size}`);
            });

            ws.on('error', (err) => {
                console.error('[WS] Client error:', err.message);
                this.clients.delete(ws);
            });
        });

        // Heartbeat — keeps NAT connections alive
        const intervalMs = parseInt(process.env.WS_HEARTBEAT_INTERVAL ?? '30000', 10);
        this.heartbeatInterval = setInterval(() => {
            this.broadcast({ type: 'ping', payload: { ts: Date.now() }, timestamp: new Date().toISOString() });
        }, intervalMs);

        // Simulate live alert updates every 15 seconds for dev/demo purposes
        if (process.env.NODE_ENV === 'development') {
            this.startSimulation();
        }

        console.log('[WS] WebSocket server initialised on path /ws');
    }

    broadcast<T>(event: WsEvent<T>): void {
        const payload = JSON.stringify(event);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        }
    }

    sendTo<T>(ws: WebSocket, event: WsEvent<T>): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(event));
        }
    }

    emit<T>(type: WsEventType, payload: T): void {
        this.broadcast({ type, payload, timestamp: new Date().toISOString() });
    }

    get clientCount(): number {
        return this.clients.size;
    }

    shutdown(): void {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.wss?.close();
    }

    // ── Dev simulation — periodically emit realistic events ──────────────────

    private startSimulation(): void {
        // Simulate responder position updates every 5s
        let responderTick = 0;
        setInterval(() => {
            responderTick++;
            const eta = Math.max(0, 3 - Math.floor(responderTick / 3));
            this.emit('responder:updated', {
                incidentId: 'INC-2026-0847',
                responderId: 'rsp1',
                eta,
                status: eta === 0 ? 'arrived' : 'en_route',
                lat: -1.3056 + (responderTick * 0.0005),
                lng:  36.7989,
            });
        }, 5000);

        // Simulate health metric updates every 20s
        setInterval(() => {
            this.emit('health:updated', {
                latencyMs: 30 + Math.floor(Math.random() * 40),
                activeSensors: 230 + Math.floor(Math.random() * 10),
                updatedAt: new Date().toISOString(),
            });
        }, 20000);

        console.log('[WS] Development simulation enabled');
    }
}

export const wsManager = new WebSocketManager();