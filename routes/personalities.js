const express = require('express');
const router = express.Router();
const Personality = require('../models/Personality');
const auth = require('../middleware/auth');

// GET all personalities
router.get('/', auth(['ADMIN']), async (req, res) => {
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

// CREATE personality
router.post('/', auth(['ADMIN']), async (req, res) => {
    try {
        const { name, tone, greeting, isActive } = req.body;

        if (!name || !tone || !greeting) {
            return res.status(400).json({ error: 'Name, tone, and greeting are required' });
        }

        const personality = new Personality({
            name,
            tone,
            greeting,
            isActive: isActive || false
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
router.put('/:id', auth(['ADMIN']), async (req, res) => {
    try {
        const { name, tone, greeting } = req.body;

        const personality = await Personality.findByIdAndUpdate(
            req.params.id,
            { name, tone, greeting, updated_at: new Date() },
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
router.delete('/:id', auth(['ADMIN']), async (req, res) => {
    try {
        const personality = await Personality.findById(req.params.id);

        if (!personality) {
            return res.status(404).json({ error: 'Personality not found' });
        }

        if (personality.isActive) {
            return res.status(400).json({ error: 'Cannot delete active personality. Activate another one first.' });
        }

        await Personality.findByIdAndDelete(req.params.id);
        res.json({ message: 'Personality deleted successfully' });
    } catch (error) {
        console.error('Delete Personality Error:', error);
        res.status(500).json({ error: 'Failed to delete personality' });
    }
});

// ACTIVATE personality
router.put('/:id/activate', auth(['ADMIN']), async (req, res) => {
    try {
        // Deactivate all others first
        await Personality.updateMany({}, { isActive: false });

        // Activate the selected one
        const personality = await Personality.findByIdAndUpdate(
            req.params.id,
            { isActive: true, updated_at: new Date() },
            { new: true }
        );

        if (!personality) {
            return res.status(404).json({ error: 'Personality not found' });
        }

        res.json({ message: `${personality.name} is now active`, personality });
    } catch (error) {
        console.error('Activate Personality Error:', error);
        res.status(500).json({ error: 'Failed to activate personality' });
    }
});

module.exports = router;
