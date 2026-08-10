import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
  const { data } = await axios.get('https://www.transfermarkt.com.tr/galatasaray-istanbul/kader/verein/141/saison_id/2024', { headers });
  const $ = cheerio.load(data);
  const p = $('table.items > tbody > tr').first();
  console.log(p.html());
}
test();
