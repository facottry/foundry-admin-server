const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed, assuming run from adminserver root

// Model Definition (lightweight version matching current schema)
const PersonalitySchema = new mongoose.Schema({
    name: String,
    type: { type: String, enum: ['REX', 'AIRA'], default: 'REX' },
    isActive: Boolean
});
const Personality = mongoose.model('Personality', PersonalitySchema);

const run = async () => {
    try {
        console.log('Connecting to DB...', process.env.MONGO_URI || process.env.MONGO_URI_LOCAL);
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URI_LOCAL || 'mongodb://127.0.0.1:27017/foundry');
        console.log('Connected.');

        // 1. Fix AIRA
        const aira = await Personality.findOne({ name: 'AIRA' });
        if (aira) {
            console.log(`Found AIRA (Current Type: ${aira.type}). Updating to AIRA...`);
            aira.type = 'AIRA';
            await aira.save();
            console.log('AIRA updated.');
        } else {
            console.log('AIRA persona not found.');
        }

        // 2. Fix Default REX types (if any are missing)
        const rexes = await Personality.find({ name: { $regex: /REX/i } });
        for (const rex of rexes) {
            if (rex.type !== 'REX') {
                console.log(`Fixing REX: ${rex.name} (was ${rex.type})`);
                rex.type = 'REX';
                await rex.save();
            }
        }
        console.log('REX check complete.');

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
