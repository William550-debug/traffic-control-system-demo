import { Router } from 'express';
import * as alertController from '../controllers/alertController.js';

const alertRouter = Router();

// ─── COLLECTION ROUTES ───────────────────────────────────────────────────────
alertRouter.get('/', alertController.getAlerts);
alertRouter.post('/', alertController.createAlert);

// ─── SPECIFIC ALERT ACTIONS ──────────────────────────────────────────────────
// Note: order matters for static routes like /escalate vs dynamic routes like /:id
alertRouter.post('/escalate', alertController.escalateAlert);

alertRouter.get('/:id', alertController.getAlertById);
alertRouter.patch('/:id/status', alertController.updateAlertStatus);
alertRouter.post('/:id/acknowledge', alertController.acknowledgeAlert);
alertRouter.post('/:id/ignore', alertController.ignoreAlert);
alertRouter.post('/:id/claim', alertController.claimAlert);
alertRouter.post('/:id/release', alertController.releaseAlert);
alertRouter.post('/:id/dispatch', alertController.dispatchAlert);

export default alertRouter;