const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    website_url: { type: String, required: true },
    logo_url: { type: String },
    screenshots: [{ type: String }],
    categories: [{ type: String }],
    tags: [{ type: String }],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    traffic_enabled: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', ProductSchema);
