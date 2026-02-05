const mongoose = require('mongoose');

const AIJobRunSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AIJob',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED'],
        default: 'RUNNING'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date
    },
    generated: {
        type: Boolean,
        default: false
    },
    sent: {
        type: Boolean,
        default: false
    },
    recipientCount: {
        type: Number,
        default: 0
    },
    newsletterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Newsletter'
    },
    error: {
        type: String
    }
}, {
    timestamps: true
});

// Index for efficient querying
AIJobRunSchema.index({ jobId: 1, createdAt: -1 });

module.exports = mongoose.model('AIJobRun', AIJobRunSchema);
