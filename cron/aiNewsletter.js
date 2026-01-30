const cron = require('node-cron');
const Newsletter = require('../models/Newsletter');
const { generateNewsletterContent } = require('../services/aiService');

// Schedule: 10:00 AM Daily
// Cron format: Minute Hour Day Month Weekday
const SCHEDULE = '0 10 * * *';

function startAiCron() {
    console.log('[AI Cron] Initialized schedule:', SCHEDULE);

    cron.schedule(SCHEDULE, async () => {
        console.log('[AI Cron] Starting daily generation...');

        // Check if automation is enabled (via Env or DB setting)
        if (process.env.ENABLE_AI_AUTOMATION !== 'TRUE') {
            console.log('[AI Cron] Automation disabled. Skipping.');
            return;
        }

        const content = await generateNewsletterContent();

        if (content) {
            const newsletter = new Newsletter({
                title: content.title || 'Daily AI Update',
                html_content: content.html_content,
                text_content: content.text_content,
                status: 'DRAFT', // Always Draft first
                is_ai_generated: true,
                scheduled_at: new Date() // Set to now, but Draft status prevents sending
            });

            await newsletter.save();
            console.log('[AI Cron] Generated Draft Newsletter:', newsletter._id);
        } else {
            console.error('[AI Cron] Failed to generate content.');
        }
    });
}

// Allow manual trigger for testing
async function triggerManualGeneration() {
    console.log('[AI Cron] Manual trigger...');
    const content = await generateNewsletterContent();
    if (content) {
        const newsletter = new Newsletter({
            title: content.title || 'Manual AI Update',
            html_content: content.html_content,
            text_content: content.text_content,
            status: 'DRAFT',
            is_ai_generated: true
        });
        await newsletter.save();
        return newsletter;
    }
    return null;
}

module.exports = { startAiCron, triggerManualGeneration };
