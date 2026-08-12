import { Router } from 'express';
import * as superligController from './superlig.controller.js';
import { verifyToken } from '../../middlewares/authMiddleware.js';
import { requireAdmin } from '../../middlewares/requireAdmin.js';

const router = Router();

router.get('/standings', superligController.getStandings);
router.get('/fixtures', superligController.getFixtures);
router.get('/top-scorers', superligController.getTopScorers);
router.get('/transfers', superligController.getTransfers);

// Admin-only route for sync
router.post('/sync', verifyToken, requireAdmin, superligController.syncData);

export default router;
