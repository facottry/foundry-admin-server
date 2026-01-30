const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const { sendNewsletter } = require('../services/sendingEngine');

// 1. List Newsletters
router.get('/', async (req, res) => {
    try {
        const newsletters = await Newsletter.find().sort({ createdAt: -1 });
        res.json(newsletters);
    } catch (error) {
        console.error('List Newsletters Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Create Draft
router.post('/', async (req, res) => {
    try {
        const { title, html_content, text_content, cover_image, scheduled_at } = req.body;

        // Basic Validation
        if (!title || !html_content || !text_content) {
            return res.status(400).json({ error: 'Title, HTML, and Text content are required.' });
        }

        const newsletter = new Newsletter({
            title,
            html_content,
            text_content,
            cover_image,
            scheduled_at,
            status: 'DRAFT'
        });

        await newsletter.save();
        res.status(201).json(newsletter);

    } catch (error) {
        console.error('Create Newsletter Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 3. Update Newsletter
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // title, html_content, text_content, scheduled_at, cover_image

        const newsletter = await Newsletter.findById(id);
        if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });

        if (newsletter.status === 'SENT') {
            return res.status(400).json({ error: 'Cannot update sent newsletter' });
        }

        // Update fields
        Object.assign(newsletter, updates);

        // If updating content, increment version? Spec says "Linear content versioning" but model has version.
        // Let's increment if content changes.
        if (updates.html_content || updates.text_content) {
            newsletter.version += 1;
        }

        await newsletter.save();
        res.json(newsletter);

    } catch (error) {
        console.error('Update Newsletter Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. Get Single Newsletter (Optional but useful)
// Not explicitly in task list but good for editing
router.get('/:id', async (req, res) => {
    try {
        const newsletter = await Newsletter.findById(req.params.id);
        if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
        res.json(newsletter);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 5. Send/Schedule
router.post('/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        const newsletter = await Newsletter.findById(id);

        if (!newsletter) return res.status(404).json({ error: 'Newsletter not found' });
        if (newsletter.status === 'SENT') return res.status(400).json({ error: 'Already sent' });

        // Trigger Sending Engine
        // Async processing

        // Check "Kill Switch" before even queuing? Better to check inside engine, but simple check here is okay.

        // Mark as SCHEDULED or SENT depending on logic?
        // If immediate send:
        newsletter.status = 'SENT'; // Optimistic for MVP, or 'SENDING' if we had that state.
        newsletter.sent_at = new Date();
        await newsletter.save();

        // Start Async Send to not block response
        sendNewsletter(newsletter._id).catch(err => {
            console.error('Background Send Error:', err);
            // Revert status? For now log.
        });

        res.json({ message: 'Sending initiated.', newsletter });

    } catch (error) {
        console.error('Send Newsletter Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
