import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { incidents } from '../data/store.js';
import { addAudit, getOperator } from '../middleware/index.js';
import { wsManager } from '../websocket/manager.js';
import type { IncidentStatus, Recommendation, TimelineEvent } from '../types/backend-index.js';

// ─── PRIVATE HELPER ──────────────────────────────────────────────────────────

const addTimeline = (
    id: string,
    event: Omit<TimelineEvent, 'id' | 'time' | 'completed'> & { completed?: boolean }
): void => {
    const inc = incidents.get(id);
    if (!inc) return;
    const evt: TimelineEvent = {
        id:        uuid(),
        time:      new Date(),
        completed: event.completed ?? true,
        label:     event.label,
        type:      event.type,
        detail:    event.detail,
        actor:     event.actor,
    };
    inc.timeline.push(evt);
};

// ─── HANDLERS ────────────────────────────────────────────────────────────────

export const getIncidents = (_req: Request, res: Response) => {
    const list = Array.from(incidents.values()).sort(
        (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime()
    );
    res.json({ ok: true, data: list, total: list.length });
};

export const getIncidentById = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });
    res.json({ ok: true, data: inc });
};

export const updateIncidentStatus = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    const parse = z.object({
        status: z.enum(['detected', 'confirmed', 'responding', 'resolving', 'cleared']),
    }).safeParse(req.body);

    if (!parse.success) return res.status(400).json({ ok: false, error: 'Invalid status' });

    const prev = inc.status;
    inc.status = parse.data.status as IncidentStatus;
    inc.updatedAt = new Date();

    addTimeline(inc.id, {
        label: `Status changed to ${inc.status}`,
        type: 'operator',
        actor: getOperator(req),
        detail: `From ${prev} → ${inc.status}`
    });

    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: inc });
};

export const confirmIncident = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    inc.status = 'confirmed';
    inc.updatedAt = new Date();

    addTimeline(inc.id, { label: 'Incident confirmed by operator', type: 'operator', actor: getOperator(req), detail: 'Manual confirmation via dashboard' });
    addAudit({ type: 'incident_confirmed', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: inc.id, targetLabel: inc.name });

    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: inc });
};

export const escalateIncident = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});

    inc.updatedAt = new Date();

    addTimeline(inc.id, { label: 'Incident escalated to supervisor', type: 'operator', actor: getOperator(req), detail: reason ?? 'Escalated for senior review' });
    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: inc });
};

export const resolveIncident = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    inc.status = 'cleared';
    inc.updatedAt = new Date();
    inc.timeline = inc.timeline.map(e => ({ ...e, completed: true }));

    addTimeline(inc.id, { label: 'Incident resolved', type: 'operator', actor: getOperator(req), detail: 'Marked as cleared — traffic normalising' });
    addAudit({ type: 'incident_resolved', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: inc.id, targetLabel: inc.name });

    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: inc });
};

export const approveRecommendation = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const recId = req.params.recId as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    const rec = inc.recommendations.find((r: Recommendation) => r.id === recId);
    if (!rec) return res.status(404).json({ ok: false, error: 'Recommendation not found' });

    rec.status = 'approved';
    inc.updatedAt = new Date();

    addTimeline(inc.id, { label: `AI recommendation approved: ${rec.title}`, type: 'operator', actor: getOperator(req) });
    addAudit({ type: 'recommendation_approved', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: rec.id, targetLabel: rec.title });

    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: rec });
};

export const rejectRecommendation = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const recId = req.params.recId as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    const rec = inc.recommendations.find((r: Recommendation) => r.id === recId);
    if (!rec) return res.status(404).json({ ok: false, error: 'Recommendation not found' });

    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body ?? {});

    rec.status = 'rejected';
    inc.updatedAt = new Date();

    addTimeline(inc.id, { label: `AI recommendation rejected: ${rec.title}`, type: 'operator', actor: getOperator(req), detail: reason });
    addAudit({ type: 'recommendation_rejected', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: rec.id, targetLabel: rec.title, details: { reason } });

    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: rec });
};

export const rerouteTraffic = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    const { routeId } = z.object({
        routeId: z.string().optional(),
        geoJson: z.unknown().optional(),
    }).parse(req.body ?? {});

    const routeRec = inc.recommendations.find((r: Recommendation) => r.type === 'route');
    if (routeRec) routeRec.status = 'in_progress';

    inc.congestionIndex = Math.max(0, inc.congestionIndex - 22);
    inc.updatedAt = new Date();

    addTimeline(inc.id, { label: 'Traffic rerouted via Mbagathi Way', type: 'system', actor: 'System', detail: `Route ${routeId ?? 'AI-optimal'} activated — signals adjusting` });
    addAudit({ type: 'traffic_rerouted', performedBy: getOperator(req), agency: 'Traffic Ops', targetId: inc.id, targetLabel: inc.name, details: { routeId } });

    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: { message: 'Reroute initiated', congestionIndex: inc.congestionIndex } });
};

export const adjustSignals = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    const signalRec = inc.recommendations.find((r: Recommendation) => r.type === 'signal');
    if (signalRec) signalRec.status = 'in_progress';

    inc.updatedAt = new Date();

    addTimeline(inc.id, { label: 'Signal timing adjusted — 3 junctions', type: 'system', actor: 'System', detail: 'Mbagathi, Langata, James Gichuru — green phase extended +15s' });

    wsManager.emit('incident:updated', inc);
    res.json({ ok: true, data: { message: 'Signal adjustment applied', junctions: 3 } });
};

export const dispatchResponder = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const rspId = req.params.rspId as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    const rsp = inc.responders.find(r => r.id === rspId);
    if (!rsp) return res.status(404).json({ ok: false, error: 'Responder not found' });

    const { eta } = z.object({ eta: z.number().optional() }).parse(req.body ?? {});

    rsp.status = 'dispatched';
    rsp.eta = eta ?? 12;
    inc.updatedAt = new Date();

    addTimeline(inc.id, { label: `${rsp.name} dispatched`, type: 'responder', actor: rsp.badge, detail: `ETA ${rsp.eta} min from current position` });
    addAudit({ type: 'responder_dispatched', performedBy: getOperator(req), agency: 'Emergency Services', targetId: rsp.id, targetLabel: rsp.name });

    wsManager.emit('incident:updated', inc);
    wsManager.emit('responder:updated', { incidentId: inc.id, responderId: rsp.id, status: rsp.status, eta: rsp.eta });
    res.json({ ok: true, data: rsp });
};

export const updateResponderRoute = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const rspId = req.params.rspId as string;
    const inc = incidents.get(id);
    if (!inc) return res.status(404).json({ ok: false, error: 'Incident not found' });

    const rsp = inc.responders.find(r => r.id === rspId);
    if (!rsp) return res.status(404).json({ ok: false, error: 'Responder not found' });

    const { optimize, newEta } = z.object({
        optimize: z.boolean().optional(),
        newEta:   z.number().optional(),
    }).parse(req.body ?? {});

    if (optimize && rsp.eta !== null) rsp.eta = Math.max(1, rsp.eta - 2);
    if (newEta !== undefined) rsp.eta = newEta;
    inc.updatedAt = new Date();

    addTimeline(inc.id, { label: `${rsp.name} rerouted`, type: 'system', actor: 'ATMS-AI', detail: `AI-optimised route applied — new ETA ${rsp.eta} min` });

    wsManager.emit('responder:updated', { incidentId: inc.id, responderId: rsp.id, eta: rsp.eta });
    res.json({ ok: true, data: rsp });
};