const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Adaptör ayarların varsa kendi prisma dosyanı import edebilirsin

const DAILY_TEA_REWARD = 10; // Günlük verilecek çay miktarı

const claimDailyTea = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    throw new Error('Kullanıcı bulunamadı.');
  }

  const now = new Date();

  // Eğer daha önce çay aldıysa, üzerinden 24 saat geçmiş mi kontrol et
  if (user.lastDailyTeaClaimAt) {
    const diffInHours = Math.abs(now - user.lastDailyTeaClaimAt) / 36e5;
    
    if (diffInHours < 24) {
      const remainingHours = (24 - diffInHours).toFixed(1);
      throw new Error(`Çay ocağı henüz demlenmedi! ${remainingHours} saat sonra tekrar gel.`);
    }
  }

  // Kullanıcının bakiyesine çayı ekle ve son alma zamanını şu an olarak güncelle
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

module.exports = {
  claimDailyTea,
};