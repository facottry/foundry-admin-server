const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    website_url: { type: String, required: true },
    logo_url: { type: String },
    logoKey: { type: String }, // New field for R2 key
    externalLogoUrl: { type: String }, // New field for external URL
    screenshots: [{ type: String }],
    screenshotKeys: [{ type: String }], // New field for R2 keys
    categories: [{ type: String }],
    tags: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    verified_status: { type: String, enum: ['unverified', 'verified'], default: 'unverified' },
    verified_domain: { type: String },
    verified_at: { type: Date },
    verification_method: { type: String },

    traffic_enabled: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', ProductSchema);
