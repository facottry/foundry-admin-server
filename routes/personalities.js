const express = require('express');
const router = express.Router();
const Personality = require('../models/Personality');
const requirePermission = require('../middleware/requirePermission');

// GET all personalities
router.get('/', requirePermission('BOT_PERSONALITIES_EDIT'), async (req, res) => {
    try {
        const personalities = await Personality.find({}).sort({ created_at: -1 });
        res.json(personalities);
    } catch (error) {
        console.error('Get Personalities Error:', error);
        res.status(500).json({ error: 'Failed to fetch personalities' });
    }
});

// GET active personality (public - for botserver)
router.get('/active', async (req, res) => {
    try {
        const personality = await Personality.findOne({ isActive: true });
        if (!personality) {
            // Return default personality if none active
            return res.json({
                name: 'Default',
                tone: 'Professional, confident, and helpful. Answer questions directly without unnecessary pleasantries.',
                greeting: 'Hello! I\'m Clicky, your Foundry assistant. How can I help you today?',
                isActive: true
            });
        }
        res.json(personality);
    } catch (error) {
        console.error('Get Active Personality Error:', error);
        res.status(500).json({ error: 'Failed to fetch active personality' });
    }
});

// GET personality by mode (public - for botserver)
// Customer sees only "mini" or "full" mode - never the persona name
router.get('/mode/:mode', async (req, res) => {
    try {
        const { mode } = req.params;

        if (!['mini', 'full'].includes(mode)) {
            return res.status(400).json({ error: 'Invalid mode. Must be mini or full' });
        }

        // Find personality assigned to this mode
        let personality = await Personality.findOne({ defaultMode: mode });

        // Fallback to active personality if no mode-specific one found
        if (!personality) {
            personality = await Personality.findOne({ isActive: true });
        }

        // Fallback to hardcoded defaults
        if (!personality) {
            if (mode === 'mini') {
                return res.json({
                    tone: 'You are AIRA - Archive & Intelligence Record Assistant. Role: Records, Memory, Truth. Be factual and neutral.',
                    greeting: 'AIRA active. What record do you need?'
                });
            } else {
                return res.json({
                    tone: 'You are REX - Reality & Execution Assistant. Role: Decisions, Actions. Be direct and practical.',
                    greeting: 'REX ready. What decision needs clarity?'
                });
            }
        }

        // Return only what botserver needs - NO persona name exposed to customer
        res.json({
            tone: personality.tone,
            greeting: personality.greeting
        });
    } catch (error) {
        console.error('Get Personality by Mode Error:', error);
        res.status(500).json({ error: 'Failed to fetch personality for mode' });
    }
});

// CREATE personality
router.post('/', requirePermission('BOT_PERSONALITIES_EDIT'), async (req, res) => {
    try {
        const { name, tone, greeting, isActive, defaultMode, type } = req.body;

        if (!name || !tone || !greeting) {
            return res.status(400).json({ error: 'Name, tone, and greeting are required' });
        }

        const personality = new Personality({
            name,
            tone,
            greeting,
            isActive: isActive || false,
            defaultMode: defaultMode || null,
            type: type || 'REX'
        });

        await personality.save();
        res.status(201).json(personality);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Personality name already exists' });
        }
        console.error('Create Personality Error:', error);
        res.status(500).json({ error: 'Failed to create personality' });
    }
});

// UPDATE personality
router.put('/:id', requirePermission('BOT_PERSONALITIES_EDIT'), async (req, res) => {
    try {
        const { name, tone, greeting, defaultMode, type } = req.body;

        const personality = await Personality.findByIdAndUpdate(
            req.params.id,
            { name, tone, greeting, defaultMode, type, updated_at: new Date() },
            { new: true, runValidators: true }
        );

        if (!personality) {
            return res.status(404).json({ error: 'Personality not found' });
        }

        res.json(personality);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Personality name already exists' });
        }
        console.error('Update Personality Error:', error);
        res.status(500).json({ error: 'Failed to update personality' });
    }
});

// DELETE personality
router.delete('/:id', requirePermission('BOT_PERSONALITIES_EDIT'), async (req, res) => {
    try {
        const personality = await Personality.findById(req.params.id);

        if (!personality) {
            return res.status(404).json({ error: 'Personality not found' });
        }

        if (personality.isActive) {
            return res.status(400).json({ error: 'Cannot delete active personality. Activate another one first.' });
        }

        // Restriction: Admin Can Not Delete the Last Persona (of that type)
        const count = await Personality.countDocuments({ type: personality.type });
        if (count <= 1) {
            return res.status(400).json({ error: `Cannot delete the last ${personality.type} personality.` });
        }

        await Personality.findByIdAndDelete(req.params.id);
        res.json({ message: 'Personality deleted successfully' });
    } catch (error) {
        console.error('Delete Personality Error:', error);
        res.status(500).json({ error: 'Failed to delete personality' });
    }
});

// ACTIVATE personality
router.put('/:id/activate', requirePermission('BOT_PERSONALITIES_EDIT'), async (req, res) => {
    try {
        const personality = await Personality.findById(req.params.id);
        if (!personality) {
            return res.status(404).json({ error: 'Personality not found' });
        }

        // Deactivate all others of SAME TYPE
        await Personality.updateMany({ type: personality.type }, { isActive: false });

        // Activate the selected one
        personality.isActive = true;
        personality.updated_at = new Date();
        // Using save() triggers the pre-save hook which runs the check again (redundant but safe)
        // Or use findByIdAndUpdate to skip hook if we are sure.
        // Let's use save() to ensure consistency with our model logic.
        await personality.save();

        res.json({ message: `${personality.name} is now active`, personality });
    } catch (error) {
        console.error('Activate Personality Error:', error);
        res.status(500).json({ error: 'Failed to activate personality' });
    }
});

module.exports = router;
