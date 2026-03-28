import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { incidents } from '../data/store.js';
import { addAudit, getOperator } from '../middleware/index.js';
import { wsManager } from '../websocket/manager.js';
const router = Router();
// ─── Helper: append a timeline event to an incident ──────────────────────────
function addTimeline(id, event) {
    const inc = incidents.get(id);
    if (!inc)
        return;
    const evt = {
        id: uuid(),
        time: new Date(),
        completed: event.completed ?? true,
        label: event.label,
        type: event.type,
        detail: event.detail,
        actor: event.actor,
    };
    inc.timeline.push(evt);
}
// ─── GET /api/incidents ───────────────────────────────────────────────────────
router.get('/', (_req, res) => {
    const list = Array.from(incidents.values()).sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
    res.json({ ok: true, data: list, total: list.length });
});
// ─── GET /api/incidents/:id ───────────────────────────────────────────────────
router.get('/:id', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    res.json({ ok: true, data: inc });
});
// ─── PATCH /api/incidents/:id/status ─────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    const { status } = z.object({
        status: z.enum(['detected', 'confirmed', 'responding', 'resolving', 'cleared']),
    }).parse(req.body);
    const prev = inc.status;
    inc.status = status;
    inc.updatedAt = new Date();
    addTimeline(inc.id, { label: `Status changed to ${status}`, type: 'operator', actor: getOperator(req), detail: `From ${prev} → ${status}` });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: inc });
});
// ─── POST /api/incidents/:id/confirm ─────────────────────────────────────────
router.post('/:id/confirm', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    inc.status = 'confirmed';
    inc.updatedAt = new Date();
    addTimeline(inc.id, { label: 'Incident confirmed by operator', type: 'operator', actor: getOperator(req), detail: 'Manual confirmation via dashboard' });
    addAudit({ type: 'incident_confirmed', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: inc.id, targetLabel: inc.name });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: inc });
});
// ─── POST /api/incidents/:id/escalate ────────────────────────────────────────
//
// NOTE: escalate does NOT change the incident status — it notifies a supervisor.
// Status transitions are handled separately via PATCH /:id/status.
//
router.post('/:id/escalate', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});
    inc.updatedAt = new Date();
    addTimeline(inc.id, { label: 'Incident escalated to supervisor', type: 'operator', actor: getOperator(req), detail: reason ?? 'Escalated for senior review' });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: inc });
});
// ─── POST /api/incidents/:id/resolve ─────────────────────────────────────────
router.post('/:id/resolve', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    inc.status = 'cleared';
    inc.updatedAt = new Date();
    // Mark all pending timeline events as completed on resolution
    inc.timeline = inc.timeline.map(e => ({ ...e, completed: true }));
    addTimeline(inc.id, { label: 'Incident resolved', type: 'operator', actor: getOperator(req), detail: 'Marked as cleared — traffic normalising' });
    addAudit({ type: 'incident_resolved', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: inc.id, targetLabel: inc.name });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: inc });
});
// ─── POST /api/incidents/:id/recommendations/:recId/approve ──────────────────
router.post('/:id/recommendations/:recId/approve', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    const rec = inc.recommendations.find((r) => r.id === req.params.recId);
    if (!rec) {
        res.status(404).json({ ok: false, error: 'Recommendation not found' });
        return;
    }
    rec.status = 'approved';
    inc.updatedAt = new Date();
    // rec.title — correct field name (was rec.action in old AIRecommendation)
    addTimeline(inc.id, { label: `AI recommendation approved: ${rec.title}`, type: 'operator', actor: getOperator(req) });
    addAudit({ type: 'recommendation_approved', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: rec.id, targetLabel: rec.title });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: rec });
});
// ─── POST /api/incidents/:id/recommendations/:recId/reject ───────────────────
router.post('/:id/recommendations/:recId/reject', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    const rec = inc.recommendations.find((r) => r.id === req.params.recId);
    if (!rec) {
        res.status(404).json({ ok: false, error: 'Recommendation not found' });
        return;
    }
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});
    rec.status = 'rejected';
    inc.updatedAt = new Date();
    // rec.title — correct field name (was rec.action in old AIRecommendation)
    addTimeline(inc.id, { label: `AI recommendation rejected: ${rec.title}`, type: 'operator', actor: getOperator(req), detail: reason });
    addAudit({ type: 'recommendation_rejected', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: rec.id, targetLabel: rec.title, details: { reason } });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: rec });
});
// ─── POST /api/incidents/:id/traffic/reroute ─────────────────────────────────
router.post('/:id/traffic/reroute', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    const { routeId } = z.object({
        routeId: z.string().optional(),
        geoJson: z.unknown().optional(),
    }).parse(req.body ?? {});
    // Find the route recommendation by type (unified Recommendation uses 'route')
    const routeRec = inc.recommendations.find((r) => r.type === 'route');
    if (routeRec)
        routeRec.status = 'in_progress';
    inc.congestionIndex = Math.max(0, inc.congestionIndex - 22);
    inc.updatedAt = new Date();
    addTimeline(inc.id, { label: 'Traffic rerouted via Mbagathi Way', type: 'system', actor: 'System', detail: `Route ${routeId ?? 'AI-optimal'} activated — signals adjusting` });
    addAudit({ type: 'traffic_rerouted', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: inc.id, targetLabel: inc.name, details: { routeId } });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: { message: 'Reroute initiated', congestionIndex: inc.congestionIndex } });
});
// ─── POST /api/incidents/:id/signals/adjust ──────────────────────────────────
router.post('/:id/signals/adjust', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    // Find signal recommendation by type (unified Recommendation uses 'signal')
    const signalRec = inc.recommendations.find((r) => r.type === 'signal');
    if (signalRec)
        signalRec.status = 'in_progress';
    inc.updatedAt = new Date();
    addTimeline(inc.id, { label: 'Signal timing adjusted — 3 junctions', type: 'system', actor: 'System', detail: 'Mbagathi, Langata, James Gichuru — green phase extended +15s' });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: { message: 'Signal adjustment applied', junctions: 3 } });
});
// ─── POST /api/incidents/:id/responders/:rspId/dispatch ──────────────────────
router.post('/:id/responders/:rspId/dispatch', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    const rsp = inc.responders.find(r => r.id === req.params.rspId);
    if (!rsp) {
        res.status(404).json({ ok: false, error: 'Responder not found' });
        return;
    }
    const { eta } = z.object({ eta: z.number().optional() }).parse(req.body ?? {});
    rsp.status = 'dispatched';
    rsp.eta = eta ?? 12;
    inc.updatedAt = new Date();
    addTimeline(inc.id, { label: `${rsp.name} dispatched`, type: 'responder', actor: rsp.badge, detail: `ETA ${rsp.eta} min from current position` });
    addAudit({ type: 'responder_dispatched', performedBy: getOperator(req), agency: 'Emergency Services', targetId: rsp.id, targetLabel: rsp.name });
    wsManager.emit('incident:updated', inc);
    wsManager.emit('responder:updated', { incidentId: inc.id, responderId: rsp.id, status: rsp.status, eta: rsp.eta });
    res.json({ ok: true, data: rsp });
});
// ─── PATCH /api/incidents/:id/responders/:rspId/route ────────────────────────
router.patch('/:id/responders/:rspId/route', (req, res) => {
    const id = req.params.id;
    const inc = incidents.get(id);
    if (!inc) {
        res.status(404).json({ ok: false, error: 'Incident not found' });
        return;
    }
    const rsp = inc.responders.find(r => r.id === req.params.rspId);
    if (!rsp) {
        res.status(404).json({ ok: false, error: 'Responder not found' });
        return;
    }
    const { optimize, newEta } = z.object({
        optimize: z.boolean().optional(),
        newEta: z.number().optional(),
    }).parse(req.body ?? {});
    // Apply 2-min saving from AI optimisation
    if (optimize && rsp.eta !== null)
        rsp.eta = Math.max(1, rsp.eta - 2);
    if (newEta !== undefined)
        rsp.eta = newEta;
    inc.updatedAt = new Date();
    addTimeline(inc.id, { label: `${rsp.name} rerouted`, type: 'system', actor: 'ATMS-AI', detail: `AI-optimised route applied — new ETA ${rsp.eta} min` });
    wsManager.emit('responder:updated', { incidentId: inc.id, responderId: rsp.id, eta: rsp.eta });
    res.json({ ok: true, data: rsp });
});
export default router;
//# sourceMappingURL=incidents.js.map