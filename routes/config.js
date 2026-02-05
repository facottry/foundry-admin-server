const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');
const auth = require('../middleware/auth');
const { reloadScheduler } = require('../cron/aiScheduler');

// GET Generic Config (All or Specific)
router.get('/', auth(['ADMIN']), async (req, res) => {
    try {
        const configs = await SystemConfig.find({});
        const configMap = {};
        configs.forEach(c => {
            configMap[c.key] = c.value;
        });
        res.json(configMap);
    } catch (error) {
        console.error('Get All Config Error:', error);
        res.status(500).json({ error: 'Failed to fetch configs' });
    }
});

// SAVE Generic Config (Key-Value)
router.post('/', auth(['ADMIN']), async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: 'Key is required' });

        await SystemConfig.findOneAndUpdate(
            { key },
            { value, updated_at: new Date() },
            { upsert: true, new: true }
        );

        res.json({ success: true, key, value });
    } catch (error) {
        console.error('Save Generic Config Error:', error);
        res.status(500).json({ error: 'Failed to save config' });
    }
});

// GET AI Config
router.get('/ai', auth(['ADMIN']), async (req, res) => {
    try {
        let config = await SystemConfig.findOne({ key: 'AI_NEWSLETTER_CONFIG' });
        if (!config) {
            // Return default structure if not found
            return res.json({
                enabled: false,
                schedules: [
                    { cron: '0 10 * * *', label: 'Daily Morning', model: 'gemini-1.5-flash', topic: 'General Tech Trends' }
                ]
            });
        }
        res.json(config.value);
    } catch (error) {
        console.error('Get Config Error:', error);
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

// SAVE AI Config
router.put('/ai', auth(['ADMIN']), async (req, res) => {
    try {
        const { enabled, schedules } = req.body;

        // Validation could go here (check cron validity, etc.)

        const value = { enabled, schedules };

        await SystemConfig.findOneAndUpdate(
            { key: 'AI_NEWSLETTER_CONFIG' },
            { value, updated_at: new Date() },
            { upsert: true, new: true }
        );

        // Reload Scheduler
        await reloadScheduler();

        res.json({ message: 'Configuration saved and scheduler reloaded.', config: value });
    } catch (error) {
        console.error('Save Config Error:', error);
        res.status(500).json({ error: 'Failed to save config' });
    }
});

module.exports = router;
