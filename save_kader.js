import axios from 'axios';
import fs from 'fs';

async function test() {
  const headers = {'User-Agent': 'Mozilla/5.0'};
  const kaderUrl = 'https://www.transfermarkt.com.tr/alanyaspor/kader/verein/11282/saison_id/2026';
  try {
    const res = await axios.get(kaderUrl, {headers});
    fs.writeFileSync('kader_test.html', res.data);
    console.log('Saved kader_test.html');
  } catch (e) {
    console.log('Error:', e.message);
  }
}
test();
