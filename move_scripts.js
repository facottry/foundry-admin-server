
const fs = require('fs');
const path = require('path');

const moves = [
    // --- adminserver/scripts ---
    { src: 'adminserver/scripts/README_MIGRATION.md', dest: 'adminserver/docs/migration_guide.md' },
    { src: 'adminserver/scripts/add_subscriber.js', dest: 'adminserver/scripts/analytics/add_subscriber.js' },
    { src: 'adminserver/scripts/calibrateRole.js', dest: 'adminserver/scripts/db/maintenance/calibrateRole.js' },
    { src: 'adminserver/scripts/check_jobs.js', dest: 'adminserver/scripts/debug/check_jobs.js' },
    { src: 'adminserver/scripts/check_subscribers.js', dest: 'adminserver/scripts/debug/check_subscribers.js' },
    { src: 'adminserver/scripts/debug_config.js', dest: 'adminserver/scripts/debug/debug_config.js' },
    { src: 'adminserver/scripts/export_users_csv.js', dest: 'adminserver/scripts/analytics/export_users_csv.js' },
    { src: 'adminserver/scripts/fix_persona_types.js', dest: 'adminserver/scripts/db/migration/fix_persona_types.js' },
    { src: 'adminserver/scripts/migrate_checklist_to_mongo.js', dest: 'adminserver/scripts/db/migration/migrate_checklist_to_mongo.js' },
    { src: 'adminserver/scripts/sync_checklist_to_prod.js', dest: 'adminserver/scripts/db/migration/sync_checklist_to_prod.js' },
    { src: 'adminserver/scripts/test_email.js', dest: 'adminserver/scripts/debug/test_email.js' },
    { src: 'adminserver/scripts/trigger_job.js', dest: 'adminserver/scripts/debug/trigger_job.js' },

    // --- adminserver/seedScripts ---
    { src: 'adminserver/seedScripts/check_last_run.js', dest: 'adminserver/scripts/debug/check_last_run.js' },
    { src: 'adminserver/seedScripts/cleaup_admin.js', dest: 'adminserver/scripts/db/cleanup/cleaup_admin.js' }, // typo in original name preserved? let's fix it? User said "cleanupall.js" example. Let's keep name for now to avoid breaking require if any.
    { src: 'adminserver/seedScripts/debug_login.js', dest: 'adminserver/scripts/debug/debug_login.js' },
    { src: 'adminserver/seedScripts/fix_next_run.js', dest: 'adminserver/scripts/db/maintenance/fix_next_run.js' },
    { src: 'adminserver/seedScripts/seed_admin.js', dest: 'adminserver/scripts/db/seed/seed_admin.js' },
    { src: 'adminserver/seedScripts/seed_rbac_admins.js', dest: 'adminserver/scripts/db/seed/seed_rbac_admins.js' },
    { src: 'adminserver/seedScripts/seed_superadmin.js', dest: 'adminserver/scripts/db/seed/seed_superadmin.js' },
    { src: 'adminserver/seedScripts/test_cron.js', dest: 'adminserver/scripts/debug/test_cron.js' },
    { src: 'adminserver/seedScripts/test_cron_debug.js', dest: 'adminserver/scripts/debug/test_cron_debug.js' },
    { src: 'adminserver/seedScripts/test_cron_fix.js', dest: 'adminserver/scripts/debug/test_cron_fix.js' },
    { src: 'adminserver/seedScripts/test_cron_named.js', dest: 'adminserver/scripts/debug/test_cron_named.js' },
    { src: 'adminserver/seedScripts/test_cron_struct.js', dest: 'adminserver/scripts/debug/test_cron_struct.js' },
    { src: 'adminserver/seedScripts/verify_rochak_permissions.js', dest: 'adminserver/scripts/debug/verify_rochak_permissions.js' },

    // --- appserver/scripts ---
    { src: 'appserver/scripts/approve_product_by_slug.js', dest: 'adminserver/scripts/db/maintenance/approve_product_by_slug.js' },
    { src: 'appserver/scripts/auto_subscribe.js', dest: 'adminserver/scripts/db/maintenance/auto_subscribe.js' },
    { src: 'appserver/scripts/backfill-tags.js', dest: 'adminserver/scripts/db/migration/backfill-tags.js' },
    { src: 'appserver/scripts/calibrate_product.js', dest: 'adminserver/scripts/db/maintenance/calibrate_product.js' },
    { src: 'appserver/scripts/calibrate_segment.js', dest: 'adminserver/scripts/db/maintenance/calibrate_segment.js' },
    { src: 'appserver/scripts/cap-credits.js', dest: 'adminserver/scripts/db/maintenance/cap-credits.js' },
    { src: 'appserver/scripts/check_not_specified.js', dest: 'adminserver/scripts/debug/check_not_specified.js' },
    { src: 'appserver/scripts/check_openclaw.js', dest: 'adminserver/scripts/debug/check_openclaw.js' },
    { src: 'appserver/scripts/cleanup_database.js', dest: 'adminserver/scripts/db/cleanup/cleanup_database.js' },
    { src: 'appserver/scripts/debug_clicks.js', dest: 'adminserver/scripts/debug/debug_clicks.js' },
    { src: 'appserver/scripts/debug_user_id.js', dest: 'adminserver/scripts/debug/debug_user_id.js' },
    { src: 'appserver/scripts/find_by_id.js', dest: 'adminserver/scripts/debug/find_by_id.js' },
    { src: 'appserver/scripts/find_claw.js', dest: 'adminserver/scripts/debug/find_claw.js' },
    { src: 'appserver/scripts/fix_slugs_now.js', dest: 'adminserver/scripts/db/migration/fix_slugs_now.js' },
    { src: 'appserver/scripts/force_segmentation.js', dest: 'adminserver/scripts/db/maintenance/force_segmentation.js' },
    { src: 'appserver/scripts/founderSlugMigration.js', dest: 'adminserver/scripts/db/migration/founderSlugMigration.js' },
    { src: 'appserver/scripts/founder_list_5.txt', dest: 'adminserver/scripts/db/import/founder_list_5.txt' },
    { src: 'appserver/scripts/founder_redirect_map.csv', dest: 'adminserver/scripts/db/import/founder_redirect_map.csv' },
    { src: 'appserver/scripts/founder_slug_migration_log.json', dest: 'adminserver/scripts/db/migration/founder_slug_migration_log.json' },
    { src: 'appserver/scripts/manual_rename.js', dest: 'adminserver/scripts/db/maintenance/manual_rename.js' },
    { src: 'appserver/scripts/migrate_local_to_prod.js', dest: 'adminserver/scripts/db/migration/migrate_local_to_prod.js' },
    { src: 'appserver/scripts/populate_with_ai.js', dest: 'adminserver/scripts/db/seed/populate_with_ai.js' },
    { src: 'appserver/scripts/seedFounders.js', dest: 'adminserver/scripts/db/seed/seedFounders.js' },
    { src: 'appserver/scripts/seedFoundersCSV.js', dest: 'adminserver/scripts/db/seed/seedFoundersCSV.js' },
    { src: 'appserver/scripts/slugMigration.js', dest: 'adminserver/scripts/db/migration/slugMigration.js' },
    { src: 'appserver/scripts/slug_migration_log.json', dest: 'adminserver/scripts/db/migration/slug_migration_log.json' },

    // --- Docs ---
    { src: 'adminserver/notification_adminsever_prd.md', dest: 'adminserver/docs/prd/notification_adminsever_prd.md' },
    { src: 'adminserver/PHASE_2_SUMMARY.md', dest: 'adminserver/docs/PHASE_2_SUMMARY.md' }
];

moves.forEach(({ src, dest }) => {
    try {
        const srcPath = path.resolve(process.cwd(), src);
        const destPath = path.resolve(process.cwd(), dest);

        if (fs.existsSync(srcPath)) {
            // Ensure dir exists
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }

            fs.renameSync(srcPath, destPath);
            console.log(`Moved: ${src} -> ${dest}`);
        } else {
            console.warn(`Source not found: ${src}`);
        }
    } catch (err) {
        console.error(`Failed to move ${src}:`, err);
    }
});
