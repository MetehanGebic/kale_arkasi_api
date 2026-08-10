import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  const headers = {'User-Agent': 'Mozilla/5.0'};
  try {
    const res = await axios.get('https://www.transfermarkt.com.tr/super-lig/trainer/wettbewerb/TR1', {headers});
    const $ = cheerio.load(res.data);
    const trs = $('table.items tbody tr');
    console.log(trs.length, 'coaches found');
    
    trs.each((i, row) => {
      const coachName = $(row).find('.hauptlink a').first().text().trim();
      const clubImg = $(row).find('.tiny_wappen').attr('alt');
      console.log(`${clubImg}: ${coachName}`);
    });
  } catch (e) {
    console.log('Error:', e.message);
  }
}
test();
