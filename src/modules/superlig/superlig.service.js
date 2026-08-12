import { prisma } from '../../core/db.js';
import { scrapeStandings, scrapeFixtures, scrapeTopScorers } from './scrapers/tffScraper.js';
import { scrapeTransfers } from './scrapers/transfermarktScraper.js';
import { scrapeSquads } from './scrapers/transfermarktSquadScraper.js';

export const getStandings = async () => {
  return await prisma.standingsEntry.findMany({
    orderBy: { rank: 'asc' },
    include: {
      club: {
        select: { 
          id: true, 
          name: true, 
          logoUrl: true,
          slug: true,
          primaryColor: true,
          coachName: true,
          totalMarketValue: true
        }
      }
    }
  });
};

export const getFixtures = async (week) => {
  const whereClause = week ? { week: parseInt(week, 10) } : {};
  return await prisma.fixture.findMany({
    where: whereClause,
    orderBy: [
      { week: 'asc' },
      { matchDate: 'asc' }
    ],
    include: {
      homeClub: { select: { id: true, name: true, slug: true, logoUrl: true } },
      awayClub: { select: { id: true, name: true, slug: true, logoUrl: true } }
    }
  });
};

export const getTopScorers = async () => {
  return await prisma.topScorer.findMany({
    orderBy: { rank: 'asc' },
    take: 10
  });
};

export const getTransfers = async (clubId) => {
  const whereClause = clubId ? {
    OR: [
      { fromClubId: clubId },
      { toClubId: clubId }
    ]
  } : {};

  return await prisma.transfer.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      fromClub: { select: { id: true, name: true, slug: true, logoUrl: true } },
      toClub: { select: { id: true, name: true, slug: true, logoUrl: true } }
    }
  });
};

export const runScrapers = async () => {
  // Manuel tetikleme (Senkron veya Asenkron, şimdilik asenkron başlatıp OK dönüyoruz ki istek time out olmasın)
  Promise.all([
    scrapeStandings(),
    scrapeFixtures(),
    scrapeTopScorers(),
    scrapeTransfers(),
    scrapeSquads()
  ]).then(() => console.log('Manuel Sync Tamamlandı.')).catch(e => console.error(e));
  
  return { message: "Senkronizasyon arka planda başlatıldı." };
};
