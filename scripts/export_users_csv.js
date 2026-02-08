const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

const EXPORT_DIR = path.join(__dirname, '../exports');
const OUTPUT_FILE = path.join(EXPORT_DIR, `users_export_${Date.now()}.csv`);

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database')
    .then(async () => {
        console.log('Connected to DB');
        console.log(`DB Name: ${mongoose.connection.name}`);
        console.log(`Host: ${mongoose.connection.host}`);

        try {
            if (!fs.existsSync(EXPORT_DIR)) {
                fs.mkdirSync(EXPORT_DIR, { recursive: true });
            }

            const users = await User.find({}, 'name email role created_at');
            console.log(`Found ${users.length} users.`);

            if (users.length === 0) {
                console.log('No users found.');
                return;
            }

            // CSV Header
            const header = 'ID,Name,Email,Role,Created At\n';
            let csvContent = header;

            users.forEach(user => {
                const id = user._id.toString();
                // Escape quotes in name
                const name = user.name ? `"${user.name.replace(/"/g, '""')}"` : '';
                const email = user.email || '';
                const role = user.role || '';
                const createdAt = user.created_at ? new Date(user.created_at).toISOString() : '';

                csvContent += `${id},${name},${email},${role},${createdAt}\n`;
            });

            fs.writeFileSync(OUTPUT_FILE, csvContent);
            console.log(`Successfully exported ${users.length} users to ${OUTPUT_FILE}`);

        } catch (err) {
            console.error('Export Failed:', err);
        } finally {
            mongoose.disconnect();
            console.log('Disconnected');
        }
    })
    .catch(err => console.error('DB Connection Error:', err));
