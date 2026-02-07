const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Check Password Length
const pass = process.env.SMTP_PASS;
console.log(`SMTP_PASS length: ${pass ? pass.length : 0}`);
if (pass && (pass.startsWith('"') || pass.startsWith("'"))) {
    console.log('WARNING: SMTP_PASS starts with quote!');
}

async function sendTest() {
    console.log('Creating transporter...');
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS.replace(/"/g, '') // Strip quotes if present, just to be safe for this test
        }
    });

    console.log('Verifying connection...');
    try {
        await transporter.verify();
        console.log('Connection verified!');

        console.log('Sending mail...');
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.APP_EMAIL || 'facottry@gmail.com',
            subject: 'Test Email from Debug Script',
            text: 'If you see this, email sending works!'
        });
        console.log('Message sent: %s', info.messageId);

    } catch (err) {
        console.error('Error:', err);
    }
}

sendTest();
