import cron from 'node-cron';
import { scrapeStandings, scrapeFixtures, scrapeTopScorers } from '../modules/superlig/scrapers/tffScraper.js';
import { scrapeTransfers } from '../modules/superlig/scrapers/transfermarktScraper.js';
import { scrapeSquads } from '../modules/superlig/scrapers/transfermarktSquadScraper.js';
import { getLiveMatches } from '../modules/superlig/superlig.service.js';
import { syncMatchIncidents } from '../modules/superlig/incidentSyncWorker.js';

export function initCronJobs() {
  // 09:00, 13:00, 18:00, 23:00
  cron.schedule('0 9,13,18,23 * * *', async () => {
    console.log('[Cron] Süper Lig verileri güncelleniyor (Planlanmış Görev)...');
    try {
      await scrapeStandings();
      await scrapeFixtures();
      await scrapeTopScorers();
      await scrapeTransfers();
      await scrapeSquads();
      console.log('[Cron] Tüm scraping işlemleri tamamlandı.');
    } catch (e) {
      console.error('[Cron] Hata:', e);
    }
  }, {
    scheduled: true,
    timezone: "Europe/Istanbul"
  });

  // Check live matches every minute
  cron.schedule('* * * * *', async () => {
    try {
      // getLiveMatches() 30 sn'lik bir önbellek + eşzamanlı istek birleştirme
      // içeriyor; aynı Puppeteer taramasını hem HTTP istekleri hem de bu
      // cron her dakika ayrı ayrı tetiklemesin diye doğrudan scraper yerine
      // bu paylaşımlı servisi kullanıyoruz.
      const matches = await getLiveMatches();
      // fetchSofaScoreMatches() 'status' alanını düz bir string olarak
      // döndürüyor ('live' | 'finished' | 'notstarted'), obje değil.
      const liveMatches = matches.filter(m => m.status === 'live');
      for (const m of liveMatches) {
        await syncMatchIncidents(m.id);
      }
    } catch (e) {
      console.error('[Cron] Live Match Sync Hata:', e);
    }
  });

  console.log('[Cron] Süper Lig senkronizasyon zamanlayıcısı başlatıldı (09:00, 13:00, 18:00, 23:00)');
}