import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { alerts } from '../data/store.js';
import { addAudit, getOperator } from '../middleware/index.js';
import { wsManager } from '../websocket/manager.js';
import type { Alert, AlertStatus, Severity } from '../types/backend-index.js';

// ─── VALIDATION SCHEMAS ───────────────────────────────────────────────────────
const AlertStatusSchema = z.enum(['active', 'acknowledged', 'escalated', 'ignored', 'resolved']);
const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
const TypeSchema = z.enum(['accident', 'congestion', 'roadwork', 'event', 'signal_failure', 'flooding', 'breakdown', 'other']);

const CreateAlertSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(1000),
    type: TypeSchema,
    severity: SeveritySchema,
    confidence: z.number().min(0).max(100),
    location: z.object({
        lat: z.number(),
        lng: z.number(),
        label: z.string(),
        zone: z.string().optional(),
    }),
    affectedIntersections: z.array(z.string()).default([]),
    agency: z.string().optional(),
    suggestedAction: z.string().optional(),
});

// ─── HANDLERS ────────────────────────────────────────────────────────────────

export const getAlerts = (req: Request, res: Response) => {
    // Cast query params to string or undefined to resolve TS2345/TS2322
    const severity = req.query.severity as string | undefined;
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const limit = (req.query.limit as string) || '50';
    const offset = (req.query.offset as string) || '0';

    let list = Array.from(alerts.values());

    if (severity) list = list.filter(a => a.severity === severity);
    if (status) list = list.filter(a => a.status === status);
    if (type) list = list.filter(a => a.type === type);

    const total = list.length;
    const lim = Math.min(parseInt(limit, 10), 100);
    const off = parseInt(offset, 10);
    const paged = list.slice(off, off + lim);

    res.json({ ok: true, data: paged, total, limit: lim, offset: off });
};

export const getAlertById = (req: Request, res: Response) => {
    // Cast param to string explicitly
    const id = req.params.id as string;
    const alert = alerts.get(id);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });
    res.json({ ok: true, data: alert });
};

export const createAlert = (req: Request, res: Response) => {
    const parse = CreateAlertSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ ok: false, error: 'Validation failed', details: parse.error.issues });
    }
    const now = new Date();
    const alert: Alert = {
        id: uuid(),
        ...parse.data,
        status: 'active',
        detectedAt: now,
        updatedAt: now,
    };
    alerts.set(alert.id, alert);
    wsManager.emit('alert:created', alert);
    res.status(201).json({ ok: true, data: alert });
};

export const updateAlertStatus = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const alert = alerts.get(id);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

    const parse = z.object({ status: AlertStatusSchema }).safeParse(req.body);
    if (!parse.success) return res.status(400).json({ ok: false, error: 'Invalid status' });

    // Explicitly cast to AlertStatus to satisfy TS2322
    alert.status = parse.data.status as AlertStatus;
    alert.updatedAt = new Date();

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
};

export const acknowledgeAlert = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const alert = alerts.get(id);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

    alert.status = 'acknowledged';
    alert.updatedAt = new Date();

    addAudit({
        type: 'alert_approved',
        performedBy: getOperator(req),
        agency: 'Traffic Ops',
        targetId: id,
        targetLabel: alert.title
    });

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
};

export const ignoreAlert = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const alert = alerts.get(id);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

    // Using .parse here is fine if you're sure of the body structure, or safeParse for safety
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

    alert.status = 'ignored';
    alert.updatedAt = new Date();

    addAudit({
        type: 'alert_ignored',
        performedBy: getOperator(req),
        agency: 'Traffic Ops',
        targetId: alert.id,
        targetLabel: alert.title,
        details: reason ? { reason } : undefined
    });

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
};

export const escalateAlert = (req: Request, res: Response) => {
    // Extract ID from body via Zod which ensures it's a string
    const result = z.object({ id: z.string() }).safeParse(req.body);
    if (!result.success) return res.status(400).json({ ok: false, error: 'ID required' });

    const { id } = result.data;
    const alert = alerts.get(id);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

    alert.status = 'escalated';
    alert.updatedAt = new Date();

    addAudit({
        type: 'alert_escalated',
        performedBy: getOperator(req),
        agency: 'Emergency Services',
        targetId: alert.id,
        targetLabel: alert.title
    });

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
};

export const claimAlert = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const alert = alerts.get(id);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

    const operator = getOperator(req);
    if (alert.claimedBy && alert.claimedBy !== operator) {
        return res.status(409).json({ ok: false, error: `Alert already claimed by ${alert.claimedBy}` });
    }

    alert.claimedBy = operator;
    alert.updatedAt = new Date();

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
};

export const releaseAlert = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const alert = alerts.get(id);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

    delete alert.claimedBy;
    alert.updatedAt = new Date();

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
};

export const dispatchAlert = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const alert = alerts.get(id);
    if (!alert) return res.status(404).json({ ok: false, error: 'Alert not found' });

    const { service } = z.object({ service: z.string().optional() }).parse(req.body ?? {});

    alert.status = 'acknowledged';
    alert.updatedAt = new Date();

    addAudit({
        type: 'dispatch_sent',
        performedBy: getOperator(req),
        agency: 'Emergency Services',
        targetId: alert.id,
        targetLabel: alert.title,
        details: service ? { service } : undefined
    });

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
};