
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const EMAIL = 'rochak@gmail.com';

async function verifyPermissions() {
    console.log('--- VERIFYING ADMIN PERMISSIONS ---');

    // Connect to MongoDB (Priority: Atlas)
    const db = process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;
    console.log(`Connecting to: ${db.split('@')[1] || 'Localhost/Unknown'}`);

    try {
        await mongoose.connect(db);
        console.log('Connected to DB');

        const admin = await Admin.findOne({ email: EMAIL });
        if (!admin) {
            console.log(`❌ Admin ${EMAIL} not found in DB`);
        } else {
            console.log(`✅ Admin found: ${admin.email}`);
            console.log(`Role: ${admin.role}`);
            console.log('Permissions in DB:');
            console.log(JSON.stringify(admin.permissions, null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

verifyPermissions();
