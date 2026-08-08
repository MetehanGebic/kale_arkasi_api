const express = require('express');
const router = express.Router();
const economyController = require('../controllers/economyController');
const { verifyToken } = require('../middlewares/authMiddleware'); // Senin auth middleware'in

// Bu rotaya sadece giriş yapmış (token'ı olan) kullanıcılar erişebilir
router.post('/daily-tea', verifyToken, economyController.claimDailyTea);

module.exports = router;