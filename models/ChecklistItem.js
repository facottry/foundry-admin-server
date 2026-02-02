const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        index: true
    },
    phase: {
        type: String,
        required: true,
        index: true
    },
    itemKey: {
        type: String,
        required: true,
        index: true
    },
    detail: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Done'],
        default: 'Pending'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    repos: [{
        type: String,
        enum: ['appclient', 'appserver', 'adminclient', 'adminserver', 'botclient', 'botserver', 'trackserver']
    }],
    inactive: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index for unique items
checklistItemSchema.index({ category: 1, phase: 1, itemKey: 1 }, { unique: true });

module.exports = mongoose.model('ChecklistItem', checklistItemSchema);
