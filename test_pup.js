const puppeteer = require('puppeteer');

async function getCoach() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
  console.log('Navigating...');
  await page.goto('https://www.transfermarkt.com.tr/alanyaspor/startseite/verein/11282/saison_id/2026', { waitUntil: 'networkidle2' });
  
  console.log('Extracting coach...');
  const coach = await page.evaluate(() => {
    let result = null;
    document.querySelectorAll('.flex-container').forEach(el => {
      const title = el.querySelector('.trainer-position .value');
      if (title && title.innerText.trim() === 'Teknik Direktör') {
        const nameEl = el.querySelector('.name a');
        if (nameEl) result = nameEl.innerText.trim();
      }
    });
    return result;
  });
  
  console.log('Coach:', coach);
  await browser.close();
}

getCoach().catch(console.error);
