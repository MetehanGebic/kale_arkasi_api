import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../../../core/db.js';

const TM_BASE_URL = 'https://www.transfermarkt.com.tr';

export async function scrapeTransfers() {
  console.log('[TM Scraper] Transfermarkt transferleri çekiliyor...');
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // 10 sayfaya kadar tarama
    for (let page = 1; page <= 10; page++) {
      console.log(`[TM Scraper] Sayfa ${page} taranıyor...`);
      const url = `${TM_BASE_URL}/super-lig/transfers/wettbewerb/TR1?page=${page}`;
      const response = await axios.get(url, { headers });
      const $ = cheerio.load(response.data);

      const rows = $('table.items tbody tr');
      if (rows.length === 0) break; // Sayfa boşsa döngüyü bitir

      const transfers = [];

      rows.each((i, row) => {
        // Transfermarkt row yapısında .hauptlink içindeki a etiketi
        const $row = $(row);
        
        // Transfer ID'si satırın id'si veya içindeki linklerden alınabilir
        // Genelde transfer url'sinde "/transfer_id/123456" bulunur.
        const playerLinkNode = $row.find('td.hauptlink a').first();
        const playerUrl = playerLinkNode.attr('href') || '';
        const playerName = playerLinkNode.text().trim();
        
        // Fotoğraf (genelde td'nin içindeki img.bilderleben)
        const playerPhotoUrl = $row.find('td img').first().attr('data-src') || $row.find('td img').first().attr('src') || '';

        // From Club ve To Club
        // "Abgebender Verein" (Ayrılan) ve "Aufnehmender Verein" (Katılan)
        // Tabloda soldaki takım Ayrılan, sağdaki takım Katılan'dır.
        const clubsUrls = [];
        $row.find('td.verein-wappen a').each((i, el) => {
          clubsUrls.push($(el));
        });

        if (clubsUrls.length >= 2) {
          const fromNode = clubsUrls[0];
          const toNode = clubsUrls[1];

          const fromUrl = fromNode.attr('href') || '';
          const toUrl = toNode.attr('href') || '';
          
          // "Kulüpsüz" Filtresi (verein/515)
          if (toUrl.includes('verein/515')) {
            return; // Atla
          }

          const fromClubName = fromNode.attr('title') || '';
          const toClubName = toNode.attr('title') || '';
          
          const fromLogo = fromNode.find('img').attr('src') || '';
          const toLogo = toNode.find('img').attr('src') || '';

          // Verein ID'leri çıkar
          const fromIdMatch = fromUrl.match(/verein\/(\d+)/);
          const toIdMatch = toUrl.match(/verein\/(\d+)/);
          const fromTmId = fromIdMatch ? parseInt(fromIdMatch[1], 10) : null;
          const toTmId = toIdMatch ? parseInt(toIdMatch[1], 10) : null;

          // Transfer_id'yi bulmak için satırdaki profiline giden linke veya tr id'ye bakalım
          // Genelde TR tag'inin ID'sinde saklıdır (örn: id="transfer_123456") 
          // Ya da bulunamıyorsa oyuncu_id + from_club + to_club hashi kullanabiliriz.
          // Burada oyuncu profil URL'sinde id var (/profil/spieler/123)
          const spielerIdMatch = playerUrl.match(/spieler\/(\d+)/);
          const spielerId = spielerIdMatch ? spielerIdMatch[1] : `UNK_${Math.random()}`;
          const tmTransferId = parseInt(`${spielerId}${fromTmId || 0}${toTmId || 0}`.substring(0, 15), 10); // Pseudo-id if actual transfer_id isn't in DOM. Transfermarkt often hides actual transfer_id in nested links.

          const feeStr = $row.find('td.rechts.hauptlink').text().trim().toLowerCase() || $row.find('td.zelle-abloese').text().trim().toLowerCase();
          
          let feeType = 'UNDISCLOSED';
          if (feeStr.includes('bedelsiz')) feeType = 'FREE';
          else if (feeStr.includes('kiralık') || feeStr.includes('kiralik')) feeType = 'LOAN';
          else if (feeStr.includes('€')) feeType = 'FEE';

          transfers.push({
            tmTransferId,
            playerName,
            playerPhotoUrl,
            fromClubName,
            fromClubLogoUrl: fromLogo,
            fromTmId,
            toClubName,
            toClubLogoUrl: toLogo,
            toTmId,
            feeType
          });
        }
      });

      for (const t of transfers) {
        const fromClub = t.fromTmId ? await prisma.club.findUnique({ where: { transfermarktId: t.fromTmId } }) : null;
        const toClub = t.toTmId ? await prisma.club.findUnique({ where: { transfermarktId: t.toTmId } }) : null;

        await prisma.transfer.upsert({
          where: { tmTransferId: t.tmTransferId },
          update: {
            playerPhotoUrl: t.playerPhotoUrl,
            fromClubLogoUrl: t.fromClubLogoUrl,
            toClubLogoUrl: t.toClubLogoUrl,
            feeType: t.feeType
          },
          create: {
            tmTransferId: t.tmTransferId,
            playerName: t.playerName,
            playerPhotoUrl: t.playerPhotoUrl,
            fromClubName: t.fromClubName,
            fromClubLogoUrl: t.fromClubLogoUrl,
            fromClubId: fromClub ? fromClub.id : null,
            toClubName: t.toClubName,
            toClubLogoUrl: t.toClubLogoUrl,
            toClubId: toClub ? toClub.id : null,
            feeType: t.feeType
          }
        });
      }
    }
    console.log('[TM Scraper] Transfermarkt tamamlandı.');
  } catch (error) {
    console.error('[TM Scraper] Hata:', error.message);
  }
}
