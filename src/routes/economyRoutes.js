import express from 'express';
import * as economyController from '../controllers/economyController.js';
import { verifyToken } from '../middlewares/authMiddleware.js'; // Veya senin projendeki auth middleware'in dosya yolu neresiyse

const router = express.Router();

// İŞTE BURASI: Araya verifyToken (veya auth middleware) ekliyoruz!
router.post('/daily-tea', verifyToken, economyController.claimDailyTea);

// Flutter'daki EconomyRepository.getBalance() bu route'u çağırıyordu ama
// route hiç tanımlı değildi -> her istek 404 alıyordu -> bakiye hep 0
// görünüyordu (fetchBalance hatayı sessizce yutuyor). Eksik olan buydu.
router.get('/status', verifyToken, economyController.getStatus);

// Kahvehanenin Ağaları kartı için: en çok çay biriktiren kullanıcılar.
router.get('/leaderboard', verifyToken, economyController.getLeaderboard);

export default router;