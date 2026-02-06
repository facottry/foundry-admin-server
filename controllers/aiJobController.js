const AIJob = require('../models/AIJob');
const AIJobRun = require('../models/AIJobRun');
const { reloadScheduler } = require('../cron/AiScheduler');
const { generateNewsletterContent } = require('../services/aiService');
const sendEmail = require('../utils/sendEmail');

// GET /api/admin/ai-jobs
exports.listJobs = async (req, res) => {
    try {
        const jobs = await AIJob.find().sort({ createdAt: -1 });
        res.json({ success: true, data: jobs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/admin/ai-jobs/:id
exports.getJob = async (req, res) => {
    try {
        const job = await AIJob.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
        res.json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/admin/ai-jobs
exports.createJob = async (req, res) => {
    try {
        const { name, schedule, config, status } = req.body;

        // Validate based on frequency
        if (schedule.frequency === 'CUSTOM') {
            if (!schedule.customCron) {
                return res.status(400).json({ success: false, error: 'Custom CRON expression is required' });
            }
        } else if (!schedule.time) {
            return res.status(400).json({ success: false, error: 'Time is required for Daily/Weekly' });
        }

        if (!name || !schedule?.frequency || !config?.systemPrompt) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const job = new AIJob({
            name,
            type: 'NEWSLETTER',
            status: status || 'PAUSED',
            schedule: {
                frequency: schedule.frequency,
                time: schedule.time,
                dayOfWeek: schedule.dayOfWeek,
                customCron: schedule.customCron,
                timezone: schedule.timezone || 'Asia/Kolkata'
            },
            config: {
                systemPrompt: config.systemPrompt,
                aiModel: config.aiModel || 'gpt-4o-mini',
                autoSend: config.autoSend || false,
                subjectTemplate: config.subjectTemplate || '{{title}}'
            }
        });

        // Calculate next run
        job.stats.nextRunAt = job.calculateNextRun();
        await job.save();

        // Reload scheduler to pick up new job
        reloadScheduler();

        res.status(201).json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// PUT /api/admin/ai-jobs/:id
exports.updateJob = async (req, res) => {
    try {
        const { name, schedule, config, status } = req.body;
        const job = await AIJob.findById(req.params.id);

        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        if (name) job.name = name;
        if (status) job.status = status;

        if (schedule) {
            if (schedule.frequency) job.schedule.frequency = schedule.frequency;
            if (schedule.time) job.schedule.time = schedule.time;
            if (schedule.dayOfWeek !== undefined) job.schedule.dayOfWeek = schedule.dayOfWeek;
            if (schedule.customCron !== undefined) job.schedule.customCron = schedule.customCron;
        }

        if (config) {
            if (config.systemPrompt) job.config.systemPrompt = config.systemPrompt;
            if (config.aiModel) job.config.aiModel = config.aiModel;
            if (config.autoSend !== undefined) job.config.autoSend = config.autoSend;
            if (config.subjectTemplate) job.config.subjectTemplate = config.subjectTemplate;
        }

        // Recalculate next run
        job.stats.nextRunAt = job.calculateNextRun();
        await job.save();

        // Reload scheduler
        reloadScheduler();

        res.json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// DELETE /api/admin/ai-jobs/:id
exports.deleteJob = async (req, res) => {
    try {
        const job = await AIJob.findByIdAndDelete(req.params.id);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        // Delete associated runs
        await AIJobRun.deleteMany({ jobId: req.params.id });

        // Reload scheduler
        reloadScheduler();

        res.json({ success: true, message: 'Job deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/admin/ai-jobs/:id/toggle
exports.toggleJob = async (req, res) => {
    try {
        const job = await AIJob.findById(req.params.id);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        job.status = job.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

        if (job.status === 'ACTIVE') {
            job.stats.nextRunAt = job.calculateNextRun();
        }

        await job.save();

        // Reload scheduler
        reloadScheduler();

        res.json({ success: true, data: job });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/admin/ai-jobs/:id/runs
exports.getJobRuns = async (req, res) => {
    try {
        const runs = await AIJobRun.find({ jobId: req.params.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('newsletterId', 'title slug status');

        res.json({ success: true, data: runs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// GET /api/admin/ai-jobs/runs/:runId/newsletter
exports.getRunNewsletter = async (req, res) => {
    try {
        const run = await AIJobRun.findById(req.params.runId)
            .populate('newsletterId');

        if (!run || !run.newsletterId) {
            return res.status(404).json({ success: false, error: 'Newsletter not found' });
        }

        res.json({ success: true, data: run.newsletterId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/admin/ai-jobs/preview - Generate preview content without saving
exports.previewGenerate = async (req, res) => {
    try {
        const { systemPrompt, aiModel } = req.body;

        if (!systemPrompt) {
            return res.status(400).json({ success: false, error: 'System prompt is required' });
        }

        const content = await generateNewsletterContent(systemPrompt, aiModel || 'gemini-1.5-flash');

        if (!content) {
            return res.status(500).json({ success: false, error: 'AI generation failed' });
        }

        res.json({
            success: true,
            data: {
                title: content.title,
                html_content: content.html_content,
                text_content: content.text_content
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /api/admin/ai-jobs/test-email - Send test email to one recipient
exports.sendTestEmail = async (req, res) => {
    try {
        const { email, subject, html_content, text_content } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email address is required' });
        }

        if (!html_content && !text_content) {
            return res.status(400).json({ success: false, error: 'Content is required' });
        }

        // Send HTML email with text fallback
        await sendEmail(
            email,
            subject || 'Newsletter Preview',
            text_content || html_content.replace(/<[^>]*>/g, ''),
            html_content
        );

        res.json({ success: true, message: `Test email sent to ${email}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

