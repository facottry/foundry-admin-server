/**
 * Admin Seed Script
 * 
 * Creates initial admin accounts in the admins collection.
 * Idempotent: re-running skips existing admins.
 * 
 * Usage: node seedScripts/seed_admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Admin accounts to seed
const ADMINS_TO_CREATE = [
    {
        name: 'Admin NV',
        email: 'nvnjwl@gmail.com',
        password: 'CLICK@admin2026',
        role: 'SUPER_ADMIN'
    },
    {
        name: 'Admin NV2',
        email: 'nvnjwl2@gmail.com',
        password: 'CLICK@admin2026',
        role: 'SUPER_ADMIN'
    },
    {
        name: 'Admin Facottry',
        email: 'facottry@gmail.com',
        password: 'CLICK@admin2026',
        role: 'SUPER_ADMIN'
    }
];

async function seedAdmins() {
    console.log('[SEED ADMIN] Starting admin seed process...\n');

    // Connect to MongoDB
    const db = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database';

    try {
        await mongoose.connect(db);
        console.log('[SEED ADMIN] Connected to MongoDB\n');
    } catch (err) {
        console.error('[SEED ADMIN] MongoDB connection failed:', err.message);
        process.exit(1);
    }

    let created = 0;
    let skipped = 0;

    for (const adminData of ADMINS_TO_CREATE) {
        const emailLower = adminData.email.toLowerCase();

        // Check if admin already exists
        const existing = await Admin.findOne({ email: emailLower });

        if (existing) {
            console.log(`[SKIPPED] ${emailLower} - Admin already exists`);
            skipped++;
            continue;
        }

        // Hash password (salt rounds = 10)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminData.password, salt);

        // Create admin
        const admin = new Admin({
            name: adminData.name,
            email: emailLower,
            passwordHash: passwordHash,
            role: adminData.role,
            isActive: true,
            createdAt: new Date()
        });

        await admin.save();
        console.log(`[CREATED] ${emailLower} - Role: ${adminData.role}`);
        created++;
    }

    console.log('\n[SEED ADMIN] Seed complete.');
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total:   ${ADMINS_TO_CREATE.length}`);

    // Disconnect and exit
    await mongoose.disconnect();
    console.log('\n[SEED ADMIN] Disconnected from MongoDB');
    process.exit(0);
}

// Run
seedAdmins().catch(err => {
    console.error('[SEED ADMIN] Fatal error:', err);
    process.exit(1);
});
