import { prisma } from '../core/db.js';

const DAILY_TEA_REWARD = 10;

export const claimDailyTea = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    const error = new Error('KullanÄ±cÄ± bulunamadÄ±.');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const now = new Date();

  if (user.lastDailyTeaClaimAt) {
    const diffInHours = Math.abs(now - user.lastDailyTeaClaimAt) / 36e5;
    if (diffInHours < 24) {
      const remainingHours = (24 - diffInHours).toFixed(1);
      const error = new Error(`Ã‡ay ocaÄŸÄ± henÃ¼z demlenmedi! ${remainingHours} saat sonra tekrar gel.`);
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
    message: 'Afiyet olsun! GÃ¼nlÃ¼k Ã§ayÄ±n eklendi.',
    reward: DAILY_TEA_REWARD,
    newBalance: updatedUser.teaBalance,
    lastDailyTeaClaimAt: updatedUser.lastDailyTeaClaimAt,
  };
};

// Flutter tarafÄ±ndaki HomeScreen aÃ§Ä±lÄ±ÅŸÄ±nda (fetchBalance) Ã§aÄŸrÄ±lÄ±yor.
// Bakiyeyi DEÄÄ°ÅTÄ°RMEZ, sadece mevcut deÄŸeri okur.
export const getStatus = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teaBalance: true, lastDailyTeaClaimAt: true },
  });

  if (!user) {
    const error = new Error('KullanÄ±cÄ± bulunamadÄ±.');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return { teaBalance: user.teaBalance, lastDailyTeaClaimAt: user.lastDailyTeaClaimAt };
};

// En Ã§ok Ã§ay biriktiren kullanÄ±cÄ±larÄ± dÃ¶ner (varsayÄ±lan ilk 10).
// Herhangi bir yan etkisi yoktur, sadece okur.
//
// UYGULAMANIN BAÅLARINDA 10-20 Ã‡AYLI KULLANICILARIN LÄ°STEDE GÃ–RÃœNMESÄ°NÄ°
// Ä°STEMÄ°YORSAN: aÅŸaÄŸÄ±daki DEFAULT_MIN_LEADERBOARD_BALANCE deÄŸerini
// deÄŸiÅŸtirebilir, ya da kod dokunmadan .env dosyana
//   LEADERBOARD_MIN_BALANCE=100
// satÄ±rÄ±nÄ± ekleyip sunucuyu yeniden baÅŸlatabilirsin (.env varsa kod
// deÄŸiÅŸikliÄŸi gerekmez).
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
export const deductTea = async (userId, amount) => {
  const result = await prisma.user.updateMany({
    where: { 
      id: userId,
      teaBalance: { gte: amount }
    },
    data: { teaBalance: { decrement: amount } },
  });
  
  if (result.count === 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const error = new Error('Kullanıcı bulunamadı.');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    const error = new Error('Yetersiz bakiye.');
    error.code = 'INSUFFICIENT_FUNDS';
    throw error;
  }
};

