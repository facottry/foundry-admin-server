const mongoose = require('mongoose');

const PersonalitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    tone: {
        type: String,
        required: true,
        maxlength: 2000
    },
    greeting: {
        type: String,
        required: true,
        maxlength: 500
    },
    isActive: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one active personality at a time
PersonalitySchema.pre('save', async function (next) {
    if (this.isActive) {
        await this.constructor.updateMany(
            { _id: { $ne: this._id } },
            { isActive: false }
        );
    }
    this.updated_at = new Date();
    next();
});

module.exports = mongoose.model('Personality', PersonalitySchema);
