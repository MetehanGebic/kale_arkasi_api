import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import https from 'https';

const url = 'https://www.transfermarkt.com.tr/transfers/neuestetransfers/statistik/plus/?plus=0&galerie=0&wettbewerb_id=TR1&verein_land_id=&selectedOptionInternalType=nothingSelected&land_id=&minMarktwert=0&maxMarktwert=500.000.000&minAbloese=0&maxAbloese=500.000.000&yt0=G%C3%B6ster';

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
    fs.writeFileSync('tm_test.html', res.data);
    console.log("File written to tm_test.html");
    
    // Check old selectors
    const oldRows = $('table.items > tbody > tr');
    console.log(`Found ${oldRows.length} rows with table.items > tbody > tr`);
    
    // Look at first 2 rows
    if (oldRows.length > 0) {
      console.log(oldRows.first().html());
    }
  } catch (err) {
    console.error(err.message);
  }
}

test();
