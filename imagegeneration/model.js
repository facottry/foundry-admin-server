const mongoose = require('mongoose');

const ImageJobSchema = new mongoose.Schema({
    intent: {
        type: String,
        required: true
    },
    rawPrompt: {
        type: String,
        required: true
    },
    finalPrompt: {
        type: String,
        required: true
    },
    imageCount: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    size: {
        type: String,
        default: '1024x1024'
    },
    modelKey: {
        type: String,
        default: 'DALLE'
    },
    status: {
        type: String,
        enum: ['QUEUED', 'RUNNING', 'DONE', 'FAILED'],
        default: 'QUEUED'
    },
    cdnUrls: [{
        type: String
    }],
    error: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ImageJob', ImageJobSchema);
