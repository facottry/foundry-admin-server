
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const AIJob = require('../models/AIJob');

// Fix for cron-parser import behavior in model (if not already loaded by app)
// We need to ensure the model uses the correct import.
// Since we are loading the model file, it should have the fix I applied.

async function fixJobs() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const jobs = await AIJob.find({});
        console.log(`Found ${jobs.length} jobs`);

        for (const job of jobs) {
            console.log(`Processing job: ${job.name} (${job.schedule.frequency})`);

            const nextRun = job.calculateNextRun();
            console.log('Calculated next run:', nextRun);

            if (nextRun) {
                job.stats.nextRunAt = nextRun;
                await job.save();
                console.log('Saved job');
            } else {
                console.log('Could not calculate next run');
            }
        }

        console.log('Done');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

fixJobs();
