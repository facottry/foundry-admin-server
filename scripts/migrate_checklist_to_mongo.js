const mongoose = require('mongoose');
const ChecklistItem = require('../models/ChecklistItem');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function migrateChecklistToMongoDB() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Read checklist.json (go up from adminserver/scripts to root, then to tools/checklist_v1)
        const checklistPath = path.join(__dirname, '../../../tools/checklist_v1/checklist.json');
        const checklistData = JSON.parse(fs.readFileSync(checklistPath, 'utf8'));

        let insertedCount = 0;
        let skippedCount = 0;

        // Iterate through all categories, phases, and items
        for (const [category, phases] of Object.entries(checklistData)) {
            for (const [phase, items] of Object.entries(phases)) {
                for (const [itemKey, itemData] of Object.entries(items)) {
                    try {
                        // Check if item already exists
                        const existing = await ChecklistItem.findOne({ category, phase, itemKey });

                        if (existing) {
                            console.log(`⊘ Skipping ${category} > ${phase} > ${itemKey} (already exists)`);
                            skippedCount++;
                            continue;
                        }

                        // Create new checklist item
                        await ChecklistItem.create({
                            category,
                            phase,
                            itemKey,
                            detail: itemData.detail || '',
                            status: itemData.status || 'Pending',
                            progress: itemData.progress || 0,
                            repos: itemData.repos || [],
                            inactive: itemData.inactive || false
                        });

                        console.log(`✓ Inserted ${category} > ${phase} > ${itemKey}`);
                        insertedCount++;
                    } catch (error) {
                        console.error(`✗ Error inserting ${category} > ${phase} > ${itemKey}:`, error.message);
                    }
                }
            }
        }

        console.log(`\n✅ Migration complete!`);
        console.log(`   Inserted: ${insertedCount} items`);
        console.log(`   Skipped: ${skippedCount} items`);

        await mongoose.connection.close();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateChecklistToMongoDB();
