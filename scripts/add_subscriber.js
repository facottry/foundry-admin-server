const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Subscriber = require('../models/Subscriber');
const { encrypt, hashEmail } = require('../utils/encryption');



mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/foundry')
    .then(async () => {
        console.log('Connected to DB');
        console.log(`DB Name: ${mongoose.connection.name}`);
        console.log(`Host: ${mongoose.connection.host}`);

        const EMAILS_TO_ADD = [
            'nvnjwl@gmail.com',
            'facottry@gmail.com',
            'nvnjwl2@gmail.com',
            'adarsh13082008@gmail.com',
            'soumilj2017@email.iimcal.ac.in',
            'support@brewquant.com',
            'shobhitjas0505@gmail.com',
            'sr2636463@gmail.com',
            'kwikmedisocial@gmail.com',
            'vkumarg22@gmail.com'
        ];

        try {
            for (const email of EMAILS_TO_ADD) {
                const normalizedEmail = email.trim();
                const emailHash = hashEmail(normalizedEmail);

                // Check if exists
                const existing = await Subscriber.findOne({
                    $or: [
                        { email: normalizedEmail },
                        { email_hash: emailHash }
                    ]
                });

                if (existing) {
                    console.log(`[EXISTS] ${normalizedEmail} - ID: ${existing._id}`);
                    if (existing.status !== 'ACTIVE') {
                        console.log(`   -> Updating status from ${existing.status} to ACTIVE`);
                        existing.status = 'ACTIVE';
                        await existing.save();
                        console.log('   -> Updated.');
                    } else {
                        console.log('   -> Already ACTIVE.');
                    }
                } else {
                    console.log(`[NEW] Creating ${normalizedEmail}...`);
                    const sub = new Subscriber({
                        email: normalizedEmail,
                        email_encrypted: encrypt(normalizedEmail),
                        email_hash: emailHash,
                        status: 'ACTIVE',
                        source: 'manual_script'
                    });
                    await sub.save();
                    console.log(`   -> Created Successfully - ID: ${sub._id}`);
                }
            }

        } catch (err) {
            console.error('Error:', err);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.error(err));
