import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
  
  // Scrape start page for Coach
  const { data: startData } = await axios.get('https://www.transfermarkt.com.tr/galatasaray-istanbul/startseite/verein/141/saison_id/2024', { headers });
  const $start = cheerio.load(startData);
  const coachLink = $start('a[href*="/profil/trainer/"]');
  console.log('Coach URL:', coachLink.attr('href'));
  console.log('Coach Name:', coachLink.text().trim());

  // Check market value extraction in Squad page
  const { data: squadData } = await axios.get('https://www.transfermarkt.com.tr/galatasaray-istanbul/kader/verein/141/saison_id/2024', { headers });
  const $squad = cheerio.load(squadData);
  const val = $squad('table.items > tbody > tr').first().find('td.rechts.hauptlink a').text().trim();
  console.log('Market value:', val);
}
test();
