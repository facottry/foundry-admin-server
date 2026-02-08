# Checklist Sync Guide

## Syncing Local DB → Production DB

### Prerequisites

1. Local MongoDB running with checklist data
2. Production `PROD_MONGO_URI` environment variable

### Run Sync

```bash
cd clicktory/adminserver

# Set production MongoDB URI
export PROD_MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/clicktory"

# Run sync script
node scripts/sync_checklist_to_prod.js
```

The script will:
- Connect to both LOCAL and PRODUCTION databases
- Read all items from local
- Insert new items or update existing items in production

**Safe to re-run**: Existing items are updated, not duplicated.

## Expected Output

```
🔌 Connecting to LOCAL MongoDB...
✅ Connected to LOCAL database
🔌 Connecting to PRODUCTION MongoDB...
✅ Connected to PRODUCTION database

📖 Reading checklist items from LOCAL database...
✓ Found 101 items in local database

📤 Syncing to PRODUCTION database...

✓ Inserted Product > Phase_1_Foundation > Listing
↻ Updated Product > Phase_1_Foundation > Categories
...

✅ Sync complete!
   Inserted: 50 items
   Updated: 51 items
   Errors: 0 items
```

## Verification

After sync:
1. Access production admin: `https://your-domain/checklist.html`
2. Login to admin portal
3. Verify all checklist items display correctly

## Alternative: Initial Seeding from JSON

If you need to seed from JSON file instead:
```bash
node scripts/migrate_checklist_to_mongo.js
```

