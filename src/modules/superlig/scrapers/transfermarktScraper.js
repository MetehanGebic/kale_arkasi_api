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

    // 5 sayfaya kadar tarama (En son transferler)
    for (let page = 1; page <= 5; page++) {
      console.log(`[TM Scraper] Sayfa ${page} taranıyor...`);
      const url = `${TM_BASE_URL}/transfers/neuestetransfers/statistik/plus/ajax/yw1/galerie/0/wettbewerb_id/TR1/plus/0/galerie/0/wettbewerb_id/TR1/verein_land_id//selectedOptionInternalType/nothingSelected/land_id//minMarktwert/0/maxMarktwert/500.000.000/minAbloese/0/maxAbloese/500.000.000/yt0/G%C3%B6ster/page/${page}`;
      const response = await axios.get(url, { headers });
      const $ = cheerio.load(response.data);

      const rows = $('table.items > tbody > tr');
      if (rows.length === 0) break; // Sayfa boşsa döngüyü bitir

      const transfers = [];

      rows.each((i, row) => {
        const $row = $(row);
        
        // Skip header/empty rows
        if (!$row.find('td.hauptlink').length) return;

        const playerLinkNode = $row.find('td.hauptlink a').first();
        const playerUrl = playerLinkNode.attr('href') || '';
        const playerName = playerLinkNode.text().trim();
        
        const playerPhotoUrl = $row.find('td img.bilderrahmen-fixed').first().attr('data-src') || $row.find('td img.bilderrahmen-fixed').first().attr('src') || '';

        // The layout is:
        // td -> table.inline-table (From Club)
        // td -> table.inline-table (To Club)
        const clubTables = $row.find('table.inline-table');
        if (clubTables.length < 3) return; // Player info table + From Club + To Club

        // The first inline-table is the player info, second is From Club, third is To Club
        const fromClubTable = $(clubTables[1]);
        const toClubTable = $(clubTables[2]);

        const fromNode = fromClubTable.find('td.hauptlink a').first();
        const toNode = toClubTable.find('td.hauptlink a').first();

        const fromUrl = fromNode.attr('href') || '';
        const toUrl = toNode.attr('href') || '';
        
        // "Kulüpsüz" Filtresi (verein/515)
        if (toUrl.includes('verein/515')) {
          return;
        }

        const fromClubName = fromNode.text().trim() || '';
        const toClubName = toNode.text().trim() || '';
        
        const fromLogo = fromClubTable.find('img.tiny_wappen').attr('src') || '';
        const toLogo = toClubTable.find('img.tiny_wappen').attr('src') || '';

        const fromIdMatch = fromUrl.match(/verein\/(\d+)/);
        const toIdMatch = toUrl.match(/verein\/(\d+)/);
        const fromTmId = fromIdMatch ? parseInt(fromIdMatch[1], 10) : null;
        const toTmId = toIdMatch ? parseInt(toIdMatch[1], 10) : null;

        const spielerIdMatch = playerUrl.match(/spieler\/(\d+)/);
        const spielerId = spielerIdMatch ? spielerIdMatch[1] : `UNK_${Math.random()}`;
        
        // TM usually puts transfer_id in the last column link
        const transferLink = $row.find('td.rechts.hauptlink a').attr('href') || '';
        const transferIdMatch = transferLink.match(/transfer_id\/(\d+)/);
        let tmTransferId = 0;
        if (transferIdMatch) {
           tmTransferId = parseInt(transferIdMatch[1], 10);
        } else {
           tmTransferId = parseInt(`${spielerId}${fromTmId || 0}${toTmId || 0}`.substring(0, 15), 10);
        }

        const feeStr = $row.find('td.rechts.hauptlink').text().trim().toLowerCase() || $row.find('td.zelle-abloese').text().trim().toLowerCase();
        
        let feeType = 'UNDISCLOSED';
        if (feeStr.includes('bedelsiz')) feeType = 'FREE';
        else if (feeStr.includes('kiralık') || feeStr.includes('kiralik')) feeType = 'LOAN';
        else if (feeStr.includes('€') || feeStr.match(/\d/)) feeType = 'FEE';

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
