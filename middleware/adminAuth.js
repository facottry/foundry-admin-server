/**
 * Admin Auth Middleware
 * 
 * Validates Admin JWT tokens only.
 * Rejects User JWTs (type !== 'ADMIN').
 * Loads admin from admins collection.
 * 
 * Usage: requireAdminAuth() or requireAdminAuth(['SUPER_ADMIN'])
 */

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

module.exports = function requireAdminAuth(allowedRoles = []) {
    return async (req, res, next) => {
        const token = req.header('x-auth-token');

        // No token
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'AUTH_ERROR',
                message: 'No token, authorization denied'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            // Reject User JWTs - must be ADMIN type
            if (decoded.type !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'Invalid token type for admin routes'
                });
            }

            // Load admin from admins collection
            const admin = await Admin.findById(decoded.adminId).select('-passwordHash');

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    error: 'AUTH_ERROR',
                    message: 'Admin not found'
                });
            }

            // Check if admin is active
            if (!admin.isActive) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'Admin account is inactive'
                });
            }

            // Check role permissions
            // 'ADMIN' is treated as wildcard - any admin role is accepted
            // Specific roles: 'SUPER_ADMIN', 'REVIEWER', 'OPS'
            if (allowedRoles.length > 0 && !allowedRoles.includes('ADMIN') && !allowedRoles.includes(admin.role)) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'Insufficient admin role'
                });
            }

            // Attach admin to request
            req.admin = admin;
            next();
        } catch (err) {
            return res.status(401).json({
                success: false,
                error: 'AUTH_ERROR',
                message: 'Token is not valid'
            });
        }
    };
};
