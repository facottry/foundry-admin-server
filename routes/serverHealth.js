const express = require('express');
const router = express.Router();
const ServerHealth = require('../models/ServerHealth');
const requirePermission = require('../middleware/requirePermission');

// @route   GET /api/admin/server-health
// @desc    Get server health statistics
// @access  Private (Admin with SERVER_HEALTH_VIEW permission)
router.get('/', requirePermission('SERVER_HEALTH_VIEW'), async (req, res) => {
    try {
        // Fetch last 30 days of stats, sorted by date desc
        const stats = await ServerHealth.find()
            .sort({ date: -1 })
            .limit(90); // 3 servers * 30 days = 90 records

        res.json(stats);
    } catch (err) {
        console.error('Server Health Stats Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
