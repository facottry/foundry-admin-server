/**
 * Seed RBAC Admins Script
 * 
 * Creates 3 admin accounts with specific permissions.
 * Idempotent: re-running updates permissions if admin exists.
 * 
 * Usage: node seedScripts/seed_rbac_admins.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Admin accounts to seed with specific permissions
const ADMINS_TO_CREATE = [
    {
        name: 'Rochak',
        email: 'rochak@gmail.com',
        password: 'CLICK@admin2026',
        role: 'ADMIN',
        permissions: [
            'FOUNDERS_VIEW',
            'PRODUCTS_VIEW',
            'PRODUCTS_EDIT',
            'MESSAGES_VIEW'
        ]
    },
    {
        name: 'Shobhit',
        email: 'shobhit@gmail.com',
        password: 'CLICK@admin2026',
        role: 'ADMIN',
        permissions: [
            'SERVER_HEALTH_VIEW',
            'SERVER_HEALTH_EDIT',
            'AI_JOBS_EDIT'
        ]
    },
    {
        name: 'Vivek',
        email: 'vivek@gmail.com',
        password: 'CLICK@admin2026',
        role: 'ADMIN',
        permissions: [
            'IMAGEMANAGER_EDIT',
            'NEWSLETTER_EDIT',
            'PRODUCTS_VIEW'
        ]
    }
];

async function seedRBACAdmins() {
    console.log('[SEED RBAC ADMINS] Starting...\n');

    const db = process.env.MONGO_URI_LOCAL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database';

    try {
        await mongoose.connect(db);
        console.log('[SEED RBAC ADMINS] Connected to MongoDB\n');
    } catch (err) {
        console.error('[SEED RBAC ADMINS] MongoDB connection failed:', err.message);
        process.exit(1);
    }

    let created = 0;
    let updated = 0;

    for (const adminData of ADMINS_TO_CREATE) {
        const emailLower = adminData.email.toLowerCase();

        // Check if admin already exists
        let existing = await Admin.findOne({ email: emailLower });

        if (existing) {
            // Update permissions if admin exists
            existing.permissions = adminData.permissions;
            existing.role = adminData.role;
            await existing.save();
            console.log(`[UPDATED] ${emailLower} - Permissions: ${adminData.permissions.join(', ')}`);
            updated++;
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
            permissions: adminData.permissions,
            isActive: true,
            createdAt: new Date()
        });

        await admin.save();
        console.log(`[CREATED] ${emailLower} - Role: ${adminData.role} - Permissions: ${adminData.permissions.join(', ')}`);
        created++;
    }

    console.log('\n[SEED RBAC ADMINS] Complete.');
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total:   ${ADMINS_TO_CREATE.length}`);

    await mongoose.disconnect();
    console.log('\n[SEED RBAC ADMINS] Disconnected from MongoDB');
    process.exit(0);
}

// Run
seedRBACAdmins().catch(err => {
    console.error('[SEED RBAC ADMINS] Fatal error:', err);
    process.exit(1);
});
