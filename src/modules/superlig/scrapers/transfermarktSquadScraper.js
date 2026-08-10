import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../../../core/db.js';

const TM_BASE_URL = 'https://www.transfermarkt.com.tr';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeSquads() {
  console.log('[TM Squad Scraper] Takım kadroları çekiliyor...');
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // 1. Get all active clubs from our DB
    const clubs = await prisma.club.findMany({ where: { isActive: true } });
    if (clubs.length === 0) {
      console.log('[TM Squad Scraper] Veritabanında aktif kulüp bulunamadı.');
      return;
    }

    console.log(`[TM Squad Scraper] ${clubs.length} aktif kulüp bulundu, linkler eşleştiriliyor...`);

    // 2. Fetch Super Lig homepage to map slugs to TM squad URLs
    const superLigUrl = `${TM_BASE_URL}/super-lig/startseite/wettbewerb/TR1`;
    const superLigRes = await axios.get(superLigUrl, { headers });
    const $main = cheerio.load(superLigRes.data);

    // Map: tmSlug -> TM squad url
    const tmClubUrls = {};
    $main('#yw1 table.items > tbody > tr').each((i, el) => {
      const a = $main(el).find('td.hauptlink.no-border-links a');
      if (a.length > 0) {
        const href = a.attr('href'); // /galatasaray/spielplan/verein/141/saison_id/2024
        // Extract club slug from href. Example href: /galatasaray/spielplan/verein/141/saison_id/2024
        const parts = href.split('/');
        if (parts.length > 1) {
          const slug = parts[1]; // galatasaray
          // Change /spielplan/ to /kader/ to get squad page
          const squadHref = href.replace('/spielplan/', '/kader/');
          tmClubUrls[slug] = squadHref;
        }
      }
    });

    console.log('[TM Squad Scraper] Transfermarkt üzerinde bulunan takımlar:', Object.keys(tmClubUrls).join(', '));

    // 3. For each club in our DB, find its URL and scrape players
    for (const club of clubs) {
      // Find a matching url based on slug
      let squadUrlPath = tmClubUrls[club.slug];
      
      // Fallback: Fuzzy match
      if (!squadUrlPath) {
        const tmSlugs = Object.keys(tmClubUrls);
        const match = tmSlugs.find(s => 
          s.includes(club.slug.replace(/-/g, '')) || 
          club.slug.replace(/-/g, '').includes(s.replace(/-/g, '')) ||
          s.startsWith(club.slug.split('-')[0]) ||
          club.slug.startsWith(s.split('-')[0])
        );
        if (match) {
          squadUrlPath = tmClubUrls[match];
          console.log(`[TM Squad Scraper] Eşleşme bulundu: ${club.slug} -> ${match}`);
        }
      }

      if (!squadUrlPath) {
        console.log(`[TM Squad Scraper] Uyarı: ${club.name} için Transfermarkt linki bulunamadı. (Slug: ${club.slug})`);
        continue;
      }

      const fullUrl = `${TM_BASE_URL}${squadUrlPath}`;
      console.log(`[TM Squad Scraper] ${club.name} kadrosu çekiliyor...`);

      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          await delay(2000 + Math.random() * 2000);
          response = await axios.get(fullUrl, { headers });
          break;
        } catch (err) {
          retries--;
          if (err.response && err.response.status === 503) {
            console.log(`[TM Squad Scraper] 503 hatası (${club.name}). 5 saniye bekleniyor... Kalan deneme: ${retries}`);
            await delay(5000);
            if (retries === 0) throw err;
          } else {
            if (retries === 0) throw err;
            await delay(2000);
          }
        }
      }

      const $ = cheerio.load(response.data);
      const rows = $('table.items > tbody > tr');
      
      const playersToInsert = [];

      rows.each((i, row) => {
        const $row = $(row);
        
        // Forma No
        const shirtNumberText = $row.find('td.rn_nummer').text().trim();
        const shirtNumber = shirtNumberText || null;

        // Player ID & Link
        const nameLink = $row.find('td.hauptlink a');
        if (nameLink.length === 0) return;
        
        const playerName = nameLink.text().trim();
        const playerHref = nameLink.attr('href');
        let tmPlayerId = null;
        if (playerHref) {
           const idMatch = playerHref.match(/spieler\/(\d+)/);
           if (idMatch) tmPlayerId = parseInt(idMatch[1], 10);
        }

        // Photo URL
        const img = $row.find('td img.bilderrahmen-layout');
        let photoUrl = img.attr('data-src') || img.attr('src') || null;
        if (photoUrl && photoUrl.includes('default.jpg')) {
           photoUrl = null;
        }
        if (photoUrl && photoUrl.includes('/small/')) {
           photoUrl = photoUrl.replace('/small/', '/medium/'); // Better resolution
        }

        // Position
        const posText = $row.find('table.inline-table tr:nth-child(2) td').text().trim();
        const position = posText || null;

        // Nationality
        const natImg = $row.find('td.zentriert img.flaggenrahmen').first();
        const nationality = natImg.attr('title') || null;

        if (tmPlayerId && playerName) {
          playersToInsert.push({
            tmPlayerId,
            name: playerName,
            photoUrl,
            position,
            shirtNumber,
            nationality,
            clubId: club.id
          });
        }
      });

      // Insert/Update in DB
      let added = 0;
      for (const p of playersToInsert) {
        await prisma.player.upsert({
          where: { tmPlayerId: p.tmPlayerId },
          update: {
            name: p.name,
            photoUrl: p.photoUrl,
            position: p.position,
            shirtNumber: p.shirtNumber,
            nationality: p.nationality,
            clubId: p.clubId,
            updatedAt: new Date()
          },
          create: {
            tmPlayerId: p.tmPlayerId,
            name: p.name,
            photoUrl: p.photoUrl,
            position: p.position,
            shirtNumber: p.shirtNumber,
            nationality: p.nationality,
            clubId: p.clubId
          }
        });
        added++;
      }
      console.log(`[TM Squad Scraper] ${club.name} için ${added} oyuncu kaydedildi.`);
    }

    console.log('[TM Squad Scraper] İşlem tamamlandı!');
  } catch (error) {
    console.error('[TM Squad Scraper] Hata:', error.message);
  }
}
