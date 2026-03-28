import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { alerts } from '../data/store.js';
import { addAudit, getOperator } from '../middleware/index.js';
import { wsManager } from '../websocket/manager.js';
const router = Router();
// ─── Validation schemas ───────────────────────────────────────────────────────
const AlertStatusSchema = z.enum(['active', 'acknowledged', 'escalated', 'ignored', 'resolved']);
const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
const TypeSchema = z.enum(['accident', 'congestion', 'roadwork', 'event', 'signal_failure', 'flooding', 'breakdown', 'other']);
// ─── GET /api/alerts ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
    // 1. Destructure and cast to string or undefined
    const severity = req.query.severity;
    const status = req.query.status;
    const type = req.query.type;
    const limit = req.query.limit || '50';
    const offset = req.query.offset || '0';
    let list = Array.from(alerts.values());
    // 2. Filters now receive guaranteed single strings
    if (severity)
        list = list.filter(a => a.severity === severity);
    if (status)
        list = list.filter(a => a.status === status);
    if (type)
        list = list.filter(a => a.type === type);
    // ... sorting logic remains same ...
    const total = list.length;
    const lim = Math.min(parseInt(limit, 10), 100); // Fixed TS2345
    const off = parseInt(offset, 10); // Fixed TS2345
    const paged = list.slice(off, off + lim);
    res.json({ ok: true, data: paged, total, limit: lim, offset: off });
});
// ─── GET /api/alerts/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
    const id = req.params.id;
    const alert = alerts.get(id);
    if (!alert) {
        res.status(404).json({ ok: false, error: 'Alert not found' });
        return;
    }
    res.json({ ok: true, data: alert });
});
// ─── POST /api/alerts ─────────────────────────────────────────────────────────
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
router.post('/', (req, res) => {
    const parse = CreateAlertSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: parse.error.issues });
        return;
    }
    const now = new Date();
    const alert = {
        id: uuid(), ...parse.data,
        status: 'active', detectedAt: now, updatedAt: now,
    };
    alerts.set(alert.id, alert);
    wsManager.emit('alert:created', alert);
    res.status(201).json({ ok: true, data: alert });
});
// ─── PATCH /api/alerts/:id/status ─────────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
    const id = req.params.id;
    const alert = alerts.get(id);
    if (!alert) {
        res.status(404).json({ ok: false, error: 'Alert not found' });
        return;
    }
    const parse = z.object({ status: AlertStatusSchema }).safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ ok: false, error: 'Invalid status' });
        return;
    }
    alert.status = parse.data.status;
    alert.updatedAt = new Date();
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});
// ─── POST /api/alerts/:id/acknowledge ─────────────────────────────────────────
router.post('/:id/acknowledge', (req, res) => {
    const id = req.params.id; // Explicit cast to string
    const alert = alerts.get(id);
    if (!alert) {
        res.status(404).json({ ok: false, error: 'Alert not found' });
        return;
    }
    alert.status = 'acknowledged';
    alert.updatedAt = new Date();
    addAudit({
        type: 'alert_approved',
        performedBy: getOperator(req),
        agency: 'Traffic Ops',
        targetId: id, // Now a guaranteed string
        targetLabel: alert.title
    });
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});
// ─── POST /api/alerts/:id/ignore ─────────────────────────────────────────────
router.post('/:id/ignore', (req, res) => {
    const id = req.params.id;
    const alert = alerts.get(id);
    if (!alert) {
        res.status(404).json({ ok: false, error: 'Alert not found' });
        return;
    }
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    alert.status = 'ignored';
    alert.updatedAt = new Date();
    addAudit({ type: 'alert_ignored', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: alert.id, targetLabel: alert.title, details: reason ? { reason } : undefined });
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});
// ─── POST /api/alerts/escalate ────────────────────────────────────────────────
// (matches existing route.ts in the frontend: app/api/alerts/escalate/route.ts)
router.post('/escalate', (req, res) => {
    const { id } = z.object({ id: z.string() }).parse(req.body);
    const alert = alerts.get(id);
    if (!alert) {
        res.status(404).json({ ok: false, error: 'Alert not found' });
        return;
    }
    alert.status = 'escalated';
    alert.updatedAt = new Date();
    addAudit({ type: 'alert_escalated', performedBy: getOperator(req), agency: 'Emergency Services', targetId: alert.id, targetLabel: alert.title });
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});
// ─── POST /api/alerts/:id/claim ──────────────────────────────────────────────
router.post('/:id/claim', (req, res) => {
    const id = req.params.id;
    const alert = alerts.get(id);
    if (!alert) {
        res.status(404).json({ ok: false, error: 'Alert not found' });
        return;
    }
    const operator = getOperator(req);
    if (alert.claimedBy && alert.claimedBy !== operator) {
        res.status(409).json({ ok: false, error: `Alert already claimed by ${alert.claimedBy}` });
        return;
    }
    alert.claimedBy = operator;
    alert.updatedAt = new Date();
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});
// ─── POST /api/alerts/:id/release ────────────────────────────────────────────
router.post('/:id/release', (req, res) => {
    const id = req.params.id;
    const alert = alerts.get(id);
    if (!alert) {
        res.status(404).json({ ok: false, error: 'Alert not found' });
        return;
    }
    delete alert.claimedBy;
    alert.updatedAt = new Date();
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});
// ─── POST /api/alerts/:id/dispatch ───────────────────────────────────────────
// Called by dispatchAlert() in use-alerts.ts.
// Marks the alert acknowledged and records a dispatch audit entry.
router.post('/:id/dispatch', (req, res) => {
    const id = req.params.id;
    const alert = alerts.get(id);
    if (!alert) {
        res.status(404).json({ ok: false, error: 'Alert not found' });
        return;
    }
    const { service } = z.object({ service: z.string().optional() }).parse(req.body ?? {});
    alert.status = 'acknowledged';
    alert.updatedAt = new Date();
    addAudit({ type: 'dispatch_sent', performedBy: getOperator(req), agency: 'Emergency Services', targetId: alert.id, targetLabel: alert.title, details: service ? { service } : undefined });
    wsManager.emit('alert:updated', alert);
    res.json({ ok: true, data: alert });
});
export default router;
//# sourceMappingURL=alerts.js.map