import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const fixes = await prisma.fixture.findMany({ include: { homeClub: true, awayClub: true } });
  const rize = fixes.filter(f => (f.homeClub && f.homeClub.slug === 'caykur-rizespor') || (f.awayClub && f.awayClub.slug === 'caykur-rizespor'));
  console.log('Rizespor matches:', rize.length);
  const future = rize.filter(f => f.matchDate > new Date());
  console.log('Future matches:', future.length);
  if (future.length > 0) {
    console.log('Next match:', future[0].matchDate);
  }
}

check().finally(() => prisma.$disconnect());
