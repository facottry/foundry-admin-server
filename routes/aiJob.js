const express = require('express');
const router = express.Router();
const controller = require('../controllers/aiJobController');
const requirePermission = require('../middleware/requirePermission');

// All AI Job routes require AI_JOBS_EDIT permission

// List all jobs
router.get('/', requirePermission('AI_JOBS_EDIT'), controller.listJobs);

// Get single job
router.get('/:id', requirePermission('AI_JOBS_EDIT'), controller.getJob);

// Create job
router.post('/', requirePermission('AI_JOBS_EDIT'), controller.createJob);

// Update job
router.put('/:id', requirePermission('AI_JOBS_EDIT'), controller.updateJob);

// Delete job
router.delete('/:id', requirePermission('AI_JOBS_EDIT'), controller.deleteJob);

// Toggle job status (pause/resume)
router.post('/:id/toggle', requirePermission('AI_JOBS_EDIT'), controller.toggleJob);

// Manually trigger job run
router.post('/:id/run', requirePermission('AI_JOBS_EDIT'), controller.runJob);

// Get job execution history
router.get('/:id/runs', requirePermission('AI_JOBS_EDIT'), controller.getJobRuns);

// Get newsletter from a specific run
router.get('/runs/:runId/newsletter', requirePermission('AI_JOBS_EDIT'), controller.getRunNewsletter);

// Preview generation (generate content without saving)
router.post('/preview', requirePermission('AI_JOBS_EDIT'), controller.previewGenerate);

// Send test email to single recipient
router.post('/test-email', requirePermission('AI_JOBS_EDIT'), controller.sendTestEmail);

module.exports = router;
