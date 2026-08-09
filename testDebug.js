import fs from 'fs';
import * as cheerio from 'cheerio';
const html = fs.readFileSync('tff_standings.html', 'utf8');
const $ = cheerio.load(html);
const rows = $('span[id*="_lblOyun"]').closest('tr');
console.log('Rows found:', rows.length);
rows.each((i, row) => {
  const cols = $(row).find('td');
  if (i === 0) {
    cols.each((j, col) => console.log(`Col ${j}: ${$(col).text().trim()}`));
    console.log(`Col 0 HTML: ${$(cols[0]).html()}`);
  }
});
