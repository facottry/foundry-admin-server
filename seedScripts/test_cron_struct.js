
const parser = require('cron-parser');
console.log('Parser:', parser);
console.log('Parser keys:', Object.keys(parser));
try {
    console.log('parseExpression exists:', typeof parser.parseExpression);
} catch (e) { }
