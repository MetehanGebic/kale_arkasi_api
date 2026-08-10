import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import https from 'https';

const url = 'https://www.transfermarkt.com.tr/super-lig/transfers/wettbewerb/TR1';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function test() {
  try {
    const res = await axios.get(url, { headers, httpsAgent });
    const $ = cheerio.load(res.data);
    
    const rows = $('div.box').find('table tbody tr');
    console.log(`Found ${rows.length} rows`);
    if (rows.length > 0) {
      console.log(rows.first().html());
      console.log("----");
      console.log(rows.eq(1).html());
    }
  } catch (err) {
    console.error(err.message);
  }
}

test();
