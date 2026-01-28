const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SystemConfig = require('../models/SystemConfig');
const { sendSuccess, sendError } = require('../utils/response');

// @route   GET /api/admin/config
// @desc    Get all system config
// @access  Admin only
router.get('/', auth(['ADMIN']), async (req, res, next) => {
    try {
        const configs = await SystemConfig.find({});
        // Convert to object for easier frontend consumption
        const configMap = {};
        configs.forEach(c => configMap[c.key] = c.value);
        sendSuccess(res, configMap);
    } catch (err) {
        console.error(err);
        sendError(next, 'SERVER_ERROR', 'Server Error', 500);
    }
});

// @route   POST /api/admin/config
// @desc    Update system config key
// @access  Admin only
router.post('/', auth(['ADMIN']), async (req, res, next) => {
    const { key, value } = req.body;

    if (!key) {
        return sendError(next, 'BAD_REQUEST', 'Key is required', 400);
    }

    try {
        const config = await SystemConfig.findOneAndUpdate(
            { key },
            { $set: { value, updated_at: Date.now() } },
            { new: true, upsert: true }
        );
        sendSuccess(res, config);
    } catch (err) {
        console.error(err);
        sendError(next, 'SERVER_ERROR', 'Server Error', 500);
    }
});

module.exports = router;
