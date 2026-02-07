const express = require('express');
const router = express.Router();
const ChecklistItem = require('../models/ChecklistItem');
const auth = require('../middleware/adminAuth');

// All checklist routes require ADMIN role
router.use(auth(['ADMIN']));

// Get all checklist items (grouped by category and phase)
router.get('/', async (req, res) => {
    try {
        const items = await ChecklistItem.find().sort({ category: 1, phase: 1, itemKey: 1 });

        // Group items by category and phase
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.category]) grouped[item.category] = {};
            if (!grouped[item.category][item.phase]) grouped[item.category][item.phase] = {};

            grouped[item.category][item.phase][item.itemKey] = {
                detail: item.detail,
                status: item.status,
                progress: item.progress,
                repos: item.repos,
                inactive: item.inactive
            };
        });

        res.json(grouped);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch checklist' });
    }
});

// Update a checklist item
router.put('/:category/:phase/:itemKey', async (req, res) => {
    try {
        const { category, phase, itemKey } = req.params;
        const { detail, progress, repos, status } = req.body;

        const item = await ChecklistItem.findOneAndUpdate(
            { category, phase, itemKey },
            { detail, progress, repos, status },
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ success: true, item });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// Soft delete (mark as inactive)
router.delete('/:category/:phase/:itemKey', async (req, res) => {
    try {
        const { category, phase, itemKey } = req.params;

        const item = await ChecklistItem.findOneAndUpdate(
            { category, phase, itemKey },
            { inactive: true },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Restore deleted item
router.post('/:category/:phase/:itemKey/restore', async (req, res) => {
    try {
        const { category, phase, itemKey } = req.params;

        const item = await ChecklistItem.findOneAndUpdate(
            { category, phase, itemKey },
            { inactive: false },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to restore item' });
    }
});

module.exports = router;
