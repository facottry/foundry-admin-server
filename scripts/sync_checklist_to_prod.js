const mongoose = require('mongoose');
const ChecklistItem = require('../models/ChecklistItem');

require('dotenv').config();

async function syncChecklistToProduction() {
    let localConn, prodConn;

    try {
        // Connect to LOCAL MongoDB
        const localUri = process.env.MONGO_URI;
        const prodUri = process.env.PROD_MONGO_URI;

        if (!prodUri) {
            console.error('❌ Error: PROD_MONGO_URI environment variable not set');
            process.exit(1);
        }

        console.log('🔌 Connecting to LOCAL MongoDB...');
        localConn = await mongoose.createConnection(localUri).asPromise();
        console.log('✅ Connected to LOCAL database');

        console.log('🔌 Connecting to PRODUCTION MongoDB...');
        prodConn = await mongoose.createConnection(prodUri).asPromise();
        console.log('✅ Connected to PRODUCTION database');

        // Get models from both connections
        const LocalChecklistItem = localConn.model('ChecklistItem', ChecklistItem.schema);
        const ProdChecklistItem = prodConn.model('ChecklistItem', ChecklistItem.schema);

        // Read all items from local
        console.log('\n📖 Reading checklist items from LOCAL database...');
        const localItems = await LocalChecklistItem.find();
        console.log(`✓ Found ${localItems.length} items in local database`);

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        // Sync to production
        console.log('\n📤 Syncing to PRODUCTION database...\n');
        for (const localItem of localItems) {
            try {
                const existing = await ProdChecklistItem.findOne({
                    category: localItem.category,
                    phase: localItem.phase,
                    itemKey: localItem.itemKey
                });

                if (existing) {
                    // Update existing item
                    await ProdChecklistItem.findByIdAndUpdate(existing._id, {
                        detail: localItem.detail,
                        status: localItem.status,
                        progress: localItem.progress,
                        repos: localItem.repos,
                        inactive: localItem.inactive
                    });
                    console.log(`↻ Updated ${localItem.category} > ${localItem.phase} > ${localItem.itemKey}`);
                    updatedCount++;
                } else {
                    // Insert new item
                    await ProdChecklistItem.create({
                        category: localItem.category,
                        phase: localItem.phase,
                        itemKey: localItem.itemKey,
                        detail: localItem.detail,
                        status: localItem.status,
                        progress: localItem.progress,
                        repos: localItem.repos,
                        inactive: localItem.inactive
                    });
                    console.log(`✓ Inserted ${localItem.category} > ${localItem.phase} > ${localItem.itemKey}`);
                    insertedCount++;
                }
            } catch (error) {
                console.error(`✗ Error syncing ${localItem.category} > ${localItem.phase} > ${localItem.itemKey}:`, error.message);
                skippedCount++;
            }
        }

        console.log(`\n✅ Sync complete!`);
        console.log(`   Inserted: ${insertedCount} items`);
        console.log(`   Updated: ${updatedCount} items`);
        console.log(`   Errors: ${skippedCount} items`);

    } catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    } finally {
        if (localConn) await localConn.close();
        if (prodConn) await prodConn.close();
    }
}

syncChecklistToProduction();
