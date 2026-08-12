import { prisma } from '../core/db.js';

// UserTask.dateKey ile aynı formatta olmalı ki
// @@unique([userId, taskId, dateKey]) "günde bir kez" kuralını sağlasın.
// Basitlik için UTC gün anahtarı kullanıyoruz (örn. "2026-08-09").
function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

// Kullanıcının görebileceği aktif görevleri, her biri için
// "bugün tamamlandı mı" bilgisiyle birlikte döner.
export const getTasksForUser = async (userId) => {
  const dateKey = getTodayDateKey();

  const tasks = await prisma.task.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const completedToday = await prisma.userTask.findMany({
    where: { userId, dateKey },
    select: { taskId: true },
  });
  const completedTaskIds = new Set(completedToday.map((ut) => ut.taskId));

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    rewardTea: task.rewardTea,
    actionType: task.actionType,
    completedToday: completedTaskIds.has(task.id),
  }));
};

// Bir görevi tamamlar: aynı gün tekrar tamamlanamaz (dateKey unique kısıtı),
// başarılıysa kullanıcının teaBalance'ını görevin ödülü kadar artırır.
export const completeTask = async (userId, taskId) => {
  const dateKey = getTodayDateKey();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || !task.isActive) {
    throw new Error('TASK_NOT_FOUND');
  }

  // Güvenlik Önlemi: Ardışık görev tamamlama sömürüsünü önlemek için 30 sn cooldown (Rate Limiting)
  const lastTask = await prisma.userTask.findFirst({
    where: { userId },
    orderBy: { completedAt: 'desc' },
  });
  if (lastTask) {
    const timeSinceLastTask = (Date.now() - lastTask.completedAt.getTime()) / 1000;
    if (timeSinceLastTask < 30) {
      throw new Error('Lütfen yeni bir görev tamamlamadan önce biraz bekleyin.');
    }
  }

  const alreadyDone = await prisma.userTask.findUnique({
    where: {
      userId_taskId_dateKey: { userId, taskId, dateKey },
    },
  });
  if (alreadyDone) {
    throw new Error('TASK_ALREADY_COMPLETED');
  }

  // Görev kaydı + bakiye artışı tek transaction'da: biri başarısız olursa
  // diğeri de geri alınır, yarım kalmış (görev var ama çay yok) durum oluşmaz.
  try {
    const [, updatedUser] = await prisma.$transaction([
      prisma.userTask.create({
        data: { userId, taskId, dateKey },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { teaBalance: { increment: task.rewardTea } },
      }),
    ]);

    return {
      message: `"${task.title}" tamamlandı!`,
      reward: task.rewardTea,
      newBalance: updatedUser.teaBalance,
    };
  } catch (error) {
    // Yukarıdaki alreadyDone kontrolüyle transaction arasındaki kısacık
    // aralıkta aynı görev eşzamanlı iki istekle tamamlanmaya çalışılırsa,
    // @@unique([userId, taskId, dateKey]) kısıtı Prisma P2002 hatası fırlatır.
    // Bunu da "zaten tamamlandı" olarak ele alıyoruz.
    if (error.code === 'P2002') {
      throw new Error('TASK_ALREADY_COMPLETED');
    }
    throw error;
  }
};