/**
 * Admin Model
 * 
 * Dedicated collection for administrator accounts.
 * Completely separate from users collection.
 * 
 * Used exclusively by AdminServer and AdminClient.
 */

const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'ADMIN'],
        default: 'ADMIN'
    },
    permissions: {
        type: [String],
        default: []
        // Used only for ADMIN role. SUPER_ADMIN bypasses permission checks.
        // Format: RESOURCE_ACTION (e.g., DASHBOARD_VIEW, PRODUCTS_EDIT)
    },
    isActive: {
        type: Boolean,
        default: true
    },
    otp: {
        type: String
    },
    otpExpiry: {
        type: Date
    },
    lastLoginAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for fast lookup
AdminSchema.index({ email: 1 });

module.exports = mongoose.model('Admin', AdminSchema);
