/**
 * Admin Authentication Routes
 * 
 * Dedicated routes for admin login/logout.
 * Uses admins collection ONLY.
 * Never touches users collection.
 * 
 * Routes:
 * POST /api/admin/auth/login
 * POST /api/admin/auth/logout
 * GET  /api/admin/auth/me
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const requireAdminAuth = require('../middleware/adminAuth');
const { asyncHandler, sendSuccess, sendError } = require('../utils/response');

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login (admins collection only)
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return sendError(next, 'VALIDATION_ERROR', 'Email and password are required', 400);
    }

    // Find admin in admins collection ONLY
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    console.log(`[LOGIN DEBUG] Email: ${email}`);
    console.log(`[LOGIN DEBUG] Admin found: ${admin ? 'YES' : 'NO'}`);
    if (admin) {
        console.log(`[LOGIN DEBUG] Admin Role: ${admin.role}`);
        console.log(`[LOGIN DEBUG] Stored Hash starts with: ${admin.passwordHash ? admin.passwordHash.substring(0, 10) : 'NULL'}`);
    }

    // Generic error to prevent email enumeration
    if (!admin) {
        console.log('[LOGIN DEBUG] Admin not found in DB');
        return sendError(next, 'AUTH_ERROR', 'Invalid credentials', 401);
    }

    // Check if admin is active
    if (!admin.isActive) {
        return sendError(next, 'FORBIDDEN', 'Account is inactive', 403);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    console.log(`[LOGIN DEBUG] Password Match result: ${isMatch}`);

    if (!isMatch) {
        console.log('[LOGIN DEBUG] Password mismatch');
        return sendError(next, 'AUTH_ERROR', 'Invalid credentials', 401);
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Create Admin JWT with type: 'ADMIN'
    // Include permissions for ADMIN role (SUPER_ADMIN bypasses checks)
    const payload = {
        adminId: admin._id,
        role: admin.role,
        type: 'ADMIN'  // Critical: distinguishes from user JWTs
    };

    // Only include permissions for ADMIN role (SUPER_ADMIN has implicit full access)
    if (admin.role === 'ADMIN') {
        payload.permissions = admin.permissions || [];
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
        expiresIn: '24h'
    });

    sendSuccess(res, {
        token,
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: admin.role === 'SUPER_ADMIN' ? ['*'] : (admin.permissions || [])
        }
    });
}));

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout (client-side token removal)
 * @access  Private
 */
router.post('/logout', requireAdminAuth(), asyncHandler(async (req, res) => {
    // Server-side logout is a no-op for JWT
    // Client must remove the token
    sendSuccess(res, { message: 'Logged out successfully' });
}));

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private
 */
router.get('/me', requireAdminAuth(), asyncHandler(async (req, res) => {
    sendSuccess(res, {
        admin: {
            id: req.admin._id,
            name: req.admin.name,
            email: req.admin.email,
            role: req.admin.role,
            isActive: req.admin.isActive,
            lastLoginAt: req.admin.lastLoginAt,
            createdAt: req.admin.createdAt
        }
    });
}));

/**
 * @route   PUT /api/admin/auth/change-password
 * @desc    Change current admin password
 * @access  Private
 */
router.put('/change-password', requireAdminAuth(), asyncHandler(async (req, res, next) => {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
        return sendError(next, 'VALIDATION_ERROR', 'Password must be at least 8 characters', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await Admin.findByIdAndUpdate(req.admin._id, { passwordHash });

    sendSuccess(res, { message: 'Password updated successfully' });
}));

module.exports = router;
