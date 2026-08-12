import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
  LIGA_PORTUGAL: 238
};

// Super Lig "Big 4" SofaScore Team slugs
const SUPER_LIG_CLUBS = ['galatasaray', 'fenerbahce', 'besiktas', 'trabzonspor', 'basaksehir', 'sivasspor', 'konyaspor', 'adana-demirspor']; 

async function fetchSofaScoreMatches() {
  let browser = null;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_sofascore_'));

  try {
    browser = await puppeteer.launch({
      headless: true,
      userDataDir: tempDir,
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
    await page.goto('https://api.sofascore.com/api/v1/sport/football/events/live', { waitUntil: 'networkidle2' });
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

    // 2. Fetch today's scheduled events (fallback/addition)
    const today = new Date().toISOString().split('T')[0];
    await page.goto(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${today}`, { waitUntil: 'networkidle2' });
    let scheduledText = await page.evaluate(() => document.body.innerText);
    let scheduledEvents = [];
    try {
        const data = JSON.parse(scheduledText);
        if (data && data.events) {
            scheduledEvents = data.events;
            console.log('Parsed scheduled events:', scheduledEvents.length);
        }
    } catch (e) {
        console.warn(`SofaScore Scheduled JSON for ${today} not found or parse error. Relying on live events.`);
    }

    const allEventsMap = new Map();
    [...scheduledEvents, ...liveEvents].forEach(e => {
        allEventsMap.set(e.id, e);
    });
    let allEvents = Array.from(allEventsMap.values());

    const targetIds = Object.values(TARGET_TOURNAMENTS);
    const filteredEvents = allEvents.filter(e => {
        return e.tournament && e.tournament.uniqueTournament && targetIds.includes(e.tournament.uniqueTournament.id);
    });

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
        const isEuropean = [TARGET_TOURNAMENTS.CHAMPIONS_LEAGUE, TARGET_TOURNAMENTS.EUROPA_LEAGUE, TARGET_TOURNAMENTS.CONFERENCE_LEAGUE].includes(tournamentId);

        const isChatEnabled = isSuperLig || (isEuropean && isTurkishTeam);

        let status = 'notstarted';
        if (e.status) {
            if (e.status.type === 'inprogress' || e.status.type === 'live') status = 'live';
            if (e.status.type === 'finished') status = 'finished';
        }

        return {
            id: e.id.toString(),
            tournamentId,
            tournamentName,
            status,
            homeTeam: homeName,
            awayTeam: awayName,
            homeLogo: `https://api.sofascore.app/api/v1/team/${homeId}/image`,
            awayLogo: `https://api.sofascore.app/api/v1/team/${awayId}/image`,
            homeScore: e.homeScore ? e.homeScore.current || 0 : 0,
            awayScore: e.awayScore ? e.awayScore.current || 0 : 0,
            minute: e.time ? e.time.currentPeriodStartTimestamp : null,
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
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch(e) {}
  }
}

export {
  fetchSofaScoreMatches,
  TARGET_TOURNAMENTS
};
