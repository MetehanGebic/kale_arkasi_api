import { Router } from 'express';
import * as superligController from './superlig.controller.js';
import { verifyToken } from '../../middlewares/authMiddleware.js';
import { requireAdmin } from '../../middlewares/requireAdmin.js';

const router = Router();

router.get('/standings', superligController.getStandings);
router.get('/fixtures', superligController.getFixtures);
router.get('/top-scorers', superligController.getTopScorers);
router.get('/transfers', superligController.getTransfers);

// Live Matches
router.get('/live-matches', superligController.getLiveMatches);

// Match Comments (Forum)
router.get('/live-matches/:matchId/comments', superligController.getMatchComments);
router.post('/live-matches/:matchId/comments', verifyToken, superligController.addMatchComment);

// Admin-only route for sync
router.post('/sync', verifyToken, requireAdmin, superligController.syncData);

export default router;
