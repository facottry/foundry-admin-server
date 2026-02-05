const express = require('express');
const router = express.Router();
const controller = require('../controllers/aiJobController');

// List all jobs
router.get('/', controller.listJobs);

// Get single job
router.get('/:id', controller.getJob);

// Create job
router.post('/', controller.createJob);

// Update job
router.put('/:id', controller.updateJob);

// Delete job
router.delete('/:id', controller.deleteJob);

// Toggle job status (pause/resume)
router.post('/:id/toggle', controller.toggleJob);

// Get job execution history
router.get('/:id/runs', controller.getJobRuns);

// Get newsletter from a specific run
router.get('/runs/:runId/newsletter', controller.getRunNewsletter);

// Preview generation (generate content without saving)
router.post('/preview', controller.previewGenerate);

// Send test email to single recipient
router.post('/test-email', controller.sendTestEmail);

module.exports = router;

