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

// En çok çay biriktiren kullanıcıları döner (varsayılan ilk 10).
// Herhangi bir yan etkisi yoktur, sadece okur.
//
// UYGULAMANIN BAŞLARINDA 10-20 ÇAYLI KULLANICILARIN LİSTEDE GÖRÜNMESİNİ
// İSTEMİYORSAN: aşağıdaki DEFAULT_MIN_LEADERBOARD_BALANCE değerini
// değiştirebilir, ya da kod dokunmadan .env dosyana
//   LEADERBOARD_MIN_BALANCE=100
// satırını ekleyip sunucuyu yeniden başlatabilirsin (.env varsa kod
// değişikliği gerekmez).
const DEFAULT_MIN_LEADERBOARD_BALANCE = 50;

function getMinLeaderboardBalance() {
  const raw = process.env.LEADERBOARD_MIN_BALANCE;
  const parsed = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_MIN_LEADERBOARD_BALANCE;
}

export const getLeaderboard = async (limit = 10) => {
  const minBalance = getMinLeaderboardBalance();

  const topUsers = await prisma.user.findMany({
    where: { teaBalance: { gte: minBalance } },
    orderBy: { teaBalance: 'desc' },
    take: limit,
    select: {
      id: true,
      username: true,
      teaBalance: true,
      favoriteClub: {
        select: {
          name: true,
          slug: true,
          primaryColor: true,
          secondaryColor: true,
          logoUrl: true,
        },
      },
    },
  });

  return topUsers.map((user, index) => ({
    rank: index + 1,
    id: user.id,
    username: user.username,
    teaBalance: user.teaBalance,
    club: user.favoriteClub,
  }));
};