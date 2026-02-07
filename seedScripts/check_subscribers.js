
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Subscriber = require('../models/Subscriber');

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await Subscriber.countDocuments({});
        console.log('Total Subscribers:', count);

        const active = await Subscriber.countDocuments({ status: 'subscribed' });
        // Note: verify status enum. Usually 'active' or 'subscribed'.

        const all = await Subscriber.find({});
        console.log('Subscribers:', all);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
