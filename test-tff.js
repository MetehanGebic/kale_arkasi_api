import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';
import fs from 'fs';

const url = 'https://www.tff.org/default.aspx?pageID=201';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function test() {
  const res = await axios.get(url, { headers, httpsAgent });
  const $ = cheerio.load(res.data);
  fs.writeFileSync('topscorers.html', res.data);
  
  // Find rows in the top scorer table
  const tableRows = $('table').find('tr').slice(0, 15).map((i, el) => $(el).text().replace(/\s+/g, ' ').trim()).get();
  console.log(tableRows);
}

test();
