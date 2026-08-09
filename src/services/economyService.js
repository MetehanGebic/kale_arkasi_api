import { prisma } from '../core/db.js';

const DAILY_TEA_REWARD = 10;

export const claimDailyTea = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const now = new Date();

  if (user.lastDailyTeaClaimAt) {
    const diffInHours = Math.abs(now - user.lastDailyTeaClaimAt) / 36e5;
    if (diffInHours < 24) {
      const remainingHours = (24 - diffInHours).toFixed(1);
      const error = new Error(`Çay ocağı henüz demlenmedi! ${remainingHours} saat sonra tekrar gel.`);
      error.code = 'TEA_NOT_READY';
      throw error;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      teaBalance: { increment: DAILY_TEA_REWARD },
      lastDailyTeaClaimAt: now,
    },
  });

  return {
    message: 'Afiyet olsun! Günlük çayın eklendi.',
    reward: DAILY_TEA_REWARD,
    newBalance: updatedUser.teaBalance,
  };
};

// Flutter tarafındaki HomeScreen açılışında (fetchBalance) çağrılıyor.
// Bakiyeyi DEĞİŞTİRMEZ, sadece mevcut değeri okur.
export const getStatus = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teaBalance: true },
  });

  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return { teaBalance: user.teaBalance };
};