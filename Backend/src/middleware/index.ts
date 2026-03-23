import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { auditLog } from '../data/store.js';
import { v4 as uuid } from 'uuid';
import type { AuditEntry, AuditActionType } from '../types/index.js';

// ─── CORS ─────────────────────────────────────────────────────────────────────

export const corsOptions = {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        const allowed = [
            process.env.FRONTEND_URL ?? 'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
        ];
        // Allow requests with no origin (Postman, curl, server-to-server)
        if (!origin || allowed.includes(origin)) {
            cb(null, true);
        } else {
            cb(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Operator-Id'],
};

// ─── Rate limiter ─────────────────────────────────────────────────────────────

export const limiter = rateLimit({
    windowMs:         parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    max:              parseInt(process.env.RATE_LIMIT_MAX       ?? '200',   10),
    standardHeaders:  true,
    legacyHeaders:    false,
    message:          { ok: false, error: 'Too many requests — slow down.' },
    skip: (req) => req.path === '/health', // don't rate-limit health check
});

// ─── Simple API-key / shared-secret auth ──────────────────────────────────────
// In production, replace with JWT validation (e.g. via next-auth / clerk tokens)

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Skip auth for health check and OPTIONS preflight
    if (req.method === 'OPTIONS' || req.path === '/health') {
        next(); return;
    }

    const secret = process.env.API_SECRET;
    if (!secret) { next(); return; } // No secret configured → open in dev

    const authHeader = req.headers.authorization ?? '';
    const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (token !== secret) {
        res.status(401).json({ ok: false, error: 'Unauthorized', code: 'INVALID_TOKEN' });
        return;
    }
    next();
}

// ─── Operator identity extractor ─────────────────────────────────────────────
// Frontend sends X-Operator-Id: "Fatima Nkosi" in all mutation requests.

export function getOperator(req: Request): string {
    return (req.headers['x-operator-id'] as string | undefined) ?? 'System';
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

export function addAudit(
    entry: Omit<AuditEntry, 'id' | 'timestamp'>
): AuditEntry {
    const record: AuditEntry = { id: uuid(), timestamp: new Date(), ...entry };
    auditLog.unshift(record); // newest first
    // Keep only last 1000 entries in memory
    if (auditLog.length > 1000) auditLog.splice(1000);
    return record;
}

// ─── Global error handler ─────────────────────────────────────────────────────

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error('[ERROR]', err.message, err.stack);
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({
        ok:    false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        code:  'SERVER_ERROR',
    });
}

// ─── 404 handler ─────────────────────────────────────────────────────────────

export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({ ok: false, error: `Route ${req.method} ${req.path} not found`, code: 'NOT_FOUND' });
}