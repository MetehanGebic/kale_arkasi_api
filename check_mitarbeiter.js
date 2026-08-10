import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const headers = {'User-Agent': 'Mozilla/5.0'};
  const res = await axios.get('https://www.transfermarkt.com.tr/alanyaspor/mitarbeiter/verein/11282/saison_id/2026', {headers});
  const $ = cheerio.load(res.data);
  const rows = $('.items tbody tr');
  console.log('Rows:', rows.length);
  
  let coach = null;
  rows.each((i, el) => {
    const role = $(el).find('td').eq(1).text().trim();
    if (role === 'Teknik Direktör') {
      coach = $(el).find('.hauptlink a').text().trim();
    }
  });
  console.log('Coach:', coach);
}
test();
