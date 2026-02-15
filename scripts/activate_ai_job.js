const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const AIJob = require('../models/AIJob');

async function activateJob(jobId) {
    if (!jobId) {
        console.error('❌ Error: Job ID is required');
        console.log('\nUsage: node activate_ai_job.js <job_id>');
        console.log('Example: node activate_ai_job.js 69850a792060b20ac5cce758\n');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database');
        console.log('✓ Connected to MongoDB\n');

        const job = await AIJob.findById(jobId);

        if (!job) {
            console.error(`❌ Job with ID ${jobId} not found.`);
            console.log('\n💡 Run check_ai_jobs.js to see all available jobs.\n');
            await mongoose.disconnect();
            process.exit(1);
        }

        console.log(`📝 Job: ${job.name}`);
        console.log(`   Current Status: ${job.status}`);

        if (job.status === 'ACTIVE') {
            console.log('\n✓ Job is already ACTIVE. No changes made.\n');
        } else {
            job.status = 'ACTIVE';
            job.stats.nextRunAt = job.calculateNextRun();
            await job.save();

            console.log(`\n✅ Job activated successfully!`);
            console.log(`   New Status: ACTIVE`);
            if (job.stats.nextRunAt) {
                console.log(`   Next Run: ${job.stats.nextRunAt.toLocaleString()}`);
            }
            console.log('\n⚠️  Important: Restart adminserver for changes to take effect.');
            console.log('   The scheduler loads jobs on startup.\n');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

const jobId = process.argv[2];
activateJob(jobId);
