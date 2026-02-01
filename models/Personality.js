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
    type: {
        type: String,
        enum: ['REX', 'AIRA'],
        required: true,
        default: 'REX'
    },
    defaultMode: {
        type: String,
        enum: ['mini', 'full', null],
        default: null
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

// Ensure only one active personality PER TYPE
PersonalitySchema.pre('save', async function (next) {
    if (this.isActive) {
        await this.constructor.updateMany(
            {
                _id: { $ne: this._id },
                type: this.type  // Only deactivate same type
            },
            { isActive: false }
        );
    }
    this.updated_at = new Date();
    next();
});

module.exports = mongoose.model('Personality', PersonalitySchema);
