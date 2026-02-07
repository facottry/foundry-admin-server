/**
 * Daily Product Report Cron Job
 * 
 * Runs every day at 9:00 AM server time
 * Sends daily summary email with products approved yesterday
 * 
 * Cron Expression: 0 9 * * *
 */

const cron = require('node-cron');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendEmail } = require('../email-engine');

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://clicktory.io';
const ADMIN_REPORT_EMAIL = process.env.ADMIN_REPORT_EMAIL || process.env.APP_EMAIL;

/**
 * Generates HTML list of top products
 * @param {Array} products - Array of product objects
 * @returns {string} - HTML list
 */
function generateTopProductsHtml(products) {
    if (!products || products.length === 0) {
        return '<p style="margin: 0; font-size: 14px; color: #6b7280;">No products approved yesterday</p>';
    }

    return products.map((product, index) => `
        <p style="margin: 8px 0; font-size: 14px; color: #374151;">
            <strong>${index + 1}.</strong> ${product.name}
        </p>
    `).join('');
}

/**
 * Run daily report logic
 * Can be called directly for testing
 */
async function runDailyReport() {
    try {
        console.log('[DAILY REPORT CRON] Starting daily product report...');

        // Get yesterday's date range
        const now = new Date();
        const yesterdayStart = new Date(now);
        yesterdayStart.setDate(now.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);

        const yesterdayEnd = new Date(now);
        yesterdayEnd.setDate(now.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);

        // Count products approved yesterday
        const approvedYesterday = await Product.find({
            status: 'approved',
            updated_at: {
                $gte: yesterdayStart,
                $lte: yesterdayEnd
            }
        }).sort({ updated_at: -1 });

        const count = approvedYesterday.length;

        // Get top 3 products
        const topProducts = approvedYesterday.slice(0, 3);
        const topProductsHtml = generateTopProductsHtml(topProducts);

        // Format date for email
        const dateStr = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Send email to admin
        await sendEmail({
            templateKey: 'DAILY_PRODUCT_REPORT',
            to: ADMIN_REPORT_EMAIL,
            data: {
                count: count.toString(),
                topProducts: topProductsHtml,
                date: dateStr
            }
        });

        console.log(`[DAILY REPORT CRON] Report sent. ${count} products approved yesterday.`);
    } catch (err) {
        console.error('[DAILY REPORT CRON] Error:', err.message);
        // Failure logged only, does not throw
    }
}

/**
 * Initialize cron job
 * Schedule: 0 9 * * * (9:00 AM every day)
 */
function initDailyReportCron() {
    // Hardcoded cron: 0 9 * * * (9:00 AM server time)
    cron.schedule('0 9 * * *', () => {
        console.log('[DAILY REPORT CRON] Triggered at 9:00 AM');
        runDailyReport();
    }, {
        timezone: 'Asia/Kolkata' // Adjust as needed
    });

    console.log('[DAILY REPORT CRON] Scheduled for 9:00 AM daily');
}

module.exports = { initDailyReportCron, runDailyReport };
