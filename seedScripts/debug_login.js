
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const EMAIL = 'rochak@gmail.com';
const PASSWORD = 'CLICK@admin2026';

async function testLogin() {
    console.log('--- TESTING MANUAL LOGIN ---');
    console.log(`Target Email: ${EMAIL}`);
    console.log(`Input Password: ${PASSWORD}`);

    try {
        const db = process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;
        console.log(`Connecting to: ${db.split('@')[1] || 'Local'}`);
        await mongoose.connect(db);
        console.log('Connected to DB');

        const admin = await Admin.findOne({ email: EMAIL });
        if (!admin) {
            console.log('❌ Admin not found in DB');
            process.exit(0);
        }

        console.log(`✅ Admin found: ${admin.email}`);
        console.log(`Stored Hash: ${admin.passwordHash}`);

        // Test explicit comparison
        const isMatch = await bcrypt.compare(PASSWORD, admin.passwordHash);
        console.log(`bcrypt.compare result: ${isMatch}`);

        if (isMatch) {
            console.log('✅ PASSWORD IS CORRECT');
        } else {
            console.log('❌ PASSWORD IS INCORRECT');

            // Debug: hash the password fresh and compare format
            const freshHash = await bcrypt.hash(PASSWORD, 10);
            console.log(`Fresh Hash of input: ${freshHash}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

testLogin();
