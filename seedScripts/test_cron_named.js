
const { parseExpression } = require('cron-parser');
console.log('parseExpression type:', typeof parseExpression);

try {
    const cron = '0 * * * *';
    const interval = parseExpression(cron);
    console.log('Next:', interval.next().toDate());
} catch (e) {
    console.error('Error:', e);
}
