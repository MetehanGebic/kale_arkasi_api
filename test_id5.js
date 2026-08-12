import { fetchSofaScoreMatches } from './src/modules/superlig/scrapers/sofaScoreScraper.js'; (async () => { const matches = await fetchSofaScoreMatches(); console.log('Done'); })();
