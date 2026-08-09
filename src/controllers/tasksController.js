import * as tasksService from '../services/tasksService.js';

export const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const tasks = await tasksService.getTasksForUser(userId);
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const completeTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;

    const result = await tasksService.completeTask(userId, taskId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};