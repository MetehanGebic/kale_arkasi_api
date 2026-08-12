
import { prisma } from './src/core/db.js';
async function run() {
  await prisma.user.updateMany({
    data: { role: 'ADMIN' },
  });
  console.log('Tum kullanicilar ADMIN yapildi.');
  process.exit(0);
}
run();

