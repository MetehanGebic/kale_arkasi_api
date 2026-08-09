import axios from 'axios';
import * as cheerio from 'cheerio';
import { prisma } from '../../../core/db.js';

const TFF_BASE_URL = 'https://www.tff.org/default.aspx';

export async function scrapeStandings() {
  console.log('[TFF Scraper] Puan durumu çekiliyor...');
  try {
    const response = await axios.get(`${TFF_BASE_URL}?pageID=198`);
    const $ = cheerio.load(response.data);

    const standings = [];
    
    // TFF Puan Durumu tablosu div.icerik-puan-durumu veya table.MasterTable_TFF_PuanDurumu
    const rows = $('span#dtlPuanDurumu_lblPuanDurumu').closest('table').find('tr:gt(0)');
    // We will refine this selector in test script
  } catch(e) {
    console.error(e);
  }
}
