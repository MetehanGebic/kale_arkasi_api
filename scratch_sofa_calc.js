
const e = {
    status: { type: 'inprogress', description: '2nd half' },
    time: { currentPeriodStartTimestamp: Math.floor(Date.now() / 1000) - (15 * 60) } // Started 15 minutes ago
};
let minute = null;
if (e.time) {
    if (e.time.currentPeriodStartTimestamp) {
        minute = Math.floor((Date.now() / 1000 - e.time.currentPeriodStartTimestamp) / 60);
        if (e.status && e.status.description === '2nd half') minute += 45;
    }
}
console.log('Minute:', minute);

