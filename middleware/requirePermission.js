/**
 * Permission Middleware
 * 
 * Checks if admin has required permission.
 * SUPER_ADMIN bypasses all permission checks.
 * ADMIN must have explicit permission granted.
 * 
 * Usage: requirePermission('PRODUCTS_EDIT')
 */

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Middleware factory that requires a specific permission
 * @param {string} permission - Required permission (e.g., 'PRODUCTS_EDIT')
 */
function requirePermission(permission) {
    return async (req, res, next) => {
        const token = req.header('x-auth-token');

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'AUTH_ERROR',
                message: 'No token, authorization denied'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            // Reject non-admin tokens
            if (decoded.type !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'Invalid token type for admin routes'
                });
            }

            // Load admin from database
            const admin = await Admin.findById(decoded.adminId).select('-passwordHash');

            if (!admin) {
                return res.status(401).json({
                    success: false,
                    error: 'AUTH_ERROR',
                    message: 'Admin not found'
                });
            }

            if (!admin.isActive) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: 'Admin account is inactive'
                });
            }

            // SUPER_ADMIN bypasses ALL permission checks
            if (admin.role === 'SUPER_ADMIN') {
                req.admin = admin;
                return next();
            }

            // ADMIN role: check explicit permission
            let hasPermission = admin.permissions && admin.permissions.includes(permission);

            // Hierarchy Check: EDIT implies VIEW
            if (!hasPermission && permission.endsWith('_VIEW')) {
                const editPermission = permission.replace('_VIEW', '_EDIT');
                hasPermission = admin.permissions && admin.permissions.includes(editPermission);
            }

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    error: 'FORBIDDEN',
                    message: `Missing permission: ${permission}`
                });
            }

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
}

module.exports = requirePermission;
