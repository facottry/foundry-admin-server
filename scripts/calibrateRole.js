const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const DB_URI = process.env.MONGO_URI_LOCAL || 'mongodb://127.0.0.1:27017/clicktory_database';

console.log('--- User Role Calibration Script ---');
console.log(`Connecting to: ${DB_URI}`);

mongoose.connect(DB_URI)
    .then(async () => {
        console.log('Connected to DB');
        console.log(`Target DB: ${mongoose.connection.name}`);

        try {
            console.log('Starting User Role Calibration...');
            console.log("Setting all users' role to 'FOUNDER'...");

            const result = await User.updateMany({}, { $set: { role: 'FOUNDER' } });

            console.log(`Calibration Complete.`);
            console.log(`Matched (Total Users): ${result.matchedCount}`);
            console.log(`Modified (Updated Users): ${result.modifiedCount}`);

        } catch (err) {
            console.error('Migration Failed:', err);
        } finally {
            mongoose.disconnect();
            console.log('Disconnected');
            process.exit(0);
        }
    })
    .catch(err => {
        console.error('DB Connection Error:', err);
        process.exit(1);
    });
