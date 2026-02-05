/**
 * Migration Script: Update ImageJob cdnUrls to new R2 public URL format
 * 
 * Replaces old base URL with new public dev URL:
 * OLD: https://21e498b72b5b4c711977ca53dbcdc48e.r2.cloudflarestorage.com/foundrybucket/
 * NEW: https://cdn.clicktory.in
 * 
 * Run: node migrations/migrate-image-urls.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const OLD_BASE_URL = 'https://21e498b72b5b4c711977ca53dbcdc48e.r2.cloudflarestorage.com/foundrybucket';
const NEW_BASE_URL = 'https://cdn.clicktory.in';

const ImageJobSchema = new mongoose.Schema({
    cdnUrls: [String]
}, { strict: false });

const ImageJob = mongoose.model('ImageJob', ImageJobSchema);

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const jobs = await ImageJob.find({ cdnUrls: { $exists: true, $ne: [] } });
        console.log(`Found ${jobs.length} jobs with cdnUrls`);

        let updatedCount = 0;

        for (const job of jobs) {
            let modified = false;
            const newUrls = job.cdnUrls.map(url => {
                if (url && url.includes(OLD_BASE_URL)) {
                    modified = true;
                    return url.replace(OLD_BASE_URL, NEW_BASE_URL);
                }
                return url;
            });

            if (modified) {
                job.cdnUrls = newUrls;
                await job.save();
                updatedCount++;
                console.log(`Updated job ${job._id}`);
            }
        }

        console.log(`\nMigration complete. Updated ${updatedCount} jobs.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
