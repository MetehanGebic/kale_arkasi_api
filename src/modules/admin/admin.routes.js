
import { Router } from 'express';
import adminController from './admin.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = Router();

// Tüm admin rotalarý auth ve isAdmin middleware'lerinden geçmeli
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

router.post('/tracked-matches', adminController.addTrackedMatch.bind(adminController));
router.get('/tracked-matches', adminController.getTrackedMatches.bind(adminController));
router.delete('/tracked-matches/:id', adminController.removeTrackedMatch.bind(adminController));

export default router;

