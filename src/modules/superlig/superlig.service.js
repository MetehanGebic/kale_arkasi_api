import { prisma } from '../../core/db.js';
import { scrapeStandings, scrapeFixtures, scrapeTopScorers } from './scrapers/tffScraper.js';
import { scrapeTransfers } from './scrapers/transfermarktScraper.js';
import { scrapeSquads } from './scrapers/transfermarktSquadScraper.js';
import { fetchSofaScoreMatches, fetchSofaScoreMatchDetails } from './scrapers/sofaScoreScraper.js';
import { redis } from '../../core/redis.js';

let liveMatchesPromise = null;

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


export const getLiveMatches = async () => {
  try {
    const cached = await redis.get('live_matches');
    if (cached) {
      console.log('[Redis] Cache HIT for live_matches');
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
  } catch (err) {
    console.error('[Redis] Error reading cache:', err);
  }

  console.log('[Redis] Cache MISS for live_matches. Fetching...');

  // If a fetch is already in progress, await the existing promise
  if (liveMatchesPromise) {
    try {
      const result = await liveMatchesPromise;
      if (result && result.length > 0) return result;
    } catch(e) {}
  }

  // Otherwise, create a new promise and store it
  liveMatchesPromise = fetchSofaScoreMatches().then(async (matches) => {
    try {
      await redis.set('live_matches', JSON.stringify(matches), { ex: 30 });
    } catch (err) {
      console.error('[Redis] Error setting cache:', err);
    }
    liveMatchesPromise = null;
    return matches;
  }).catch(err => {
    liveMatchesPromise = null;
    return []; // fallback to empty if fetch fails and no cache
  });

  return await liveMatchesPromise;
};

export const getMatchComments = async (matchId) => {
  return await prisma.matchComment.findMany({
    where: { matchId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true, favoriteClubId: true } }
    }
  });
};

export const addMatchComment = async (matchId, userId, content) => {
  return await prisma.matchComment.create({
    data: {
      matchId,
      userId,
      content
    },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true, favoriteClubId: true } }
    }
  });
};


export const getMatchDetails = async (matchId) => {
  // Note: We need to import fetchSofaScoreMatchDetails at the top of this file
  return await fetchSofaScoreMatchDetails(matchId);
};

