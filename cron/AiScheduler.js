const cron = require('node-cron');
const cronstrue = require('cronstrue');
const Newsletter = require('../models/Newsletter');
const SystemConfig = require('../models/SystemConfig');
const { generateNewsletterContent } = require('../services/aiService');

let activeTasks = [];

/**
 * Initializes the AI Scheduler.
 * Fetches config from DB and sets up cron jobs.
 */
async function initAiScheduler() {
    console.log('[AI Scheduler] Initializing...');
    await stopAllTasks();

    try {
        let configDoc = await SystemConfig.findOne({ key: 'AI_NEWSLETTER_CONFIG' });

        // Default config if not exists
        if (!configDoc) {
            console.log('[AI Scheduler] No config found. Using defaults.');
            const defaultConfig = {
                enabled: false,
                schedules: [
                    { cron: '0 10 * * *', label: 'Daily Morning', model: 'gemini-1.5-flash', topic: 'General Tech Trends' }
                ]
            };
            configDoc = await SystemConfig.create({ key: 'AI_NEWSLETTER_CONFIG', value: defaultConfig });
        }

        const config = configDoc.value;

        if (!config.enabled) {
            console.log('[AI Scheduler] AI Automation is DISABLED in config.');
            return;
        }

        if (config.schedules && Array.isArray(config.schedules)) {
            config.schedules.forEach((schedule, index) => {
                if (!cron.validate(schedule.cron)) {
                    console.error(`[AI Scheduler] Invalid CRON: ${schedule.cron}`);
                    return;
                }

                console.log(`[AI Scheduler] Scheduled Task [${index}]: ${schedule.label} (${cronstrue.toString(schedule.cron)})`);

                const task = cron.schedule(schedule.cron, async () => {
                    console.log(`[AI Scheduler] Triggering task: ${schedule.label}`);
                    await executeGeneration(schedule);
                });

                activeTasks.push(task);
            });
        }

        console.log(`[AI Scheduler] Started ${activeTasks.length} tasks.`);

    } catch (error) {
        console.error('[AI Scheduler] Init failed:', error);
    }
}

async function stopAllTasks() {
    activeTasks.forEach(task => task.stop());
    activeTasks = [];
    console.log('[AI Scheduler] Stopped all active tasks.');
}

async function executeGeneration(scheduleConfig) {
    try {
        console.log(`[AI Gen] Generating content for: ${scheduleConfig.topic} using ${scheduleConfig.model}`);

        // Pass specific prompt/model to service if supported, otherwise uses default
        // For Phase-1 service, we might need to update signature, but for now assuming it uses env/defaults
        // We will pass the topic as a hint if possible or just log it.

        const content = await generateNewsletterContent(scheduleConfig.topic, scheduleConfig.model);

        if (content) {
            const newsletter = new Newsletter({
                title: content.title || `AI Update: ${scheduleConfig.label}`,
                html_content: content.html_content,
                text_content: content.text_content,
                status: 'DRAFT',
                is_ai_generated: true,
                scheduled_at: new Date()
            });

            await newsletter.save();
            console.log(`[AI Gen] Created Draft: ${newsletter.title} (${newsletter._id})`);
        }
    } catch (error) {
        console.error('[AI Gen] Generation failed:', error);
    }
}

async function reloadScheduler() {
    console.log('[AI Scheduler] Reloading configuration...');
    await initAiScheduler();
}

module.exports = { initAiScheduler, reloadScheduler };
