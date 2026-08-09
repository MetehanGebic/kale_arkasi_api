import express from 'express';
import * as economyController from '../controllers/economyController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/daily-tea', verifyToken, economyController.claimDailyTea);
router.get('/status', verifyToken, economyController.getStatus);
router.get('/leaderboard', verifyToken, economyController.getLeaderboard);

export default router;