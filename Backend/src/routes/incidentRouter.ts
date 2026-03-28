import { Router } from 'express';
import * as incidentController from '../controllers/incidentController.js';

const incidentRouter = Router();

// ─── COLLECTION ROUTES ───────────────────────────────────────────────────────
incidentRouter.get('/', incidentController.getIncidents);

// ─── INDIVIDUAL INCIDENT ROUTES ──────────────────────────────────────────────
incidentRouter.get('/:id', incidentController.getIncidentById);
incidentRouter.patch('/:id/status', incidentController.updateIncidentStatus);
incidentRouter.post('/:id/confirm', incidentController.confirmIncident);
incidentRouter.post('/:id/escalate', incidentController.escalateIncident);
incidentRouter.post('/:id/resolve', incidentController.resolveIncident);

// ─── RECOMMENDATIONS ─────────────────────────────────────────────────────────
incidentRouter.post('/:id/recommendations/:recId/approve', incidentController.approveRecommendation);
incidentRouter.post('/:id/recommendations/:recId/reject', incidentController.rejectRecommendation);

// ─── TRAFFIC & SIGNALS ───────────────────────────────────────────────────────
incidentRouter.post('/:id/traffic/reroute', incidentController.rerouteTraffic);
incidentRouter.post('/:id/signals/adjust', incidentController.adjustSignals);

// ─── RESPONDERS ──────────────────────────────────────────────────────────────
incidentRouter.post('/:id/responders/:rspId/dispatch', incidentController.dispatchResponder);
incidentRouter.patch('/:id/responders/:rspId/route', incidentController.updateResponderRoute);

export default incidentRouter;