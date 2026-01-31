const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['CUSTOMER', 'FOUNDER', 'ADMIN'], default: 'CUSTOMER' },
    credits_balance: { type: Number, default: 0 },
    otp_hash: { type: String },
    otp_expires: { type: Date },
    created_at: { type: Date, default: Date.now },
    profileImageKey: { type: String }, // New field for R2 key
    avatar_url: { type: String }, // Add avatar_url for consistency
    verified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
