import { Router } from 'express';
import * as superligController from './superlig.controller.js';

const router = Router();

router.get('/standings', superligController.getStandings);
router.get('/fixtures', superligController.getFixtures);
router.get('/top-scorers', superligController.getTopScorers);
router.get('/transfers', superligController.getTransfers);

// Bu endpoint admin/güvenli olmalı ama şimdilik geliştirmedeyiz
router.post('/sync', superligController.syncData);

export default router;
