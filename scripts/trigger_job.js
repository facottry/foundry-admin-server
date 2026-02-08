const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { triggerJob } = require('../cron/AiScheduler');

const JOB_ID = '69850a792060b20ac5cce758';

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database')
    .then(async () => {
        console.log('Connected to DB');
        console.log(`DB Name: ${mongoose.connection.name}`);
        console.log(`Host: ${mongoose.connection.host}`);
        const Subscriber = require('../models/Subscriber');
        const count = await Subscriber.countDocuments({ status: 'ACTIVE' });
        console.log(`[trigger_job] Active Subscribers in DB: ${count}`);

        console.log(`Triggering Job: ${JOB_ID}`);

        try {
            await triggerJob(JOB_ID);
            console.log('Job Triggered Successfully');
        } catch (err) {
            console.error('Job Trigger Failed:', err);
        } finally {
            // Wait a bit for pending promises if any (logging)
            setTimeout(() => {
                mongoose.disconnect();
                console.log('Disconnected');
            }, 5000);
        }
    })
    .catch(err => console.error(err));
