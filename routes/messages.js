const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const auth = require('../middleware/auth');
const { asyncHandler, sendSuccess, sendError } = require('../utils/response');
const sendEmail = require('../utils/sendEmail');

// @route   GET /api/admin/messages
// @desc    Get all contact messages with filters
router.get('/', auth(['ADMIN']), asyncHandler(async (req, res) => {
    const { tag, status, priority } = req.query;

    const filter = {};
    if (tag) filter.tags = tag;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const messages = await ContactMessage.find(filter)
        .sort({ created_at: -1 })
        .limit(100);

    sendSuccess(res, messages);
}));

// @route   GET /api/admin/messages/:id
// @desc    Get single message
router.get('/:id', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
        return sendError(next, 'NOT_FOUND', 'Message not found', 404);
    }

    // Mark as read
    if (message.status === 'new') {
        message.status = 'read';
        await message.save();
    }

    sendSuccess(res, message);
}));

// @route   POST /api/admin/messages/:id/reply
// @desc    Reply to contact message via email
router.post('/:id/reply', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const { reply } = req.body;
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
        return sendError(next, 'NOT_FOUND', 'Message not found', 404);
    }

    if (!reply) {
        return sendError(next, 'VALIDATION_ERROR', 'Reply text is required', 400);
    }

    // Send email reply
    const emailSubject = `Re: ${message.subject}`;
    const emailBody = `Hello ${message.name},\n\n${reply}\n\n---\nOriginal message:\n${message.message}\n\nBest regards,\nFoundry Team`;

    try {
        await sendEmail(message.email, emailSubject, emailBody);
    } catch (error) {
        console.error('Error sending email:', error);
        return sendError(next, 'EMAIL_ERROR', 'Failed to send email reply', 500);
    }

    // Update message
    message.admin_reply = reply;
    message.replied_at = new Date();
    message.replied_by = req.user.id;
    message.status = 'replied';
    await message.save();

    sendSuccess(res, { message: 'Reply sent successfully', data: message });
}));

// @route   PATCH /api/admin/messages/:id/status
// @desc    Update message status
router.patch('/:id/status', auth(['ADMIN']), asyncHandler(async (req, res, next) => {
    const { status } = req.body;
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
        return sendError(next, 'NOT_FOUND', 'Message not found', 404);
    }

    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
        return sendError(next, 'VALIDATION_ERROR', 'Invalid status', 400);
    }

    message.status = status;
    await message.save();

    sendSuccess(res, message);
}));

module.exports = router;
