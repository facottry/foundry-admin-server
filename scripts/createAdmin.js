const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const User = require('../models/User');

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        const db = process.env.MONGO_URI || 'mongodb://localhost:27017/foundry';
        await mongoose.connect(db);
        console.log('MongoDB Connected');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@foundry.io' });
        if (existingAdmin) {
            console.log('Admin user already exists!');
            console.log('Email: admin@foundry.io');
            process.exit(0);
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash('admin123', salt); // Change this password!

        const adminUser = new User({
            name: 'Admin User',
            email: 'admin@foundry.io',
            password_hash,
            role: 'ADMIN'
        });

        await adminUser.save();

        console.log('✅ Admin user created successfully!');
        console.log('-----------------------------------');
        console.log('Email: admin@foundry.io');
        console.log('Password: admin123');
        console.log('-----------------------------------');
        console.log('⚠️  IMPORTANT: Change this password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();
