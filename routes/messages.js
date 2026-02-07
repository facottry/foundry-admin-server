const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const requirePermission = require('../middleware/requirePermission');
const { asyncHandler, sendSuccess, sendError } = require('../utils/response');
const sendEmail = require('../utils/sendEmail');

// @route   GET /api/admin/messages
// @desc    Get all contact messages with filters
router.get('/', requirePermission('MESSAGES_VIEW'), asyncHandler(async (req, res) => {
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
router.get('/:id', requirePermission('MESSAGES_VIEW'), asyncHandler(async (req, res, next) => {
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
router.post('/:id/reply', requirePermission('MESSAGES_VIEW'), asyncHandler(async (req, res, next) => {
    const { reply } = req.body;
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
        return sendError(next, 'NOT_FOUND', 'Message not found', 404);
    }

    if (!reply) {
        return sendError(next, 'VALIDATION_ERROR', 'Reply text is required', 400);
    }

    // Send email reply
    // Send email reply (BCC to Admin)
    const emailSubject = `Re: ${message.subject}`;

    const homepageUrl = `${process.env.PUBLIC_URL || 'https://clicktory.in'}?utm_source=admin_reply&utm_medium=email&utm_campaign=support`;

    // HTML Template
    const emailHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <div style="padding: 20px 0; border-bottom: 1px solid #eee;">
                <h2 style="color: #000; margin: 0;">Reply from Clicktory</h2>
            </div>
            
            <div style="padding: 20px 0; line-height: 1.6;">
                <p>Hello ${message.name},</p>
                <p>${reply.replace(/\n/g, '<br/>')}</p>
                <p>Best regards,<br/>Clicktory Team</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${homepageUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Explore Clicktory Hotlist
                </a>
            </div>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-size: 13px; color: #666;">
                <strong>Original message:</strong><br/>
                ${message.message.replace(/\n/g, '<br/>')}
            </div>

            <div style="padding: 20px 0; border-top: 1px solid #eee; margin-top: 20px; font-size: 12px; color: #999; text-align: center;">
                <p>Sent via Clicktory Hotlist • Product Discovery Platform</p>
            </div>
        </div>
    `;

    const emailText = `Hello ${message.name},\n\n${reply}\n\n---\nOriginal message:\n${message.message}\n\nBest regards,\nClicktory Team\n\nExplore: ${homepageUrl}`;
    const adminEmail = process.env.ADMIN_EMAIL || process.env.APP_EMAIL;

    try {
        await sendEmail(message.email, emailSubject, emailText, emailHtml, adminEmail);
    } catch (error) {
        console.error('Error sending email:', error);
        return sendError(next, 'EMAIL_ERROR', 'Failed to send email reply', 500);
    }

    // Update message
    message.admin_reply = reply;
    message.replied_at = new Date();
    message.replied_by = req.admin ? req.admin._id : null; // Fixed: req.admin set by requirePermission
    message.status = 'replied';
    await message.save();

    sendSuccess(res, { message: 'Reply sent successfully', data: message });
}));

// @route   PATCH /api/admin/messages/:id/status
// @desc    Update message status
router.patch('/:id/status', requirePermission('MESSAGES_VIEW'), asyncHandler(async (req, res, next) => {
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
