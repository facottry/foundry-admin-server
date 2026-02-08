const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const SystemConfig = require('../models/SystemConfig');

const db = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database';

const run = async () => {
    try {
        await mongoose.connect(db);
        console.log('MongoDB Connected');

        const configs = await SystemConfig.find({});
        console.log('Configs Found:', configs.length);
        console.log(JSON.stringify(configs, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
