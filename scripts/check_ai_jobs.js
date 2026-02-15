const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const AIJob = require('../models/AIJob');

async function checkJobs() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database');
        console.log('✓ Connected to MongoDB\n');

        const jobs = await AIJob.find({}).sort({ createdAt: -1 });

        console.log(`📊 Total AI Jobs: ${jobs.length}\n`);
        console.log('═'.repeat(80));

        if (jobs.length === 0) {
            console.log('\n⚠️  No AI Jobs found in database.');
            console.log('💡 Run create_daily_newsletter_job.js to create one.\n');
        } else {
            jobs.forEach((job, index) => {
                console.log(`\n[${index + 1}] ${job.name}`);
                console.log(`    ID: ${job._id}`);
                console.log(`    Status: ${getStatusEmoji(job.status)} ${job.status}`);
                console.log(`    Type: ${job.type}`);
                console.log(`    Frequency: ${job.schedule.frequency} ${job.schedule.time ? `at ${job.schedule.time}` : ''}`);
                if (job.schedule.customCron) {
                    console.log(`    Cron: ${job.schedule.customCron}`);
                }
                console.log(`    Auto-Send: ${job.config.autoSend ? '✓ Yes' : '✗ No'}`);
                console.log(`    AI Model: ${job.config.aiModel}`);
                console.log(`    Total Runs: ${job.stats.totalRuns}`);
                console.log(`    Success: ${job.stats.successCount} | Failed: ${job.stats.failureCount}`);
                if (job.stats.lastRunAt) {
                    console.log(`    Last Run: ${job.stats.lastRunAt.toLocaleString()}`);
                }
                if (job.stats.nextRunAt) {
                    console.log(`    Next Run: ${job.stats.nextRunAt.toLocaleString()}`);
                }
                console.log('    ─'.repeat(76));
            });

            const activeJobs = jobs.filter(j => j.status === 'ACTIVE');
            const pausedJobs = jobs.filter(j => j.status === 'PAUSED');
            const failedJobs = jobs.filter(j => j.status === 'FAILED');

            console.log('\n📈 Summary:');
            console.log(`   Active: ${activeJobs.length}`);
            console.log(`   Paused: ${pausedJobs.length}`);
            console.log(`   Failed: ${failedJobs.length}`);

            if (activeJobs.length === 0) {
                console.log('\n⚠️  No ACTIVE jobs! Newsletters will not be sent automatically.');
                console.log('💡 Run activate_ai_job.js <job_id> to activate a job.\n');
            } else {
                console.log(`\n✅ ${activeJobs.length} job(s) will run automatically.\n`);
            }
        }

        console.log('═'.repeat(80));

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

function getStatusEmoji(status) {
    switch (status) {
        case 'ACTIVE': return '🟢';
        case 'PAUSED': return '🟡';
        case 'FAILED': return '🔴';
        default: return '⚪';
    }
}

checkJobs();
