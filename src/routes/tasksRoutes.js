import express from 'express';
import * as tasksController from '../controllers/tasksController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Görev listesi (aktif görevler + bugün tamamlanma durumu)
router.get('/', verifyToken, tasksController.getTasks);

// Bir görevi tamamla ve ödülü kazan
router.post('/:taskId/complete', verifyToken, tasksController.completeTask);

export default router;