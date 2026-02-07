/**
 * Admin Management Routes
 * 
 * SUPER_ADMIN only endpoints for managing other admins.
 * - List all admins
 * - Update admin role/permissions
 */

const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const requirePermission = require('../middleware/requirePermission');
const { validatePermissions } = require('../utils/permissionRegistry');
const { asyncHandler, sendSuccess, sendError } = require('../utils/response');
const bcrypt = require('bcryptjs');

/**
 * Middleware: SUPER_ADMIN only
 */
const requireSuperAdmin = async (req, res, next) => {
    // requirePermission already attached req.admin
    if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            error: 'FORBIDDEN',
            message: 'SUPER_ADMIN access required'
        });
    }
    next();
};

/**
 * @route   GET /api/admin/admins
 * @desc    Get all admins (SUPER_ADMIN only)
 * @access  Private - SUPER_ADMIN
 */
router.get('/', requirePermission('DASHBOARD_VIEW'), requireSuperAdmin, asyncHandler(async (req, res) => {
    const admins = await Admin.find()
        .select('-passwordHash')
        .sort({ createdAt: -1 });

    sendSuccess(res, { admins });
}));

/**
 * @route   PUT /api/admin/admins/:adminId
 * @desc    Update admin role/permissions (SUPER_ADMIN only)
 * @access  Private - SUPER_ADMIN
 */
router.put('/:adminId', requirePermission('DASHBOARD_VIEW'), requireSuperAdmin, asyncHandler(async (req, res, next) => {
    const { adminId } = req.params;
    const { role, permissions } = req.body;

    // Validate role
    if (!role || !['SUPER_ADMIN', 'ADMIN'].includes(role)) {
        return sendError(next, 'VALIDATION_ERROR', 'Invalid role. Must be SUPER_ADMIN or ADMIN', 400);
    }

    // Find admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
        return sendError(next, 'NOT_FOUND', 'Admin not found', 404);
    }

    // For ADMIN role, validate permissions
    if (role === 'ADMIN') {
        if (!permissions || !Array.isArray(permissions)) {
            return sendError(next, 'VALIDATION_ERROR', 'Permissions required for ADMIN role', 400);
        }

        const validation = validatePermissions(permissions);
        if (!validation.valid) {
            return sendError(next, 'VALIDATION_ERROR', validation.error, 400);
        }

        admin.permissions = permissions;
    } else {
        // SUPER_ADMIN - clear permissions (not needed)
        admin.permissions = [];
    }

    admin.role = role;
    await admin.save();

    // Return updated admin (without passwordHash)
    const updatedAdmin = await Admin.findById(adminId).select('-passwordHash');

    sendSuccess(res, { admin: updatedAdmin });
}));

/**
 * @route   PUT /api/admin/admins/:adminId/password
 * @desc    Reset admin password (SUPER_ADMIN only)
 * @access  Private - SUPER_ADMIN
 */
router.put('/:adminId/password', requirePermission('DASHBOARD_VIEW'), requireSuperAdmin, asyncHandler(async (req, res, next) => {
    const { adminId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return sendError(next, 'VALIDATION_ERROR', 'Password must be at least 8 characters', 400);
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
        return sendError(next, 'NOT_FOUND', 'Admin not found', 404);
    }

    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    await admin.save();

    sendSuccess(res, { message: 'Password reset successfully' });
}));

module.exports = router;
