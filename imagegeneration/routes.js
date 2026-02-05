const express = require('express');
const router = express.Router();
const controller = require('./controller');

// @route   GET /image/models
// @desc    Get enabled image generation models
router.get('/models', controller.getEnabledModels);

// @route   POST /image/enhance-prompt
// @desc    Enhance raw user prompt with AI
router.post('/enhance-prompt', controller.enhancePrompt);

// @route   POST /image/execute-prompt
// @desc    Queue new image generation job
router.post('/execute-prompt', controller.executePrompt);

// @route   GET /image/job-status/:jobId
// @desc    Get status of specific job
router.get('/job-status/:jobId', controller.jobStatus);

// @route   GET /image/job-list
// @desc    List recent jobs
router.get('/job-list', controller.jobList);

// @route   DELETE /image/job/:jobId
// @desc    Delete a specific job
router.delete('/job/:jobId', controller.deleteJob);

module.exports = router;
