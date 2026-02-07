const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Subscriber = require('../models/Subscriber');

// Connect to DB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foundry')
    .then(async () => {
        console.log('Connected to DB');
        console.log(`DB Name: ${mongoose.connection.name}`);
        console.log(`Host: ${mongoose.connection.host}`);

        try {
            const count = await Subscriber.countDocuments({});
            console.log(`Total Subscribers: ${count}`);

            const active = await Subscriber.countDocuments({ status: 'ACTIVE' });
            console.log(`Active Subscribers: ${active}`);

            console.log(`Active Subscribers: ${active}`);

            const activeSubs = await Subscriber.find({ status: 'ACTIVE' });
            console.log('Active Subscribers List:');
            const { decrypt } = require('../utils/encryption');

            // ... inside main loop ...
            activeSubs.forEach(sub => {
                const decrypted = decrypt(sub.email_encrypted);
                console.log(`- ID: ${sub._id}, Status: ${sub.status}, Decrypted: ${decrypted ? decrypted : 'FAILED'}`);
            });

        } catch (err) {
            console.error(err);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.error('DB Connection Error:', err));
