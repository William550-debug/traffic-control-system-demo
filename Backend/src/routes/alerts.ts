import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { alerts } from '../data/store';
import { addAudit, getOperator } from '../middleware';
import { wsManager } from '../websocket/manager';
import type { Alert, AlertStatus, Severity, AlertType } from '../types';

const router = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────

const AlertStatusSchema = z.enum(['active','acknowledged','escalated','ignored','resolved']);
const SeveritySchema    = z.enum(['critical','high','medium','low','info']);
const TypeSchema        = z.enum(['accident','congestion','roadwork','event','signal_failure','flooding','breakdown','other']);

// ─── GET /api/alerts ──────────────────────────────────────────────────────────

router.get('/', (req: Request, res: Response) => {
    const { severity, status, type, limit = '50', offset = '0' } = req.query;

    let list = Array.from(alerts.values());

    if (severity) list = list.filter(a => a.severity === severity);
    if (status)   list = list.filter(a => a.status   === status);
    if (type)     list = list.filter(a => a.type     === type);

    // Sort: critical first, then by detectedAt desc
    const sevOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    list.sort((a, b) => {
        const sd = sevOrder[a.severity] - sevOrder[b.severity];
        if (sd !== 0) return sd;
        return b.detectedAt.getTime() - a.detectedAt.getTime();
    });

    const total  = list.length;
    const lim    = Math.min(parseInt(limit as string, 10), 100);
    const off    = parseInt(offset as string, 10);
    const paged  = list.slice(off, off + lim);

    res.json({ ok: true, data: paged, total, limit: lim, offset: off });
});

// ─── GET /api/alerts/:id ──────────────────────────────────────────────────────

router.get('/:id', (req: Request, res: Response) => {
    const alert = alerts.get(req.params.id);
    if (!alert) { res.status(404).json({ ok: false, error: 'Alert not found' }); return; }
    res.json({ ok: true, data: alert });
});

// ─── POST /api/alerts ─────────────────────────────────────────────────────────

const CreateAlertSchema = z.object({
    title:       z.string().min(3).max(200),
    description: z.string().min(10).max(1000),
    type:        TypeSchema,
    severity:    SeveritySchema,
    confidence:  z.number().min(0).max(100),
    location: z.object({
        lat:   z.number(),
        lng:   z.number(),
        label: z.string(),
        zone:  z.string().optional(),
    }),
    affectedIntersections: z.array(z.string()).default([]),
    agency:           z.string().optional(),
    suggestedAction:  z.string().optional(),
});

router.post('/', (req: Request, res: Response) => {
    const parse = CreateAlertSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: parse.error.issues });
        return;
    }
    const now: Date = new Date();
    const alert: Alert = {
        id: uuid(), ...parse.data,
        status: 'active', detectedAt: now, updatedAt: now,
    };
    alerts.set(alert.id, alert);
    wsManager.emit('alert:created', alert);
    res.status(201).json({ ok: true, data: alert });
});

// ─── PATCH /api/alerts/:id/status ─────────────────────────────────────────────

router.patch('/:id/status', (req: Request, res: Response) => {
    const alert = alerts.get(req.params.id);
    if (!alert) { res.status(404).json({ ok: false, error: 'Alert not found' }); return; }

    const parse = z.object({ status: AlertStatusSchema }).safeParse(req.body);
    if (!parse.success) { res.status(400).json({ ok: false, error: 'Invalid status' }); return; }

    alert.status    = parse.data.status as AlertStatus;
    alert.updatedAt = new Date();

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});

// ─── POST /api/alerts/:id/acknowledge ─────────────────────────────────────────

router.post('/:id/acknowledge', (req: Request, res: Response) => {
    const alert = alerts.get(req.params.id);
    if (!alert) { res.status(404).json({ ok: false, error: 'Alert not found' }); return; }

    alert.status    = 'acknowledged';
    alert.updatedAt = new Date();

    addAudit({ type: 'alert_approved', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: alert.id, targetLabel: alert.title });
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});

// ─── POST /api/alerts/:id/ignore ─────────────────────────────────────────────

router.post('/:id/ignore', (req: Request, res: Response) => {
    const alert = alerts.get(req.params.id);
    if (!alert) { res.status(404).json({ ok: false, error: 'Alert not found' }); return; }

    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

    alert.status    = 'ignored';
    alert.updatedAt = new Date();

    addAudit({ type: 'alert_ignored', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: alert.id, targetLabel: alert.title, details: reason ? { reason } : undefined });
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});

// ─── POST /api/alerts/escalate ────────────────────────────────────────────────
// (matches existing route.ts in the frontend: app/api/alerts/escalate/route.ts)

router.post('/escalate', (req: Request, res: Response) => {
    const { id } = z.object({ id: z.string() }).parse(req.body);
    const alert   = alerts.get(id);
    if (!alert) { res.status(404).json({ ok: false, error: 'Alert not found' }); return; }

    alert.status    = 'escalated';
    alert.updatedAt = new Date();

    addAudit({ type: 'alert_escalated', performedBy: getOperator(req), agency: 'Emergency Services', targetId: alert.id, targetLabel: alert.title });
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});

// ─── POST /api/alerts/:id/claim ──────────────────────────────────────────────

router.post('/:id/claim', (req: Request, res: Response) => {
    const alert    = alerts.get(req.params.id);
    if (!alert) { res.status(404).json({ ok: false, error: 'Alert not found' }); return; }

    const operator  = getOperator(req);
    if (alert.claimedBy && alert.claimedBy !== operator) {
        res.status(409).json({ ok: false, error: `Alert already claimed by ${alert.claimedBy}` }); return;
    }
    alert.claimedBy = operator;
    alert.updatedAt = new Date();

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});

// ─── POST /api/alerts/:id/release ────────────────────────────────────────────

router.post('/:id/release', (req: Request, res: Response) => {
    const alert = alerts.get(req.params.id);
    if (!alert) { res.status(404).json({ ok: false, error: 'Alert not found' }); return; }

    delete alert.claimedBy;
    alert.updatedAt = new Date();

    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});

export default router;