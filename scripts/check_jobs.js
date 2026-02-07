const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const AIJob = require('../models/AIJob');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foundry')
    .then(async () => {
        console.log('Connected to DB');
        const jobs = await AIJob.find({});
        console.log('Jobs:', JSON.stringify(jobs.map(j => ({ id: j._id, name: j.name, status: j.status })), null, 2));
        mongoose.disconnect();
    })
    .catch(err => console.error(err));
