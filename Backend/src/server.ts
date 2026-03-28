import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { corsOptions, limiter, authMiddleware, errorHandler, notFoundHandler } from './middleware/index.js';
import { wsManager } from './websocket/manager.js';

import authRouter        from './routes/authRouter.js';
import alertsRouter      from './routes/alertRouter.js';
import incidentsRouter   from './routes/incidentRouter.js';
import {
    corridorsRouter, auditRouter, recommendationsRouter,
    healthRouter, predictiveRouter,
} from './routes/misc.js';
import parkingRouter from "./routes/parkingRouter.js";

const app    = express();
const server = http.createServer(app);
const PORT   = parseInt(process.env.PORT ?? '4000', 10);

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(limiter);

// ─── Health check (unauthenticated) ──────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({
        ok: true, service: 'ATMS Backend', version: '1.0.0',
        environment: process.env.NODE_ENV,
        uptime: Math.floor(process.uptime()),
        wsClients: wsManager.clientCount,
        timestamp: new Date().toISOString(),
    });
});

// ─── Auth routes (unauthenticated — login doesn't need a token yet) ───────────

app.use('/api/auth', authRouter);

// ─── All routes below require Bearer token ────────────────────────────────────

app.use(authMiddleware);

app.use('/api/alerts',          alertsRouter);
app.use('/api/incidents',       incidentsRouter);
app.use('/api/corridors',       corridorsRouter);
app.use('/api/audit',           auditRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/health',          healthRouter);
app.use('/api/predictive',      predictiveRouter);
app.use('/api/parking', parkingRouter);


// ─── Error handlers ───────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── WebSocket ────────────────────────────────────────────────────────────────

wsManager.init(server);

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║  ATMS Backend — Nairobi Traffic Management    ║
║                                               ║
║  HTTP   → http://localhost:${PORT}               ║
║  WS     → ws://localhost:${PORT}/ws              ║
║  Health → http://localhost:${PORT}/health         ║
║  Auth   → POST http://localhost:${PORT}/api/auth/login ║
╚═══════════════════════════════════════════════╝
    `.trim());
});

process.on('SIGTERM', () => {
    wsManager.shutdown();
    server.close(() => { console.log('[SERVER] Closed'); process.exit(0); });
});
process.on('SIGINT', () => {
    wsManager.shutdown();
    server.close(() => process.exit(0));
});

export default app;