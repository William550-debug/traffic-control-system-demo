import rateLimit from 'express-rate-limit';
import { auditLog } from '../data/store.js';
import { v4 as uuid } from 'uuid';
// Lazy import to avoid circular dependency (middleware ← routes ← wsManager)
// wsManager is initialised in backend-index.ts before any routes are called, so this
// require() is always resolved by the time addAudit() is first invoked.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getWsManager = () => require('../websocket/manager').wsManager;
// ─── CORS ─────────────────────────────────────────────────────────────────────
export const corsOptions = {
    origin: (origin, cb) => {
        const allowed = [
            process.env.FRONTEND_URL ?? 'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
        ];
        // Allow requests with no origin (Postman, curl, server-to-server)
        if (!origin || allowed.includes(origin)) {
            cb(null, true);
        }
        else {
            cb(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Operator-Id'],
};
// ─── Rate limiter ─────────────────────────────────────────────────────────────
export const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '200', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many requests — slow down.' },
    skip: (req) => req.path === '/health', // don't rate-limit health check
});
// ─── Simple API-key / shared-secret auth ──────────────────────────────────────
// In production, replace with JWT validation (e.g. via next-auth / clerk tokens)
export function authMiddleware(req, res, next) {
    // Skip auth for health check and OPTIONS preflight
    if (req.method === 'OPTIONS' || req.path === '/health') {
        next();
        return;
    }
    const secret = process.env.API_SECRET;
    if (!secret) {
        next();
        return;
    } // No secret configured → open in dev
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (token !== secret) {
        res.status(401).json({ ok: false, error: 'Unauthorized', code: 'INVALID_TOKEN' });
        return;
    }
    next();
}
// ─── Operator identity extractor ─────────────────────────────────────────────
// Frontend sends X-Operator-Id: "Fatima Nkosi" in all mutation requests.
export function getOperator(req) {
    return req.headers['x-operator-id'] ?? 'System';
}
// ─── Audit helper ─────────────────────────────────────────────────────────────
export function addAudit(entry) {
    const record = { id: uuid(), timestamp: new Date(), ...entry };
    auditLog.unshift(record); // newest first
    // Keep only last 1000 entries in memory
    if (auditLog.length > 1000)
        auditLog.splice(1000);
    // Broadcast to all connected operators so activity feeds stay live
    try {
        getWsManager().emit('action:performed', record);
    }
    catch {
        // wsManager not yet initialised (server startup) — safe to skip
    }
    return record;
}
// ─── Global error handler ─────────────────────────────────────────────────────
export function errorHandler(err, _req, res, _next) {
    console.error('[ERROR]', err.message, err.stack);
    const status = err.status ?? 500;
    res.status(status).json({
        ok: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        code: 'SERVER_ERROR',
    });
}
// ─── 404 handler ─────────────────────────────────────────────────────────────
export function notFoundHandler(req, res) {
    res.status(404).json({ ok: false, error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' });
}
//# sourceMappingURL=index.js.map