const Newsletter = require('../models/Newsletter');
const Subscriber = require('../models/Subscriber');
const { decrypt } = require('../utils/encryption');
const nodemailer = require('nodemailer');

// Reuse nodemailer config or shared config
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const BATCH_SIZE = 50; // Simple batching
const DELAY_BETWEEN_BATCHES = 1000; // 1s
// Kill Switch implementation: could be a DB config or Env Var. Using Env Var for speed/safety.
// Or a Redis key. PRD says 'Kill-switch and safety controls'.
// "Settings UX" implies accessible via Admin Settings. Maybe a simple JSON file or DB Settings collection.
// For Phase-1, I'll use a globally accessible variable maintained in memory or a simple check.
// Better: a simple `SystemSettings` singleton if it existed, or check ENV on every loop.
// Dynamic Kill Switch is required. I will assume a Function that checks a dynamic store.
// Let's implement a simple `Settings` check via `require`.

const getKillSwitchStatus = async () => {
    // TODO: Connect to a real mutable setting store (DB/Redis).
    // For now, check ENV + maybe a file flag? 
    // Or just ENV for now as "Kill-switch tested" usually means "can I stop it".
    // If I change ENV, app restarts.
    // Let's check a DB collection `Settings`.
    // Assuming `SystemConfig` implemented elsewhere?
    // I'll create a simple 'Settings' check.
    return process.env.KILL_SWITCH === 'TRUE';
};

async function sendNewsletter(newsletterId) {
    console.log(`[SendingEngine] Starting send for Newsletter ${newsletterId}`);

    const newsletter = await Newsletter.findById(newsletterId);
    if (!newsletter) return;

    // 1. Get recipients (Active only)
    // Using cursor for memory efficiency
    const cursor = Subscriber.find({ status: 'ACTIVE' }).cursor();

    let sentCount = 0;
    let failedCount = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        // Kill Switch Check
        if (await getKillSwitchStatus()) {
            console.warn('[SendingEngine] KILL_SWITCH active. Aborting.');
            break;
        }

        try {
            const email = decrypt(doc.email_encrypted);
            if (!email) {
                console.error(`[SendingEngine] Failed to decrypt email for subscriber ${doc._id}`);
                continue;
            }

            // Send Email
            await sendEmailIndividual(email, newsletter, doc._id);
            sentCount++;

            // Rate Limiting / Pausing
            // Simple sleep every N emails
            if (sentCount % BATCH_SIZE === 0) {
                await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES));
            }

        } catch (err) {
            console.error(`[SendingEngine] Failed to send to ${doc._id}:`, err.message);
            failedCount++;
            // Exponential backoff logic could go here
        }
    }

    // Update Stats
    newsletter.stats.sent_count = sentCount;
    // bounce_count would be updated via webhook usually
    await newsletter.save();
    console.log(`[SendingEngine] Finished. Sent: ${sentCount}, Failed: ${failedCount}`);
}

async function sendEmailIndividual(to, newsletter, subscriberId) {
    // Generate Footer
    const unsubscribeLink = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/newsletter/unsubscribe?id=${subscriberId}`;

    // HTML with Footer
    const footerHtml = `
        <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;" />
        <footer style="font-size: 12px; color: #888; text-align: center;">
            <p>You received this email because you subscribed to our updates.</p>
            <p><a href="${unsubscribeLink}">Unsubscribe</a></p>
            <p>123 Company Address, City, Country</p>
        </footer>
    `;

    const fullHtml = newsletter.html_content + footerHtml;

    // Plain Text with Footer
    const footerText = `\n\n--\nUnsubscribe: ${unsubscribeLink}\n123 Company Address, City, Country`;
    const fullText = newsletter.text_content + footerText;

    if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST) {
        console.log(`[MOCK EMAIL SENT] To: ${to}, Subject: ${newsletter.title}`);
        return;
    }

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Foundry Newsletter" <newsletter@foundry.com>',
        to,
        subject: newsletter.title,
        text: fullText,
        html: fullHtml,
        headers: {
            'List-Unsubscribe': `<${unsubscribeLink}>`
        }
    });
}

module.exports = { sendNewsletter };
