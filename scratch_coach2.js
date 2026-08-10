import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const TM_BASE_URL = 'https://www.transfermarkt.com.tr';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  };

  const squadUrlPath = '/galatasaray-istanbul/kader/verein/141/saison_id/2024';
  const fullUrl = `${TM_BASE_URL}${squadUrlPath}`;
  const startseiteUrl = fullUrl.replace('/kader/', '/startseite/');
  
  console.log('Fetching:', startseiteUrl);
  const startRes = await axios.get(startseiteUrl, { headers });
  const $s = cheerio.load(startRes.data);
  const coachLink = $s('a[href*="/profil/trainer/"]');
  console.log('Found coach links:', coachLink.length);
  if (coachLink.length > 0) {
    console.log('Coach text:', coachLink.first().text().trim());
  } else {
    // Let's find something else to verify HTML
    console.log('Title:', $s('title').text());
  }
}

test();
