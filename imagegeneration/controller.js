const ImageJob = require('./model');
const services = require('./services');

// Model configuration - maps ENV to display
const MODEL_CONFIG = [
    { key: 'DALLE', envKey: 'ENABLE_IMAGE_DALLE', label: 'DALLE (1X)', cost: 1 },
    { key: 'GPTIMAGE', envKey: 'ENABLE_IMAGE_GPTIMAGE', label: 'GPTIMAGE (2X)', cost: 2 },
    { key: 'GPTIMAGE_HD', envKey: 'ENABLE_IMAGE_GPTIMAGE_HD', label: 'GPTIMAGE HD (8X)', cost: 8 },
    { key: 'MIDJOURNEY', envKey: 'ENABLE_IMAGE_MIDJOURNEY', label: 'MIDJOURNEY (4X)', cost: 4 },
    { key: 'SDXL', envKey: 'ENABLE_IMAGE_SDXL', label: 'SDXL (6X)', cost: 6 }
];

// GET /models - Returns enabled models for frontend
exports.getEnabledModels = async (req, res) => {
    try {
        const enabledModels = MODEL_CONFIG
            .filter(m => process.env[m.envKey] === 'true')
            .sort((a, b) => a.cost - b.cost)
            .map(m => ({ key: m.key, label: m.label, cost: m.cost }));

        res.json({ success: true, data: enabledModels });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// POST /enhance-prompt
exports.enhancePrompt = async (req, res) => {
    try {
        const { intent, prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const finalPrompt = await services.enhancePrompt(intent || '', prompt);
        res.json({ finalPrompt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /execute-prompt
exports.executePrompt = async (req, res) => {
    try {
        const { intent, rawPrompt, finalPrompt, imageCount, size, modelKey } = req.body;

        if (!finalPrompt) return res.status(400).json({ error: 'Final prompt is required' });

        // Validate model key against enabled models
        const enabledKeys = MODEL_CONFIG
            .filter(m => process.env[m.envKey] === 'true')
            .map(m => m.key);

        if (enabledKeys.length === 0) {
            return res.status(400).json({ error: 'No image models are enabled' });
        }

        const selectedModel = modelKey && enabledKeys.includes(modelKey)
            ? modelKey
            : enabledKeys[0]; // Default to lowest cost enabled

        const count = Math.min(Math.max(parseInt(imageCount) || 1, 1), 5); // Clamp 1-5

        const job = await ImageJob.create({
            intent: intent || 'Global',
            rawPrompt: rawPrompt || '',
            finalPrompt,
            imageCount: count,
            size: size || '1024x1024',
            modelKey: selectedModel,
            status: 'QUEUED'
        });

        res.json({
            jobId: job._id,
            status: job.status
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /job-status/:jobId
exports.jobStatus = async (req, res) => {
    try {
        const job = await ImageJob.findById(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        res.json({
            jobId: job._id,
            status: job.status,
            cdnUrls: job.cdnUrls,
            error: job.error
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /job-list
exports.jobList = async (req, res) => {
    try {
        let { from, to } = req.query;

        // Constants
        const MIN_DATE = new Date('2026-01-01T00:00:00.000Z');
        const MAX_RANGE_DAYS = 30;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        // Parse dates
        let fromDate = from ? new Date(from) : null;
        let toDate = to ? new Date(to) : null;

        // Validation Helper
        const isValidRange = () => {
            if (!fromDate || !toDate) return false;
            if (isNaN(fromDate) || isNaN(toDate)) return false;
            if (fromDate < MIN_DATE) return false; // Before 1 Jan 2026
            if (toDate > todayEnd) return false; // Future date
            if (fromDate > toDate) return false; // From after To
            const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
            if (diffDays > MAX_RANGE_DAYS) return false; // More than 30 days
            return true;
        };

        // Apply fallback if invalid
        if (!isValidRange()) {
            fromDate = today;
            toDate = todayEnd;
        } else {
            // Normalize to start/end of day
            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(23, 59, 59, 999);
        }

        const jobs = await ImageJob.find({
            createdAt: { $gte: fromDate, $lte: toDate }
        }).sort({ createdAt: -1 }).limit(100);

        res.json({
            success: true,
            data: jobs.map(j => ({
                jobId: j._id,
                intent: j.intent,
                status: j.status,
                cdnUrls: j.cdnUrls,
                error: j.error,
                createdAt: j.createdAt,
                finalPrompt: j.finalPrompt,
                size: j.size,
                imageCount: j.imageCount,
                modelKey: j.modelKey
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// DELETE /job/:jobId
exports.deleteJob = async (req, res) => {
    try {
        const job = await ImageJob.findByIdAndDelete(req.params.jobId);
        if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

        res.json({ success: true, message: 'Job deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
