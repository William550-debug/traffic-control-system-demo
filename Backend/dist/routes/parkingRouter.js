import { Router } from 'express';
import * as parkingController from '../controllers/parkingController.js';
const router = Router();
router.get('/zones', parkingController.getZones);
router.get('/zones/:id', parkingController.getZoneById);
router.put('/zones/:id', parkingController.updateZone);
router.get('/recommendations', parkingController.getRecommendations);
router.post('/recommendations/:id/approve', parkingController.approveRecommendation);
router.post('/recommendations/:id/reject', parkingController.rejectRecommendation);
router.get('/audit', parkingController.getAuditLogs);
export default router;
//# sourceMappingURL=parkingRouter.js.map