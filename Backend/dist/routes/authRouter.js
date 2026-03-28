import { Router } from 'express';
import * as authController from '../controllers/authController.js';
const authRouter = Router();
authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authController.getMe);
export default authRouter;
//# sourceMappingURL=authRouter.js.map