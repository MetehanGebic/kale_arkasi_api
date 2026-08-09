import * as tasksService from '../services/tasksService.js';
import { getIO } from '../core/socket.js';

export const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const tasks = await tasksService.getTasksForUser(userId);
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error('[TasksController getTasks Error]:', error);
    res.status(500).json({ success: false, message: 'Görevler getirilirken bir hata oluştu.' });
  }
};

export const completeTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;

    const result = await tasksService.completeTask(userId, taskId);

    try {
      getIO().emit('leaderboard_updated');
    } catch (socketError) {
      console.error('[TasksController] Liderlik tablosu bildirimi gönderilemedi:', socketError);
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'TASK_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Görev bulunamadı.' });
    }
    if (error.message === 'TASK_ALREADY_COMPLETED') {
      return res.status(409).json({ success: false, message: 'Bu görevi bugün zaten tamamladın.' });
    }

    console.error('[TasksController completeTask Error]:', error);
    res.status(500).json({ success: false, message: 'Sunucu tarafında bir hata oluştu.' });
  }
};