// ─── Corridors router ─────────────────────────────────────────────────────────
import { Router } from 'express';
import { z } from 'zod';
import { corridors, auditLog, recommendations, systemHealth, predictiveData } from '../data/store.js';
import { addAudit, getOperator } from '../middleware/index.js';
import { wsManager } from '../websocket/manager.js';
// ──────────────────────────────────────────────────────────────────────────────
// CORRIDORS
// ──────────────────────────────────────────────────────────────────────────────
export const corridorsRouter = Router();
corridorsRouter.get('/', (_req, res) => {
    res.json({ ok: true, data: Array.from(corridors.values()) });
});
corridorsRouter.get('/:id', (req, res) => {
    const id = req.params.id;
    const c = corridors.get(id);
    if (!c) {
        res.status(404).json({ ok: false, error: 'Corridor not found' });
        return;
    }
    res.json({ ok: true, data: c });
});
corridorsRouter.patch('/:id/timing', (req, res) => {
    const id = req.params.id;
    const c = corridors.get(id);
    if (!c) {
        res.status(404).json({ ok: false, error: 'Corridor not found' });
        return;
    }
    if (c.locked && c.lockedBy !== getOperator(req)) {
        res.status(423).json({ ok: false, error: `Corridor locked by ${c.lockedBy}` });
        return;
    }
    const TimingSchema = z.object({
        greenDuration: z.number().min(5).max(120),
        redDuration: z.number().min(5).max(120),
        yellowDuration: z.number().min(2).max(10),
        cycleLength: z.number().min(20).max(240),
    });
    const parse = TimingSchema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ ok: false, error: 'Invalid timing', details: parse.error.issues });
        return;
    }
    c.timing = parse.data;
    c.updatedAt = new Date();
    addAudit({ type: 'signal_adjusted', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: c.id, targetLabel: `${c.name} — signal timing updated` });
    // Broadcast to all WS clients so useCorridor() updates live
    wsManager.emit('corridor:updated', { id: c.id, timing: c.timing, updatedAt: c.updatedAt });
    res.json({ ok: true, data: c });
});
corridorsRouter.post('/:id/lock', (req, res) => {
    const id = req.params.id;
    const c = corridors.get(id);
    if (!c) {
        res.status(404).json({ ok: false, error: 'Corridor not found' });
        return;
    }
    c.locked = true;
    c.lockedBy = getOperator(req);
    wsManager.emit('corridor:updated', { id: c.id, locked: true, lockedBy: c.lockedBy });
    res.json({ ok: true, data: c });
});
corridorsRouter.post('/:id/unlock', (req, res) => {
    const id = req.params.id;
    const c = corridors.get(id);
    if (!c) {
        res.status(404).json({ ok: false, error: 'Corridor not found' });
        return;
    }
    c.locked = false;
    delete c.lockedBy;
    wsManager.emit('corridor:updated', { id: c.id, locked: false, lockedBy: null });
    res.json({ ok: true, data: c });
});
// ──────────────────────────────────────────────────────────────────────────────
// AUDIT
// ──────────────────────────────────────────────────────────────────────────────
export const auditRouter = Router();
auditRouter.get('/', (req, res) => {
    const limitParam = req.query.limit || '100';
    const offsetParam = req.query.offset || '0';
    const type = req.query.type;
    const operator = req.query.operator;
    let list = [...auditLog];
    if (type)
        list = list.filter(e => e.type === type);
    if (operator)
        list = list.filter(e => e.performedBy === operator);
    // 2. Parse strictly to resolve TS2554
    const lim = Math.min(parseInt(limitParam, 10), 500);
    const off = parseInt(offsetParam, 10);
    res.json({
        ok: true,
        data: list.slice(off, off + lim),
        total: list.length,
        limit: lim,
        offset: off,
    });
});
auditRouter.post('/', (req, res) => {
    const Schema = z.object({
        type: z.string(),
        performedBy: z.string(),
        agency: z.string(),
        targetId: z.string(),
        targetLabel: z.string(),
        details: z.record(z.string(), z.unknown()).optional()
    });
    const parse = Schema.safeParse(req.body);
    if (!parse.success) {
        res.status(400).json({ ok: false, error: 'Validation failed', details: parse.error.issues });
        return;
    }
    const entry = addAudit(parse.data);
    res.status(201).json({ ok: true, data: entry });
});
// ──────────────────────────────────────────────────────────────────────────────
// AI RECOMMENDATIONS
// ──────────────────────────────────────────────────────────────────────────────
export const recommendationsRouter = Router();
recommendationsRouter.get('/', (_req, res) => {
    const list = Array.from(recommendations.values()).sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    res.json({ ok: true, data: list });
});
recommendationsRouter.post('/:id/approve', (req, res) => {
    const id = req.params.id;
    const rec = recommendations.get(id);
    if (!rec) {
        res.status(404).json({ ok: false, error: 'Recommendation not found' });
        return;
    }
    rec.status = 'approved';
    addAudit({ type: 'ai_approved', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: rec.id, targetLabel: rec.title });
    wsManager.emit('recommendation:new', rec);
    res.json({ ok: true, data: rec });
});
recommendationsRouter.post('/:id/reject', (req, res) => {
    const id = req.params.id;
    const rec = recommendations.get(id);
    if (!rec) {
        res.status(404).json({ ok: false, error: 'Recommendation not found' });
        return;
    }
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});
    rec.status = 'rejected';
    addAudit({ type: 'ai_rejected', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: rec.id, targetLabel: rec.title, details: { reason } });
    res.json({ ok: true, data: rec });
});
// ──────────────────────────────────────────────────────────────────────────────
// SYSTEM HEALTH
// ──────────────────────────────────────────────────────────────────────────────
export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
    // Freshen the updatedAt timestamp + randomise latency slightly
    systemHealth.updatedAt = new Date();
    systemHealth.latencyMs = 30 + Math.floor(Math.random() * 30);
    res.json({ ok: true, data: systemHealth });
});
// ──────────────────────────────────────────────────────────────────────────────
// PREDICTIVE
// ──────────────────────────────────────────────────────────────────────────────
export const predictiveRouter = Router();
predictiveRouter.get('/', (_req, res) => {
    res.json({ ok: true, data: predictiveData });
});
predictiveRouter.get('/hotspots', (_req, res) => {
    res.json({ ok: true, data: predictiveData.hotspots });
});
predictiveRouter.get('/forecast', (_req, res) => {
    res.json({ ok: true, data: predictiveData.congestionForecast });
});
predictiveRouter.get('/peak-hours', (_req, res) => {
    res.json({ ok: true, data: predictiveData.peakHours });
});
//# sourceMappingURL=misc.js.map