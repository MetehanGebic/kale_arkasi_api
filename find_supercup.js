import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  await page.goto('https://api.sofascore.com/api/v1/sport/football/scheduled-events/2026-08-12', { waitUntil: 'networkidle2' });
  const text = await page.evaluate(() => document.body.innerText);
  const data = JSON.parse(text);
  
  if (data.events) {
    const tourneys = new Set();
    for (const e of data.events) {
      if (e.tournament && e.tournament.uniqueTournament) {
        tourneys.add(`${e.tournament.uniqueTournament.name}: ${e.tournament.uniqueTournament.id}`);
      }
    }
    console.log(Array.from(tourneys).filter(t => t.toLowerCase().includes('super cup')));
  }
  await browser.close();
})();
