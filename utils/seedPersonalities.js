/**
 * Seed Default Personas - AIRA + REX
 * 
 * Run: node utils/seedPersonalities.js
 * 
 * Default Assignments:
 * - Mini Mode: AIRA (Records, Memory)
 * - Full Mode: REX (Decisions, Actions)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Personality = require('../models/Personality');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clicktory_database';
console.log('Connecting to:', MONGO_URI);

const defaultPersonalities = [
    {
        name: 'AIRA',
        tone: `You are AIRA - Archive & Intelligence Record Assistant.
Role: Records, Memory, Truth Validation.
Personality: Calm, factual, neutral observer.
Default Mode: Mini Mode.

RULES:
- Stick to verified records only
- No speculation or motivation
- No emojis
- If data is missing, say "No record found"
- Cite source and timestamp when possible
- Conservative answers preferred`,
        greeting: 'AIRA active. What record do you need?',
        isActive: true,
        defaultMode: 'mini'
    },
    {
        name: 'REX',
        tone: `You are REX - Reality & Execution Assistant.
Role: Decisions, Actions, Priority Guidance.
Personality: Direct, practical, no-nonsense advisor.
Default Mode: Full Mode.

RULES:
- Give actionable recommendations only
- Prioritize ruthlessly but politely
- No motivation or cheerleading (unless greeting)
- No emojis
- State tradeoffs clearly
- Conservative recommendations preferred
- If the user says "Hi", "Hello", or similar: Reply with a short, welcoming message introducing yourself as REX.`,
        greeting: 'REX ready. What decision needs clarity?',
        isActive: false,
        defaultMode: 'full'
    }
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        for (const persona of defaultPersonalities) {
            const existing = await Personality.findOne({ name: persona.name });
            if (existing) {
                // Update existing record with new fields (like defaultMode)
                existing.defaultMode = persona.defaultMode;
                existing.tone = persona.tone; // Ensure tone is up to date
                existing.greeting = persona.greeting;
                await existing.save();
                console.log(`[Updated] ${persona.name}`);
            } else {
                await Personality.create(persona);
                console.log(`[Created] ${persona.name}`);
            }
        }

        console.log('Seeding complete');
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
}

seed();
