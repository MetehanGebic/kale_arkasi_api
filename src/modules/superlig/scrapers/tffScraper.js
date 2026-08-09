import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import { prisma } from '../../../core/db.js';

const TFF_BASE_URL = 'https://www.tff.org/default.aspx';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

export async function scrapeStandings() {
  console.log('[TFF Scraper] Puan durumu çekiliyor...');
  try {
    const response = await axios.get(`${TFF_BASE_URL}?pageID=198`, { headers, httpsAgent });
    const $ = cheerio.load(response.data);
    const standings = [];

    // TFF'nin garip id'lerinden ve satır sonu boşluklarından kaçınmak için * kullanıyoruz
    const rows = $('span[id*="_lblOyun"]').closest('tr');

    rows.each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 9) {
        const text0 = $(cols[0]).text().trim();
        const rank = parseInt(text0, 10);
        const clubLink = $(cols[0]).find('a').attr('href');
        if (!clubLink) return;

        const tffKulupIdMatch = clubLink.match(/kulupID=(\d+)/i);
        if (!tffKulupIdMatch) return;

        const tffKulupId = parseInt(tffKulupIdMatch[1], 10);

        const played = parseInt($(cols[1]).text().trim(), 10) || 0;
        const won = parseInt($(cols[2]).text().trim(), 10) || 0;
        const drawn = parseInt($(cols[3]).text().trim(), 10) || 0;
        const lost = parseInt($(cols[4]).text().trim(), 10) || 0;
        const goalsFor = parseInt($(cols[5]).text().trim(), 10) || 0;
        const goalsAgainst = parseInt($(cols[6]).text().trim(), 10) || 0;
        const goalDiff = parseInt($(cols[7]).text().trim(), 10) || 0;
        const points = parseInt($(cols[8]).text().trim(), 10) || 0;

        standings.push({ rank, tffKulupId, played, won, drawn, lost, goalsFor, goalsAgainst, goalDiff, points });
      }
    });

    console.log(`[TFF Scraper] ${standings.length} takım bulundu, veritabanına işleniyor...`);

    for (const entry of standings) {
      const club = await prisma.club.findUnique({ where: { tffKulupId: entry.tffKulupId } });
      if (club) {
        await prisma.standingsEntry.upsert({
          where: { clubId: club.id },
          update: {
            rank: entry.rank, played: entry.played, won: entry.won, drawn: entry.drawn, lost: entry.lost,
            goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst, goalDiff: entry.goalDiff, points: entry.points
          },
          create: {
            clubId: club.id, rank: entry.rank, played: entry.played, won: entry.won, drawn: entry.drawn, lost: entry.lost,
            goalsFor: entry.goalsFor, goalsAgainst: entry.goalsAgainst, goalDiff: entry.goalDiff, points: entry.points
          }
        });
      }
    }
  } catch (error) {
    console.error('[TFF Scraper] Puan durumu hatası:', error.message);
  }
}

export async function scrapeFixtures() {
  console.log('[TFF Scraper] Fikstür çekiliyor...');
  try {
    for (let week = 1; week <= 34; week++) {
      const url = `${TFF_BASE_URL}?pageID=198&hafta=${week}`;
      const response = await axios.get(url, { headers, httpsAgent });
      const $ = cheerio.load(response.data);

      const fixtures = [];
      const rows = $('tr.haftaninMaclariTr');
      
      rows.each((i, row) => {
        const dateStr = $(row).find('span[id*="_lblTarih"]').text().trim();
        const timeStr = $(row).find('span[id*="_lblSaat"]').text().trim();

        let matchDate = new Date();
        if (dateStr && timeStr) {
          const [d, m, y] = dateStr.split('.');
          const [h, min] = timeStr.split(':');
          if (y && m && d && h && min) {
            matchDate = new Date(`${y}-${m}-${d}T${h}:${min}:00+03:00`);
          }
        }

        const scoreLink = $(row).find('.haftaninMaclariSkor a').attr('href');
        let tffMacId = 0;
        if (scoreLink) {
          const matchIdMatch = scoreLink.match(/macId=(\d+)/i);
          if (matchIdMatch) tffMacId = parseInt(matchIdMatch[1], 10);
        }
        // Eğer maç henüz oynanmadıysa skor linki olmayabilir veya macId 0 kalabilir
        // TFF genelde her maçın bir detay sayfasına link verir, oradan macId alabiliriz.
        if (tffMacId === 0) {
           const detayLink = $(row).find('.haftaninMaclariDetay a').attr('href');
           if (detayLink) {
             const matchIdMatch = detayLink.match(/macId=(\d+)/i);
             if (matchIdMatch) tffMacId = parseInt(matchIdMatch[1], 10);
           }
        }
        
        if (tffMacId === 0) return; // Mac ID bulunamadıysa geç

        const homeLink = $(row).find('.haftaninMaclariEv a').attr('href');
        const awayLink = $(row).find('.haftaninMaclariDeplasman a').attr('href');
        if (!homeLink || !awayLink) return;

        const homeIdMatch = homeLink.match(/kulupID=(\d+)/i);
        const awayIdMatch = awayLink.match(/kulupID=(\d+)/i);
        if (!homeIdMatch || !awayIdMatch) return;

        const homeTffId = parseInt(homeIdMatch[1], 10);
        const awayTffId = parseInt(awayIdMatch[1], 10);

        // Skor <span>'lerinin text'i "- " veya "0 - 0" olabilir
        let homeScore = null, awayScore = null;
        const scoreSpans = $(row).find('.haftaninMaclariSkor span').map((i, el) => $(el).text().trim()).get();
        if (scoreSpans.length >= 2 && scoreSpans[0] !== '' && scoreSpans[1] !== '') {
           homeScore = parseInt(scoreSpans[0], 10);
           awayScore = parseInt(scoreSpans[1], 10);
           if (isNaN(homeScore)) homeScore = null;
           if (isNaN(awayScore)) awayScore = null;
        }

        fixtures.push({ tffMacId, week, matchDate, homeTffId, awayTffId, homeScore, awayScore });
      });

      for (const fix of fixtures) {
        const homeClub = await prisma.club.findUnique({ where: { tffKulupId: fix.homeTffId } });
        const awayClub = await prisma.club.findUnique({ where: { tffKulupId: fix.awayTffId } });

        if (homeClub && awayClub) {
          await prisma.fixture.upsert({
            where: { tffMacId: fix.tffMacId },
            update: {
              matchDate: fix.matchDate,
              homeScore: fix.homeScore,
              awayScore: fix.awayScore,
            },
            create: {
              tffMacId: fix.tffMacId,
              week: fix.week,
              matchDate: fix.matchDate,
              homeClubId: homeClub.id,
              awayClubId: awayClub.id,
              homeScore: fix.homeScore,
              awayScore: fix.awayScore,
            }
          });
        }
      }
    }
    console.log('[TFF Scraper] Fikstür tamamlandı.');
  } catch (error) {
    console.error('[TFF Scraper] Fikstür hatası:', error.message);
  }
}

export async function scrapeTopScorers() {
  console.log('[TFF Scraper] Gol Krallığı çekiliyor...');
  try {
    const response = await axios.get(`${TFF_BASE_URL}?pageID=821`, { headers, httpsAgent });
    const $ = cheerio.load(response.data);

    const rows = $('span[id*="_lblAdi"]').closest('tr');
    const topScorers = [];

    rows.each((i, row) => {
      if (i >= 10) return; // Sadece ilk 10
      const rank = i + 1;
      
      const pLink = $(row).find('span[id*="_lblAdi"]').find('a').attr('href');
      if (!pLink) return;
      const tffKisiIdMatch = pLink.match(/kisiID=(\d+)/i);
      const tffKisiId = tffKisiIdMatch ? parseInt(tffKisiIdMatch[1], 10) : 0;

      const playerName = $(row).find('span[id*="_lblAdi"]').text().trim();
      const clubName = $(row).find('span[id*="_lblTakim"]').text().trim();
      const goals = parseInt($(row).find('span[id*="_lblGol"]').text().trim(), 10) || 0;

      if (tffKisiId && playerName) {
        topScorers.push({ rank, tffKisiId, playerName, clubName, goals });
      }
    });

    for (const scorer of topScorers) {
      await prisma.topScorer.upsert({
        where: { tffKisiId: scorer.tffKisiId },
        update: { rank: scorer.rank, clubName: scorer.clubName, goals: scorer.goals },
        create: { rank: scorer.rank, tffKisiId: scorer.tffKisiId, playerName: scorer.playerName, clubName: scorer.clubName, goals: scorer.goals }
      });
    }
    console.log('[TFF Scraper] Gol krallığı tamamlandı.');
  } catch (error) {
    console.error('[TFF Scraper] Gol Krallığı hatası:', error.message);
  }
}
