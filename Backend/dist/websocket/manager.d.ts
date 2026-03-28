import { WebSocket } from 'ws';
import type { Server } from 'http';
import type { WsEvent, WsEventType } from '../types/backend-index.js';
export declare class WebSocketManager {
    private wss;
    private clients;
    private heartbeatInterval;
    init(server: Server): void;
    broadcast<T>(event: WsEvent<T>): void;
    sendTo<T>(ws: WebSocket, event: WsEvent<T>): void;
    emit<T>(type: WsEventType, payload: T): void;
    get clientCount(): number;
    shutdown(): void;
    private startSimulation;
}
export declare const wsManager: WebSocketManager;
//# sourceMappingURL=manager.d.ts.map