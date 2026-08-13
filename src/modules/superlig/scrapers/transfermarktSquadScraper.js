import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../../../core/db.js';

const TM_BASE_URL = 'https://www.transfermarkt.com.tr';

const COACH_MAP_26_27 = {
  'besiktas-istanbul': 'Vincenzo Italiano',
  'fenerbahce-istanbul': 'İsmail Kartal',
  'galatasaray-istanbul': 'Okan Buruk',
  'trabzonspor': 'Fatih Tekke',
  'amed-sk': 'Besnik Hasi',
  'alanyaspor': 'João Pereira',
  'caykur-rizespor': 'Recep Uçar',
  'corum-fk': 'Uğur Uçar',
  'buyuksehir-belediye-erzurumspor': 'Serkan Özbalta',
  'eyupspor': 'Özhan Pulat',
  'gaziantep-fk': 'Mihel Radoi',
  'genclerbirligi-ankara': 'Metin Diyadin',
  'goztepe': 'Stanimir Stoilov',
  'istanbul-basaksehir-fk': 'Nuri Şahin',
  'kasimpasa': 'Emre Belözoğlu',
  'kocaelispor': 'Selçuk İnan',
  'konyaspor': 'İlhan Palut',
  'samsunspor': 'Thorsten Fink'
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function scrapeSquads() {
  console.log('[TM Squad Scraper] Takım kadroları Çekiliyor...');
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // 1. Get all active clubs from our DB
    const clubs = await prisma.club.findMany({ where: { isActive: true } });
    if (clubs.length === 0) {
      console.log('[TM Squad Scraper] Veritabanındaki herhangi bir aktif kulüp bulunamadı.');
      return;
    }

    console.log(`[TM Squad Scraper] ${clubs.length} aktif kulüp bulundu, linkler eşleştiriliyor...`);

    const superLigUrl = `${TM_BASE_URL}/super-lig/startseite/wettbewerb/TR1`;
    const superLigRes = await axios.get(superLigUrl, { headers });
    const $main = cheerio.load(superLigRes.data);

    const tmClubUrls = {};
    $main('#yw1 table.items > tbody > tr').each((i, el) => {
      const a = $main(el).find('td.hauptlink.no-border-links a');
      if (a.length > 0) {
        const href = a.attr('href');
        const parts = href.split('/');
        if (parts.length > 1) {
          const slug = parts[1];
          const squadHref = href.replace('/spielplan/', '/kader/');
          tmClubUrls[slug] = squadHref;
        }
      }
    });

    console.log('[TM Squad Scraper] Transfermarkt Üzerinde bulunan takımlar:', Object.keys(tmClubUrls).join(', '));

    for (const club of clubs) {
      let squadUrlPath = tmClubUrls[club.slug];
      
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
      const startseiteUrl = fullUrl.replace('/kader/', '/startseite/');
      
      let coachName = null;
      let startRetries = 3;
      while (startRetries > 0) {
        try {
          await delay(2000 + Math.random() * 2000);
          const startRes = await axios.get(startseiteUrl, { headers });
          const $s = cheerio.load(startRes.data);
          $s('.flex-container').each((i, el) => {
            const titleText = $s(el).find('.trainer-position .value').text().trim();
            if (titleText === 'Teknik Direktör') {
              coachName = $s(el).find('.name a').text().trim();
            }
          });
          
          if (!coachName) {
            const coachLink = $s('a[href*="/profil/trainer/"]');
            if (coachLink.length > 0) {
              coachName = coachLink.first().text().trim();
            }
          }
          
          if (!coachName && COACH_MAP_26_27[club.slug]) {
             coachName = COACH_MAP_26_27[club.slug];
          }

          break;
        } catch(e) {
          startRetries--;
          if (startRetries === 0) {
            console.log(`[TM Squad Scraper] Teknik direktör bulunamadı: ${club.name}`);
          } else {
            await delay(5000);
          }
        }
      }

      console.log(`[TM Squad Scraper] ${club.name} kadrosu çekiliyor... (TD: ${coachName || 'Yok'})`);

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
            console.log(`[TM Squad Scraper] 503 hatası alındı(${club.name}). 5 saniye bekleniyor... Kalan deneme: ${retries}`);
            await delay(5000);
            if (retries === 0) throw err;
          } else {
            if (retries === 0) throw err;
            await delay(2000);
          }
        }
      }

        const $kader = cheerio.load(response.data);
        const totalValueEl = $kader('a.data-header__market-value-wrapper');
        let totalMarketValue = null;
        if (totalValueEl.length > 0) {
          totalMarketValue = totalValueEl.text().replace('Toplam değer', '').trim();
        }

        const rows = $kader('table.items > tbody > tr');
        let playerCount = 0;
        const playersToInsert = [];

      rows.each((i, row) => {
        const $row = $kader(row);
        
        const shirtNumberText = $row.find('.rn_nummer').text().trim();
        const shirtNumber = shirtNumberText || null;

        const nameLink = $row.find('td.hauptlink a').first();
        if (nameLink.length === 0) return;
        
        const playerName = nameLink.text().trim();
        const playerHref = nameLink.attr('href');
        let tmPlayerId = null;
        if (playerHref) {
           const idMatch = playerHref.match(/spieler\/(\d+)/);
           if (idMatch) tmPlayerId = parseInt(idMatch[1], 10);
          }

        const img = $row.find('img.bilderrahmen-fixed, img.bilderrahmen-layout');
        let photoUrl = img.attr('data-src') || img.attr('src') || null;
        if (photoUrl && photoUrl.includes('default.jpg')) {
           photoUrl = null;
        }
        if (photoUrl && photoUrl.includes('/small/')) {
           photoUrl = photoUrl.replace('/small/', '/medium/'); // Better resolution
        }

        const posText = $row.find('table.inline-table tr:nth-child(2) td').text().trim();
        const position = posText || null;

        const natImg = $row.find('td.zentriert img.flaggenrahmen').first();
        const nationality = natImg.attr('title') || null;

        const valText = $row.find('td.rechts.hauptlink a').text().trim();
        const marketValue = valText || null;

        if (tmPlayerId && playerName) {
          playersToInsert.push({
            tmPlayerId,
            name: playerName,
            photoUrl,
            position,
            shirtNumber,
            nationality,
            marketValue,
            clubId: club.id
          });
          playerCount++;
        }
      });

      for (const p of playersToInsert) {
        await prisma.player.upsert({
          where: { tmPlayerId: p.tmPlayerId },
          update: {
            name: p.name,
            photoUrl: p.photoUrl,
            position: p.position,
            shirtNumber: p.shirtNumber,
            nationality: p.nationality,
            marketValue: p.marketValue,
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
            marketValue: p.marketValue,
            clubId: p.clubId
          }
        });
      }

      const scrapedPlayerIds = playersToInsert.map(p => p.tmPlayerId);
      await prisma.player.deleteMany({
        where: {
          clubId: club.id,
          tmPlayerId: { notIn: scrapedPlayerIds }
        }
      });

      await prisma.club.update({
        where: { id: club.id },
        data: { 
          coachName: coachName,
          totalMarketValue: totalMarketValue
        }
      });

      console.log(`[TM Squad Scraper] ${club.name} için ${playerCount} oyuncu kaydedildi.`);
    }

    console.log('[TM Squad Scraper] İşlem tamamlandı!');
  } catch (error) {
    console.error('[TM Squad Scraper] Hata:', error.message);
  }
}
