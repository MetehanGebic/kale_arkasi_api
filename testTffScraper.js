import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import https from 'https';

async function fetchAndParse() {
  try {
    const url = 'https://www.tff.org/default.aspx?pageID=198';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    
    fs.writeFileSync('tff_standings.html', response.data);
    console.log('Saved to tff_standings.html');
    
    const $ = cheerio.load(response.data);
    let count = 0;
    $('span').each((i, el) => {
      const id = $(el).attr('id');
      if (id && id.includes('lblOyun')) {
        console.log(`Found ID: ${JSON.stringify(id)}`);
        count++;
      }
    });
    console.log(`Total spans with lblOyun: ${count}`);

  } catch (error) {
    console.error('Error fetching:', error.message);
  }
}

fetchAndParse();
