import express from 'express';
import * as economyController from '../controllers/economyController.js';
// import { verifyToken } from '../bir/yerlerdeki/authMiddleware.js';

const router = express.Router();

// Eğer token doğrulaman hazırsa araya verifyToken'ı ekleyebilirsin
router.post('/daily-tea', economyController.claimDailyTea);

export default router;