const ImageJob = require('./model');
const services = require('./services');

let isProcessing = false;

const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // Find oldest QUEUED job
        const job = await ImageJob.findOne({ status: 'QUEUED' }).sort({ createdAt: 1 });

        if (!job) {
            isProcessing = false;
            return;
        }

        console.log(`[Worker] Starting Job ${job._id}`);

        // Mark RUNNING
        job.status = 'RUNNING';
        await job.save();

        const generatedUrls = [];

        try {
            // Process images sequentially to avoid rate limits / burst costs
            for (let i = 0; i < job.imageCount; i++) {
                console.log(`[Worker] Job ${job._id} - Generating Image ${i + 1}/${job.imageCount} using ${job.modelKey || 'DALLE'}`);

                // 1. Generate with model and size
                const imageBuffer = await services.generateImage(job.finalPrompt, job.size, job.modelKey);

                // 2. Upload
                const url = await services.uploadToR2(imageBuffer);
                generatedUrls.push(url);
            }

            // Success
            job.status = 'DONE';
            job.cdnUrls = generatedUrls;
            await job.save();
            console.log(`[Worker] Job ${job._id} COMPLETED`);

        } catch (err) {
            console.error(`[Worker] Job ${job._id} FAILED:`, err);
            job.status = 'FAILED';
            job.error = err.message || 'Unknown generation error';
            await job.save();
        }

    } catch (err) {
        console.error("[Worker] Queue Error:", err);
    } finally {
        isProcessing = false;
        // Immediate check for next job if one exists, otherwise wait for next interval
        // For simplicity in this v1, checking aggressively on short interval is fine or recursive check
    }
};

// Start Worker
exports.startWorker = () => {
    console.log('[Worker] Image Generation Worker Started');
    // Poll every 5 seconds
    setInterval(processQueue, 5000);
};
