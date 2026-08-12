import cron from 'node-cron';
import { scrapeStandings, scrapeFixtures, scrapeTopScorers } from '../modules/superlig/scrapers/tffScraper.js';
import { scrapeTransfers } from '../modules/superlig/scrapers/transfermarktScraper.js';

import { scrapeSquads } from '../modules/superlig/scrapers/transfermarktSquadScraper.js';

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

  console.log('[Cron] Süper Lig senkronizasyon zamanlayıcısı başlatıldı (09:00, 13:00, 18:00, 23:00)');
}
