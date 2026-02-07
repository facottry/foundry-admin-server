
const cronParser = require('cron-parser');

const cron = '0 * * * *'; // Every hour
console.log('Testing cron:', cron);

try {
    const interval = cronParser.parseExpression(cron);
    console.log('Next run:', interval.next().toDate());
} catch (err) {
    console.error('Error:', err.message);
}
