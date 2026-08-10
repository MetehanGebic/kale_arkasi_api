import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const headers = {'User-Agent': 'Mozilla/5.0'};
  try {
    const res = await axios.get('https://www.transfermarkt.com.tr/amed-sk/datenfakten/verein/12382/saison_id/2026', {headers});
    const $ = cheerio.load(res.data);
    const trainerLink = $('a[href*="/profil/trainer/"]');
    console.log('Trainer found:', trainerLink.length);
    trainerLink.each((i, el) => {
      console.log(' -', $(el).text().trim());
    });
  } catch (e) {
    console.log('Error:', e.message);
  }
}
test();
