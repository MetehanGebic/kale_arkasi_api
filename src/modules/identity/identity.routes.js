import { Router } from 'express';
import identityController from './identity.controller.js';

const router = Router();

router.get('/clubs', identityController.getClubs.bind(identityController));
// POST isteklerini register fonksiyonuna yönlendiriyoruz
router.post('/register', identityController.register.bind(identityController));
router.post('/login', identityController.login.bind(identityController));

export default router;