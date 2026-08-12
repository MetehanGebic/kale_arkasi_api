
const https = require('https');
https.get('https://api.sofascore.com/api/v1/sport/football/events/live', {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.events && json.events.length > 0) {
        console.log(JSON.stringify(json.events.slice(0, 2).map(e => ({ id: e.id, time: e.time, status: e.status })), null, 2));
      } else {
        console.log('No events live right now');
      }
    } catch (e) {
      console.log('Error parsing JSON:', data.substring(0, 100));
    }
  });
});

