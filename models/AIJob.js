const mongoose = require('mongoose');

const AIJobSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['NEWSLETTER'],
        default: 'NEWSLETTER'
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'PAUSED', 'FAILED'],
        default: 'PAUSED',
        index: true
    },
    schedule: {
        frequency: {
            type: String,
            enum: ['DAILY', 'WEEKLY', 'CUSTOM'],
            required: true
        },
        time: {
            type: String, // "HH:MM" format
            required: false // Not required for CUSTOM
        },
        dayOfWeek: {
            type: Number, // 0-6 (Sunday-Saturday), only for WEEKLY
            min: 0,
            max: 6
        },
        customCron: {
            type: String // Raw cron expression for CUSTOM frequency
        },
        timezone: {
            type: String,
            default: 'Asia/Kolkata'
        }
    },
    config: {
        systemPrompt: {
            type: String,
            required: true
        },
        aiModel: {
            type: String,
            default: 'gemini-2.0-flash'
        },
        autoSend: {
            type: Boolean,
            default: false
        },
        subjectTemplate: {
            type: String,
            default: '{{title}}'
        }
    },
    stats: {
        totalRuns: { type: Number, default: 0 },
        successCount: { type: Number, default: 0 },
        failureCount: { type: Number, default: 0 },
        lastRunAt: { type: Date },
        nextRunAt: { type: Date }
    }
}, {
    timestamps: true
});

const { CronExpressionParser } = require('cron-parser');

// Calculate next run time based on schedule
AIJobSchema.methods.calculateNextRun = function () {
    const now = new Date();

    // CUSTOM Frequency - Use cron-parser
    if (this.schedule.frequency === 'CUSTOM') {
        try {
            if (!this.schedule.customCron) return null;
            const interval = CronExpressionParser.parse(this.schedule.customCron);
            return interval.next().toDate();
        } catch (err) {
            console.error('Error parsing cron:', err);
            return null;
        }
    }

    // DAILY/WEEKLY Frequency - Requires time
    if (!this.schedule.time) return null;

    const [hours, minutes] = this.schedule.time.split(':').map(Number);

    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (this.schedule.frequency === 'DAILY') {
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
    } else if (this.schedule.frequency === 'WEEKLY') {
        const targetDay = this.schedule.dayOfWeek;
        const currentDay = nextRun.getDay();
        let daysUntil = targetDay - currentDay;

        if (daysUntil < 0 || (daysUntil === 0 && nextRun <= now)) {
            daysUntil += 7;
        }
        nextRun.setDate(nextRun.getDate() + daysUntil);
    }

    return nextRun;
};

// Convert schedule to cron expression
AIJobSchema.methods.toCronExpression = function () {
    if (this.schedule.frequency === 'CUSTOM') {
        return this.schedule.customCron || null;
    }

    const [hours, minutes] = (this.schedule.time || '10:00').split(':').map(Number);

    if (this.schedule.frequency === 'DAILY') {
        return `${minutes} ${hours} * * *`;
    } else if (this.schedule.frequency === 'WEEKLY') {
        return `${minutes} ${hours} * * ${this.schedule.dayOfWeek}`;
    }
    return null;
};

module.exports = mongoose.model('AIJob', AIJobSchema);
