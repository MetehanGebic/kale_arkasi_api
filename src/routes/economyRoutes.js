import express from 'express';
import * as economyController from '../controllers/economyController.js';
import { verifyToken } from '../middlewares/authMiddleware.js'; // Veya senin projendeki auth middleware'in dosya yolu neresiyse

const router = express.Router();

// İŞTE BURASI: Araya verifyToken (veya auth middleware) ekliyoruz!
router.post('/daily-tea', verifyToken, economyController.claimDailyTea);

export default router;