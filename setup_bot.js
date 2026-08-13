
import { prisma } from './src/core/db.js';
async function main() {
  const club = await prisma.club.findFirst();
  const bot = await prisma.user.upsert({
    where: { email: 'bot@kalearkasi.com' },
    update: {},
    create: {
      username: 'Sistem',
      email: 'bot@kalearkasi.com',
      password: 'no-password',
      role: 'ADMIN',
      status: 'ACTIVE',
      favoriteClubId: club.id,
    }
  });
  console.log('Bot user ready:', bot.id);
}
main().finally(() => prisma.$disconnect());

