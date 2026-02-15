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
const sendEmail = require('../utils/sendEmail');

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

/**
 * @route   POST /api/admin/auth/send-otp
 * @desc    Send OTP for password reset
 * @access  Public
 */
router.post('/send-otp', asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return sendError(next, 'VALIDATION_ERROR', 'Email is required', 400);
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
        // Return success even if email not found to prevent enumeration
        return sendSuccess(res, { message: 'OTP sent if email exists' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    admin.otp = otp;
    admin.otpExpiry = expiry;
    await admin.save();

    // Send Email
    try {
        await sendEmail(
            admin.email,
            'Admin Password Reset OTP',
            `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`,
            `<p>Your OTP for password reset is: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`
        );
    } catch (err) {
        console.error('Failed to send OTP email:', err);
        return sendError(next, 'EMAIL_ERROR', 'Failed to send OTP email', 500);
    }

    sendSuccess(res, { message: 'OTP sent successfully' });
}));

/**
 * @route   POST /api/admin/auth/reset-password
 * @desc    Reset password using OTP
 * @access  Public
 */
router.post('/reset-password', asyncHandler(async (req, res, next) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return sendError(next, 'VALIDATION_ERROR', 'All fields are required', 400);
    }

    if (newPassword.length < 8) {
        return sendError(next, 'VALIDATION_ERROR', 'Password must be at least 8 characters', 400);
    }

    const admin = await Admin.findOne({
        email: email.toLowerCase(),
        otp: otp,
        otpExpiry: { $gt: Date.now() }
    });

    if (!admin) {
        return sendError(next, 'AUTH_ERROR', 'Invalid or expired OTP', 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);

    // Clear OTP
    admin.otp = undefined;
    admin.otpExpiry = undefined;

    await admin.save();

    sendSuccess(res, { message: 'Password reset successfully' });
}));

module.exports = router;
