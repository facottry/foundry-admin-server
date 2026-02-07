
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const AIJob = require('../models/AIJob');
const AIJobRun = require('../models/AIJobRun');
const Newsletter = require('../models/Newsletter');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const job = await AIJob.findOne({}).sort({ updatedAt: -1 });
        if (!job) {
            console.log('No job found');
            process.exit(0);
        }

        console.log('Job:', job.name);
        console.log('Config:', job.config);
        console.log('AutoSend:', job.config.autoSend);

        const lastRun = await AIJobRun.findOne({ jobId: job._id }).sort({ createdAt: -1 });
        if (!lastRun) {
            console.log('No runs found');
        } else {
            console.log('Last Run Status:', lastRun.status);
            console.log('Generated:', lastRun.generated);
            console.log('Sent:', lastRun.sent);
            console.log('Error:', lastRun.error);
            console.log('Recipient Count:', lastRun.recipientCount);

            if (lastRun.newsletterId) {
                const newsletter = await Newsletter.findById(lastRun.newsletterId);
                console.log('Newsletter Status:', newsletter ? newsletter.status : 'Not found');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
