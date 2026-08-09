import { Router } from 'express';
import identityController from './identity.controller.js';
import asyncHandler from '../../core/utils/asyncHandler.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';

const router = Router();

router.get('/clubs', asyncHandler(identityController.getClubs.bind(identityController)));

// POST isteklerini register ve login fonksiyonuna yönlendiriyoruz. Burada authLimiter uygulandı.
router.post('/register', authLimiter, asyncHandler(identityController.register.bind(identityController)));
router.post('/login', authLimiter, asyncHandler(identityController.login.bind(identityController)));

// Şifre sıfırlama işlemleri (Bunlar da brute force saldırılarına karşı authLimiter kullanabilir)
router.post('/forgot-password', authLimiter, asyncHandler(identityController.forgotPassword.bind(identityController)));
router.post('/reset-password/:token', authLimiter, asyncHandler(identityController.resetPassword.bind(identityController)));

export default router;