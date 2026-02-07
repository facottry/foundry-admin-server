/**
 * Permission Registry
 * 
 * Single source of truth for all permissions.
 * Used by both backend validation and frontend UI.
 * 
 * Format: RESOURCE -> [PERMISSIONS]
 * Mutual exclusion: VIEW and EDIT cannot coexist for same resource.
 */

const PERMISSIONS = {
    DASHBOARD: ['DASHBOARD_VIEW', 'DASHBOARD_EDIT'],
    FOUNDERS: ['FOUNDERS_VIEW', 'FOUNDERS_EDIT'],
    PRODUCTS: ['PRODUCTS_VIEW', 'PRODUCTS_EDIT'],
    NEWSLETTER: ['NEWSLETTER_EDIT'],
    AI_JOBS: ['AI_JOBS_EDIT'],
    BOT_PERSONALITIES: ['BOT_PERSONALITIES_EDIT'],
    MESSAGES: ['MESSAGES_VIEW'],
    SERVER_HEALTH: ['SERVER_HEALTH_VIEW', 'SERVER_HEALTH_EDIT'],
    IMAGEMANAGER: ['IMAGEMANAGER_VIEW', 'IMAGEMANAGER_EDIT']
};

// Flat list of all valid permissions
const ALL_PERMISSIONS = Object.values(PERMISSIONS).flat();

/**
 * Validate permission array for mutual exclusion
 * Returns { valid: boolean, error: string | null }
 */
function validatePermissions(permissions) {
    if (!Array.isArray(permissions)) {
        return { valid: false, error: 'Permissions must be an array' };
    }

    // Check all permissions are valid
    for (const perm of permissions) {
        if (!ALL_PERMISSIONS.includes(perm)) {
            return { valid: false, error: `Invalid permission: ${perm}` };
        }
    }

    // Check mutual exclusion (VIEW and EDIT cannot coexist)
    for (const [resource, perms] of Object.entries(PERMISSIONS)) {
        if (perms.length === 2) {
            const viewPerm = perms.find(p => p.endsWith('_VIEW'));
            const editPerm = perms.find(p => p.endsWith('_EDIT'));

            if (viewPerm && editPerm && permissions.includes(viewPerm) && permissions.includes(editPerm)) {
                return {
                    valid: false,
                    error: `${resource}: VIEW and EDIT cannot be selected together`
                };
            }
        }
    }

    return { valid: true, error: null };
}

module.exports = {
    PERMISSIONS,
    ALL_PERMISSIONS,
    validatePermissions
};
