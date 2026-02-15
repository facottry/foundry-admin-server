const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const AIJob = require('../models/AIJob');

const DEFAULT_SYSTEM_PROMPT = `You are an AI newsletter curator for Clicktory - a product discovery platform.

Your task is to create an engaging, informative newsletter that highlights:
1. New products recently added to the platform
2. Trending products based on clicks and saves
3. Product discovery tips and insights
4. Platform updates and features

Guidelines:
- Keep the tone professional yet friendly
- Focus on value for founders and product enthusiasts
- Include 3-5 product highlights
- Keep it concise (300-500 words)
- Use engaging subject lines

Output Format (JSON):
{
  "title": "Newsletter title/subject line",
  "html_content": "Full HTML email content",
  "text_content": "Plain text version"
}`;

async function createDailyJob() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database');
        console.log('✓ Connected to MongoDB\n');

        // Check if a daily job already exists
        const existingJob = await AIJob.findOne({
            name: 'Daily Newsletter',
            'schedule.frequency': 'DAILY'
        });

        if (existingJob) {
            console.log('⚠️  A Daily Newsletter job already exists:');
            console.log(`   ID: ${existingJob._id}`);
            console.log(`   Status: ${existingJob.status}`);
            console.log(`   Time: ${existingJob.schedule.time}`);
            console.log('\n💡 Use activate_ai_job.js to activate it if needed.\n');
            await mongoose.disconnect();
            return;
        }

        // Create new daily newsletter job
        const job = new AIJob({
            name: 'Daily Newsletter',
            type: 'NEWSLETTER',
            status: 'ACTIVE',
            schedule: {
                frequency: 'DAILY',
                time: '10:00', // 10 AM IST
                timezone: 'Asia/Kolkata'
            },
            config: {
                systemPrompt: DEFAULT_SYSTEM_PROMPT,
                aiModel: 'gemini-2.0-flash',
                autoSend: true,
                subjectTemplate: '{{title}}'
            },
            stats: {
                totalRuns: 0,
                successCount: 0,
                failureCount: 0
            }
        });

        job.stats.nextRunAt = job.calculateNextRun();
        await job.save();

        console.log('✅ Daily Newsletter Job Created Successfully!\n');
        console.log('═'.repeat(60));
        console.log(`   Job ID: ${job._id}`);
        console.log(`   Name: ${job.name}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Frequency: ${job.schedule.frequency}`);
        console.log(`   Time: ${job.schedule.time} ${job.schedule.timezone}`);
        console.log(`   Auto-Send: ${job.config.autoSend ? 'Yes' : 'No'}`);
        console.log(`   AI Model: ${job.config.aiModel}`);
        if (job.stats.nextRunAt) {
            console.log(`   Next Run: ${job.stats.nextRunAt.toLocaleString()}`);
        }
        console.log('═'.repeat(60));
        console.log('\n⚠️  Important: Restart adminserver for the scheduler to pick up this job.');
        console.log('   Or trigger manually: node trigger_job.js ' + job._id + '\n');

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createDailyJob();
