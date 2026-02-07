
const cronParser = require('cron-parser');
console.log('Type:', typeof cronParser);
console.log('Keys:', Object.keys(cronParser));
console.log('Is valid:', cronParser.parseExpression ? 'Yes' : 'No');

try {
    const cron = '0 * * * *';
    const interval = cronParser.parseExpression(cron);
    console.log('Next:', interval.next().toDate());
} catch (e) {
    console.error('Error:', e);
}
