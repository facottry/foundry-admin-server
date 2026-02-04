const ServerHealth = require('../models/ServerHealth');

const serverHealthMonitor = async (req, res, next) => {
    const start = Date.now();

    // Hook into response finish
    res.on('finish', async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const isSuccess = res.statusCode < 400;

            if (!isSuccess) {
                const fs = require('fs');
                const path = require('path');
                const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode}\n`;
                const logPath = path.join(__dirname, '../logs/failed_requests.log');

                fs.appendFile(logPath, logEntry, (err) => {
                    if (err) console.error('Failed to write to request log', err);
                });
            }

            await ServerHealth.findOneAndUpdate(
                { date: today, server: 'adminserver' },
                {
                    $inc: {
                        hits: 1,
                        success: isSuccess ? 1 : 0,
                        fail: isSuccess ? 0 : 1
                    }
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('Failed to update server health stats:', err);
        }
    });

    next();
};

module.exports = serverHealthMonitor;
