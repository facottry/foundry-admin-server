const cron = require('node-cron');
const AIJob = require('../models/AIJob');
const AIJobRun = require('../models/AIJobRun');
const Newsletter = require('../models/Newsletter');
const { generateNewsletterContent } = require('../services/aiService');
const { sendNewsletter } = require('../services/sendingEngine');

// Store active cron tasks
let activeJobs = new Map();

/**
 * Initialize scheduler - load all active jobs
 */
async function initScheduler() {
    console.log('[AI Scheduler] Initializing...');
    await stopAllJobs();
    await loadActiveJobs();
}

/**
 * Stop all active cron jobs
 */
async function stopAllJobs() {
    for (const [jobId, task] of activeJobs) {
        task.stop();
    }
    activeJobs.clear();
    console.log('[AI Scheduler] Stopped all active tasks.');
}

/**
 * Load and schedule all active jobs
 */
async function loadActiveJobs() {
    try {
        const jobs = await AIJob.find({ status: 'ACTIVE' });
        console.log(`[AI Scheduler] Found ${jobs.length} active jobs.`);

        for (const job of jobs) {
            scheduleJob(job);
        }
    } catch (err) {
        console.error('[AI Scheduler] Error loading jobs:', err);
    }
}

/**
 * Schedule a single job
 */
function scheduleJob(job) {
    const cronExp = job.toCronExpression();
    if (!cronExp) {
        console.error(`[AI Scheduler] Invalid cron for job ${job._id}`);
        return;
    }

    if (!cron.validate(cronExp)) {
        console.error(`[AI Scheduler] Invalid cron expression: ${cronExp}`);
        return;
    }

    console.log(`[AI Scheduler] Scheduling job "${job.name}" with cron: ${cronExp}`);

    const task = cron.schedule(cronExp, async () => {
        await executeJob(job._id);
    });

    activeJobs.set(job._id.toString(), task);
}

/**
 * Execute a job
 */
async function executeJob(jobId) {
    const job = await AIJob.findById(jobId);
    if (!job || job.status !== 'ACTIVE') {
        console.log(`[AI Scheduler] Job ${jobId} not active, skipping.`);
        return;
    }

    console.log(`[AI Scheduler] Executing job "${job.name}"...`);

    // Create run record
    const run = new AIJobRun({
        jobId: job._id,
        status: 'RUNNING',
        startedAt: new Date()
    });
    await run.save();

    try {
        // Generate newsletter content using AI
        const content = await generateNewsletterContent(job.config.systemPrompt, job.config.aiModel);

        if (!content) {
            throw new Error('AI generation returned no content');
        }

        // Create newsletter
        const newsletter = new Newsletter({
            title: content.title || `AI Newsletter - ${new Date().toLocaleDateString()}`,
            html_content: content.html_content,
            text_content: content.text_content,
            status: job.config.autoSend ? 'SCHEDULED' : 'DRAFT',
            is_ai_generated: true,
            scheduled_at: job.config.autoSend ? new Date() : null
        });
        await newsletter.save();

        if (job.config.autoSend) {
            console.log(`[AI Scheduler] Auto-sending newsletter ${newsletter._id}`);
            const stats = await sendNewsletter(newsletter._id);

            run.sent = true;
            run.recipientCount = stats.sent;
            newsletter.status = 'SENT';
            newsletter.sent_at = new Date();
            await newsletter.save();
        }

        run.generated = true;
        run.newsletterId = newsletter._id;
        run.status = 'SUCCESS';
        run.completedAt = new Date();

        // Update job stats
        job.stats.totalRuns++;
        job.stats.successCount++;
        job.stats.lastRunAt = new Date();
        job.stats.nextRunAt = job.calculateNextRun();

        console.log(`[AI Scheduler] Job "${job.name}" completed. Newsletter: ${newsletter._id}`);

    } catch (err) {
        console.error(`[AI Scheduler] Job "${job.name}" failed:`, err);

        run.status = 'FAILED';
        run.error = err.message;
        run.completedAt = new Date();

        job.stats.totalRuns++;
        job.stats.failureCount++;
        job.stats.lastRunAt = new Date();
        job.stats.nextRunAt = job.calculateNextRun();

        // Mark job as failed after 3 consecutive failures
        const recentRuns = await AIJobRun.find({ jobId: job._id })
            .sort({ createdAt: -1 })
            .limit(3);

        if (recentRuns.length >= 3 && recentRuns.every(r => r.status === 'FAILED')) {
            job.status = 'FAILED';
            console.log(`[AI Scheduler] Job "${job.name}" marked as FAILED after 3 failures.`);
        }
    }

    await run.save();
    await job.save();
}

/**
 * Reload scheduler (called after job changes)
 */
async function reloadScheduler() {
    console.log('[AI Scheduler] Reloading...');
    await initScheduler();
}

/**
 * Manually trigger a job (for testing)
 */
async function triggerJob(jobId) {
    console.log(`[AI Scheduler] Manual trigger for job ${jobId}`);
    await executeJob(jobId);
}

module.exports = {
    initScheduler,
    reloadScheduler,
    triggerJob
};
