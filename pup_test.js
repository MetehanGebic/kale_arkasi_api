
import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0');
  
  await page.goto('https://api.sofascore.com/api/v1/event/11406830/incidents', { waitUntil: 'networkidle2' });
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.substring(0, 1000));
  
  await page.goto('https://api.sofascore.com/api/v1/event/11406830/lineups', { waitUntil: 'networkidle2' });
  const text2 = await page.evaluate(() => document.body.innerText);
  console.log('Lineups: ', text2.substring(0, 1000));
  
  await browser.close();
})();

