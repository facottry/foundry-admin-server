const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// R2 / S3 Configuration
const accountId = process.env.R2_ACCOUNT_ID;
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'foundry-uploads';

// Memory Storage (File buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// @route   POST /api/admin/uploads
// @desc    Upload image to R2 (Private Bucket) -> Serve via Proxy
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const filename = 'img-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname);

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            // ACL: 'public-read' // Not supported by R2 private buckets usually
        });

        await s3Client.send(command);

        // Fallback Proxy URL (Works on localhost/private buckets)
        // Since we cannot change the env vars, we proxy the image through our own server
        const proxyUrl = `${req.protocol}://${req.get('host')}/api/admin/uploads/${filename}`;

        res.json({ success: true, url: proxyUrl });

    } catch (error) {
        console.error('S3 Upload Error:', error);
        res.status(500).json({ error: `Upload failed: ${error.message}` });
    }
});

// @route   GET /api/admin/uploads/:filename
// @desc    Proxy R2 Image (Secure Fetch)
// @access  Public (for Newsletter Images)
router.get('/:filename', async (req, res) => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: req.params.filename
        });

        const response = await s3Client.send(command);

        res.setHeader('Content-Type', response.ContentType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        response.Body.pipe(res);

    } catch (error) {
        console.error('Proxy Image Error:', error);
        res.status(404).json({ error: `Image not found: ${error.message}` });
    }
});

module.exports = router;
