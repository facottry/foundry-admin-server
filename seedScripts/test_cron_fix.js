
const { CronExpressionParser } = require('cron-parser');

try {
    const cron = '0 * * * *';
    console.log('Testing cron:', cron);
    const interval = CronExpressionParser.parse(cron);
    console.log('Next run:', interval.next().toDate());
} catch (err) {
    console.error('Error:', err);
}
