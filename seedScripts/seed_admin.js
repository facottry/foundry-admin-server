/**
 * Admin Seed Script
 * 
 * Creates 3 ADMIN accounts with various permissions.
 * Idempotent: re-running updates existing admins.
 * 
 * Usage: node seedScripts/seed_admin.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Admin accounts to seed with specific permissions
const ADMINS_TO_CREATE = [
    {
        name: 'Shobhit',
        email: 'shobhit@gmail.com',
        password: 'CLICK@admin2026',
        role: 'ADMIN',
        permissions: [
            'DASHBOARD_EDIT',
            'FOUNDERS_EDIT',
            'PRODUCTS_EDIT',
            'MESSAGES_EDIT',
            'DASHBOARD_VIEW'
        ]
    },
    {
        name: 'Rochak',
        email: 'rochak@gmail.com',
        password: 'CLICK@admin2026',
        role: 'ADMIN',
        permissions: [
            'FOUNDERS_VIEW',
            'PRODUCTS_VIEW',
            'PRODUCTS_EDIT',
            'MESSAGES_VIEW',
            'DASHBOARD_VIEW'
        ]
    },
    {
        name: 'Vivek',
        email: 'vivek@gmail.com',
        password: 'CLICK@admin2026',
        role: 'ADMIN',
        permissions: [
            'IMAGEMANAGER_VIEW',
            'IMAGEMANAGER_EDIT',
            'NEWSLETTER_EDIT',
            'PRODUCTS_VIEW',
            'BOT_PERSONALITIES_EDIT'
        ]
    }
];

async function seedAdmins() {
    console.log('[SEED ADMIN] Starting admin seed process...\n');

    // Connect to MongoDB
    // PRIORITY: Use MONGO_URI to match server.js configuration
    const db = process.env.MONGO_URI || process.env.MONGO_URI_LOCAL;

    console.log(`[SEED ADMIN] Connecting to: ${db.split('@')[1] || 'Localhost/Unknown'}`);


    try {
        await mongoose.connect(db);
        console.log('[SEED ADMIN] Connected to MongoDB\n');
    } catch (err) {
        console.error('[SEED ADMIN] MongoDB connection failed:', err.message);
        process.exit(1);
    }

    let created = 0;
    let updated = 0;

    for (const adminData of ADMINS_TO_CREATE) {
        const emailLower = adminData.email.toLowerCase();

        // Check if admin already exists
        const existing = await Admin.findOne({ email: emailLower });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminData.password, salt);

        if (existing) {
            // Update existing admin
            existing.name = adminData.name;
            existing.role = adminData.role;
            existing.permissions = adminData.permissions;
            existing.passwordHash = passwordHash;
            existing.isActive = true;
            await existing.save();
            console.log(`[UPDATED] ${emailLower} - Role: ${adminData.role} - Permissions: ${adminData.permissions.join(', ')}`);
            updated++;
        } else {
            // Create new admin
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
    }

    console.log('\n[SEED ADMIN] Seed complete.');
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
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
