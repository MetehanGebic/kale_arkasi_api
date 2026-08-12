
const https = require('https');
const options = {
  hostname: 'api.sofascore.com',
  path: '/api/v1/sport/football/events/live',
  headers: { 'User-Agent': 'Mozilla/5.0' }
};
https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.events && json.events.length > 0) {
      console.log(json.events[0].time);
    } else {
      console.log('No events');
    }
  });
});

