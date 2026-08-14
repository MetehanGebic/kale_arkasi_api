import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '../../../core/db.js';

// Target tournaments according to the business rules
const TARGET_TOURNAMENTS = {
  SUPER_LIG: 52,
  CHAMPIONS_LEAGUE: 7,
  EUROPA_LEAGUE: 679,
  CONFERENCE_LEAGUE: 1703,
  PREMIER_LEAGUE: 17,
  LA_LIGA: 8,
  SERIE_A: 23,
  LIGUE_1: 34,
  LIGA_PORTUGAL: 238,
  UEFA_SUPER_CUP: 465
};

// fetchSofaScoreMatchDetails() ağır bir işlem: her çağrıda sıfırdan bir
// headless Chromium başlatıp 4 ayrı sayfa geziyor. Bu fonksiyon hem
// cron.js'teki dakikalık canlı-maç döngüsünden (her canlı maç için ayrı
// çağrı) hem de /live-matches/:id/details endpoint'inden çağrılıyor.
// Kısa ömürlü bir önbellek olmadan, birden fazla canlı maç olduğunda
// sunucu her dakika birden fazla tam tarayıcı örneği açıp kapatıyor.
const matchDetailsCache = new Map(); // matchId -> { data, timestamp }
const matchDetailsPromises = new Map(); // matchId -> in-flight promise
const MATCH_DETAILS_CACHE_TTL = 20000; // 20 sn

const SUPER_LIG_CLUBS = ['galatasaray', 'fenerbahce', 'besiktas', 'trabzonspor', 'basaksehir-fk', 'alanyaspor', 'konyaspor', 'caykur-rizespor','kasimpasa','kocaelispor','yilport-samsunspor','goztepe','genclerbirligi','gaziantep-fk','eyupspor','corum-fk','erzurumspor-fk','amed-sportif-faaliyetler']; 

const SOFASCORE_TO_DB_SLUG = {
  'galatasaray': 'galatasaray-istanbul',
  'fenerbahce': 'fenerbahce-istanbul',
  'besiktas': 'besiktas-istanbul',
  'trabzonspor': 'trabzonspor',
  'basaksehir-fk': 'istanbul-basaksehir-fk',
  'alanyaspor': 'alanyaspor',
  'konyaspor': 'konyaspor',
  'caykur-rizespor': 'caykur-rizespor',
  'kasimpasa': 'kasimpasa',
  'kocaelispor': 'kocaelispor',
  'samsunspor': 'samsunspor',
  'goztepe': 'goztepe',
  'genclerbirligi': 'genclerbirligi-ankara',
  'gaziantep-fk': 'gaziantep-fk',
  'eyupspor': 'eyupspor',
  'corum-fk': 'corum-fk',
  'erzurumspor-fk': 'buyuksehir-belediye-erzurumspor',
  'amed-sportif-faaliyetler': 'amed-sk'
};

async function fetchSofaScoreMatches() {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
    });

    // 1. Fetch live events
    await page.goto('https://api.sofascore.com/api/v1/sport/football/events/live', { waitUntil: 'domcontentloaded' });
    let liveText = await page.evaluate(() => document.body.innerText);
    let liveEvents = [];
    try {
        const data = JSON.parse(liveText);
        if (data && data.events) {
            liveEvents = data.events;
            console.log('Parsed live events:', liveEvents.length);
        }
    } catch (e) {
        console.error('SofaScore Live JSON parse error:', e);
    }

    // 2. Fetch today's scheduled events per tournament (SofaScore removed global endpoint)
    const today = new Date().toISOString().split('T')[0];
    let scheduledEvents = [];
    
    for (const [key, tournamentId] of Object.entries(TARGET_TOURNAMENTS)) {
        try {
            await page.goto(`https://api.sofascore.com/api/v1/unique-tournament/${tournamentId}/scheduled-events/${today}`, { waitUntil: 'domcontentloaded' });
            let scheduledText = await page.evaluate(() => document.body.innerText);
            const data = JSON.parse(scheduledText);
            if (data && data.events) {
                scheduledEvents.push(...data.events);
                console.log(`Parsed scheduled events for ${key}:`, data.events.length);
            }
        } catch (e) {
            console.warn(`SofaScore Scheduled JSON for ${key} on ${today} not found or parse error.`);
        }
    }

    const trackedMatchesData = await prisma.trackedMatch.findMany();
    const trackedMatchIds = trackedMatchesData.map(m => m.sofaScoreId);
    const trackedMatchMap = new Map();
    trackedMatchesData.forEach(m => {
      trackedMatchMap.set(m.sofaScoreId, m);
    });

    const allEventsMap = new Map();
    [...scheduledEvents, ...liveEvents].forEach(e => {
        allEventsMap.set(e.id, e);
    });

    for (const tid of trackedMatchIds) {
        if (!allEventsMap.has(tid)) {
            try {
                await page.goto(`https://api.sofascore.com/api/v1/event/${tid}`, { waitUntil: 'domcontentloaded' });
                let eventText = await page.evaluate(() => document.body.innerText);
                const data = JSON.parse(eventText);
                if (data && data.event) {
                    allEventsMap.set(tid, data.event);
                }
            } catch (e) {
                console.warn(`Failed to fetch specific tracked event ${tid}`);
            }
        }
    }

    let allEvents = Array.from(allEventsMap.values());

    const targetIds = Object.values(TARGET_TOURNAMENTS);
    const filteredEvents = allEvents.filter(e => {
        const isTarget = e.tournament && e.tournament.uniqueTournament && targetIds.includes(e.tournament.uniqueTournament.id);
        const isTracked = trackedMatchIds.includes(e.id);
        return isTarget || isTracked;
    });

    // Get all clubs from our DB to match logos by slug
    const dbClubs = await prisma.club.findMany({ select: { slug: true, logoUrl: true, primaryColor: true } });
    const clubLogoMap = new Map();
    const clubColorMap = new Map();
    for (const c of dbClubs) {
      if (c.slug) {
        if (c.logoUrl) clubLogoMap.set(c.slug, c.logoUrl);
        if (c.primaryColor) clubColorMap.set(c.slug, c.primaryColor);
      }
    }

    const matches = filteredEvents.map(e => {
        const tournamentId = e.tournament.uniqueTournament.id;
        const tournamentName = e.tournament.uniqueTournament.name;
        
        const homeSlug = e.homeTeam.slug || '';
        const awaySlug = e.awayTeam.slug || '';
        const homeName = e.homeTeam.name || '';
        const awayName = e.awayTeam.name || '';
        const homeId = e.homeTeam.id;
        const awayId = e.awayTeam.id;

        const isSuperLig = tournamentId === TARGET_TOURNAMENTS.SUPER_LIG;
        const isTurkishTeam = SUPER_LIG_CLUBS.some(c => homeSlug.includes(c) || awaySlug.includes(c));
        const isEuropean = [
          TARGET_TOURNAMENTS.CHAMPIONS_LEAGUE, 
          TARGET_TOURNAMENTS.EUROPA_LEAGUE, 
          TARGET_TOURNAMENTS.CONFERENCE_LEAGUE,
          TARGET_TOURNAMENTS.UEFA_SUPER_CUP
        ].includes(tournamentId);

        const nowUnix = Math.floor(Date.now() / 1000);
        const startUnix = e.startTimestamp || nowUnix; // Default to now if undefined
        const isTimeValid = (startUnix - nowUnix) <= 900; // 900 seconds = 15 minutes
        
        const isChatEnabled = (isSuperLig || (isEuropean && isTurkishTeam)) && isTimeValid;

        let status = 'notstarted';
        if (e.status) {
            if (e.status.type === 'inprogress' || e.status.type === 'live') status = 'live';
            if (e.status.type === 'finished') status = 'finished';
        }

        let minute = null;
        if (e.status && e.status.type === 'finished') {
            minute = 90;
        } else if (e.time) {
            if (e.time.currentPeriodStartTimestamp) {
                minute = Math.floor((Date.now() / 1000 - e.time.currentPeriodStartTimestamp) / 60);
                if (e.status && e.status.description === '2nd half') minute += 45;
                if (e.status && e.status.description === 'Halftime') minute = 45;
            } else if (typeof e.time.played === 'number') {
                minute = e.time.played;
            }
        }

        const dbHomeSlug = SOFASCORE_TO_DB_SLUG[homeSlug] || homeSlug;
        const dbAwaySlug = SOFASCORE_TO_DB_SLUG[awaySlug] || awaySlug;

        let finalHomeLogo = clubLogoMap.get(dbHomeSlug);
        let finalAwayLogo = clubLogoMap.get(dbAwaySlug);
        const homePrimaryColor = clubColorMap.get(dbHomeSlug);
        const awayPrimaryColor = clubColorMap.get(dbAwaySlug);

        // Check if there are custom logos for tracked matches
        if (trackedMatchMap.has(e.id)) {
          const tm = trackedMatchMap.get(e.id);
          if (tm.homeLogoUrl) finalHomeLogo = tm.homeLogoUrl;
          if (tm.awayLogoUrl) finalAwayLogo = tm.awayLogoUrl;
        }

        // Fallback to sofascore generic URL (which might 403)
        finalHomeLogo = finalHomeLogo || `https://api.sofascore.app/api/v1/team/${homeId}/image`;
        finalAwayLogo = finalAwayLogo || `https://api.sofascore.app/api/v1/team/${awayId}/image`;

        return {
            id: e.id.toString(),
            tournamentId,
            tournamentName,
            status,
            homeTeam: homeName,
            awayTeam: awayName,
            homeLogo: finalHomeLogo,
            awayLogo: finalAwayLogo,
            homeclubPrimaryColorHex: homePrimaryColor,
            awayclubPrimaryColorHex: awayPrimaryColor,
            homeScore: e.homeScore ? e.homeScore.current || 0 : 0,
            awayScore: e.awayScore ? e.awayScore.current || 0 : 0,
            minute: minute,
            isChatEnabled,
            startTimestamp: e.startTimestamp
        };
    });

    return matches;
  } catch (error) {
    console.error('Error fetching SofaScore matches:', error);
    return [];
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}

export {
  fetchSofaScoreMatches,
  TARGET_TOURNAMENTS,
  fetchSofaScoreMatchDetails
};

async function fetchSofaScoreMatchDetailsUncached(matchId) {
    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
      });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Lineups
    let lineups = null;
    try {
      await page.goto(`https://api.sofascore.com/api/v1/event/${matchId}/lineups`, { waitUntil: 'domcontentloaded' });
      const text = await page.evaluate(() => document.body.innerText);
      lineups = JSON.parse(text);
    } catch (e) {}

    // 2. Statistics
    let statistics = null;
    try {
      await page.goto(`https://api.sofascore.com/api/v1/event/${matchId}/statistics`, { waitUntil: 'domcontentloaded' });
      const text = await page.evaluate(() => document.body.innerText);
      statistics = JSON.parse(text);
    } catch (e) {}

    // 3. Incidents (Optional for goals/cards summary)
    let incidents = null;
    try {
      await page.goto(`https://api.sofascore.com/api/v1/event/${matchId}/incidents`, { waitUntil: 'domcontentloaded' });
      const text = await page.evaluate(() => document.body.innerText);
      incidents = JSON.parse(text);
    } catch (e) {}

    // 4. Event details (for live minute & status)
    let event = null;
    try {
      await page.goto(`https://api.sofascore.com/api/v1/event/${matchId}`, { waitUntil: 'domcontentloaded' });
      const text = await page.evaluate(() => document.body.innerText);
      const parsed = JSON.parse(text);
      if (parsed && parsed.event) {
        event = parsed.event;
      }
    } catch (e) {}

    return { lineups, statistics, incidents, event };
  } catch (error) {
    console.error('Error fetching match details:', error);
    return null;
    } finally {
      if (browser) await browser.close().catch(console.error);
    }
  }

async function fetchSofaScoreMatchDetails(matchId) {
  const now = Date.now();
  const cached = matchDetailsCache.get(matchId);

  // Taze önbellek varsa hiç tarayıcı açmadan onu döndür.
  if (cached && (now - cached.timestamp < MATCH_DETAILS_CACHE_TTL)) {
    return cached.data;
  }

  // Aynı maç için zaten devam eden bir istek varsa (ör. cron ile aynı anda
  // bir kullanıcı maç detayına baktıysa) ikinci bir tarayıcı açmak yerine
  // devam eden isteği bekleyip sonucunu paylaşıyoruz.
  if (matchDetailsPromises.has(matchId)) {
    return matchDetailsPromises.get(matchId);
  }

  const promise = fetchSofaScoreMatchDetailsUncached(matchId)
    .then((data) => {
      if (data) {
        matchDetailsCache.set(matchId, { data, timestamp: Date.now() });
      }
      matchDetailsPromises.delete(matchId);
      return data;
    })
    .catch((err) => {
      matchDetailsPromises.delete(matchId);
      // Taze veri alınamadıysa, elimizdeki bayat veri hiç yoktan iyidir.
      return cached ? cached.data : null;
    });

  matchDetailsPromises.set(matchId, promise);
  return promise;
}