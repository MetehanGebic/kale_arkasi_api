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

const SUPER_LIG_CLUBS = ['galatasaray', 'fenerbahce', 'besiktas', 'trabzonspor', 'basaksehir-fk', 'alanyaspor', 'konyaspor', 'caykur-rizespor','kasimpasa','kocaelispor','yilport-samsunspor','goztepe','genclerbirligi','gaziantep-fk','eyupspor','corum-fk','erzurumspor-fk','amed-sportif-faaliyetler']; 

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

    const trackedMatchesData = await prisma.trackedMatch.findMany();
    const trackedMatchIds = trackedMatchesData.map(m => m.sofaScoreId);

    const allEventsMap = new Map();
    [...scheduledEvents, ...liveEvents].forEach(e => {
        allEventsMap.set(e.id, e);
    });

    for (const tid of trackedMatchIds) {
        if (!allEventsMap.has(tid)) {
            try {
                await page.goto(`https://api.sofascore.com/api/v1/event/${tid}`, { waitUntil: 'networkidle2' });
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

        const isChatEnabled = isSuperLig || (isEuropean && isTurkishTeam);

        let status = 'notstarted';
        if (e.status) {
            if (e.status.type === 'inprogress' || e.status.type === 'live') status = 'live';
            if (e.status.type === 'finished') status = 'finished';
        }

        let minute = null;
        if (e.time) {
            if (typeof e.time.initial === 'number') {
                minute = e.time.initial;
            } else if (e.time.currentPeriodStartTimestamp) {
                minute = Math.floor((Date.now() / 1000 - e.time.currentPeriodStartTimestamp) / 60);
                if (e.status && e.status.description === '2nd half') minute += 45;
            }
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
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch(e) {}
  }
}

export {
  fetchSofaScoreMatches,
  TARGET_TOURNAMENTS,
  fetchSofaScoreMatchDetails
};

async function fetchSofaScoreMatchDetails(matchId) {
  let browser = null;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'puppeteer_sofascore_det_'));
  try {
    browser = await puppeteer.launch({
      headless: true,
      userDataDir: tempDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 1. Lineups
    let lineups = null;
    try {
      await page.goto(`https://api.sofascore.com/api/v1/event/${matchId}/lineups`, { waitUntil: 'networkidle2' });
      const text = await page.evaluate(() => document.body.innerText);
      lineups = JSON.parse(text);
    } catch (e) {}

    // 2. Statistics
    let statistics = null;
    try {
      await page.goto(`https://api.sofascore.com/api/v1/event/${matchId}/statistics`, { waitUntil: 'networkidle2' });
      const text = await page.evaluate(() => document.body.innerText);
      statistics = JSON.parse(text);
    } catch (e) {}

    // 3. Incidents (Optional for goals/cards summary)
    let incidents = null;
    try {
      await page.goto(`https://api.sofascore.com/api/v1/event/${matchId}/incidents`, { waitUntil: 'networkidle2' });
      const text = await page.evaluate(() => document.body.innerText);
      incidents = JSON.parse(text);
    } catch (e) {}

    return { lineups, statistics, incidents };
  } catch (error) {
    console.error('Error fetching match details:', error);
    return null;
  } finally {
    if (browser) await browser.close().catch(console.error);
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  }
}

