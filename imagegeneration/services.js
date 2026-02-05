const { OpenAI } = require('openai');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const axios = require('axios');

// Initialize OpenAI
let openai;
if (process.env.OPENAI_API_KEY) {
    try {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    } catch (e) {
        console.error("Failed to init OpenAI:", e.message);
    }
} else {
    console.warn("WARNING: OPENAI_API_KEY is missing. Image generation will fail.");
}

// Initialize R2 (S3 Client)
const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY,
    R2_SECRET_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_BASE_URL
} = process.env;

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY
    }
});

/**
 * Enhance a raw prompt using OpenAI Chat Completion
 * @param {string} intent 
 * @param {string} rawPrompt 
 * @returns {Promise<string>} The enhanced prompt
 */
exports.enhancePrompt = async (intent, rawPrompt) => {
    if (!openai) throw new Error("OpenAI is not configured (Missing API Key)");

    try {
        const systemMessage = `You are a UI Design ExpertAI. 
        Your task is to convert a user's raw idea into a high-fidelity, photorealistic image generation prompt for a modern SaaS product.
        
        Rules:
        1. Output ONLY the final prompt. No explanations.
        2. Style: Clean, modern, high-resolution, premium SaaS dashboard or interface.
        3. Avoid: Cartoons, sketches, 3D renders, illustrations, dark mode unless specified.
        4. Focus on: Soft shadows, clean typography, whitespace, realistic UI elements.

        Must Folow : Final Prompt Must Contain This Rules
        NO stylized text.
        NO decorative typography.
        ONLY large, bold, simple sans-serif text.
        Text must be clear, flat, readable.
        `;

        const userMessage = `Intent: ${intent}\nRaw Input: ${rawPrompt}\n\nGenerate a detailed DALL-E 3 prompt.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Fast and sufficient for prompt engineering
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: userMessage }
            ],
            max_tokens: 200,
            temperature: 0.7,
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("OpenAI Prompt Enhancement Failed:", error);
        throw new Error("Failed to enhance prompt");
    }
};

/**
 * Model key to OpenAI model mapping
 */
const MODEL_MAP = {
    DALLE: 'dall-e-3',
    GPTIMAGE: 'gpt-image-1',
    GPTIMAGE_HD: 'gpt-image-1', // Same model but with HD quality settings
    // MIDJOURNEY and SDXL would need separate integrations
};

/**
 * Generate an image using OpenAI
 * @param {string} prompt 
 * @param {string} size 
 * @param {string} modelKey 
 * @returns {Promise<Buffer>} The image buffer
 */
exports.generateImage = async (prompt, size = '1024x1024', modelKey = 'DALLE') => {
    if (!openai) throw new Error("OpenAI is not configured (Missing API Key)");

    const model = MODEL_MAP[modelKey] || 'dall-e-3';

    try {
        console.log(`[Services] Generating image with model: ${model}`);

        let response;

        if (model === 'gpt-image-1') {
            // gpt-image-1 has different API parameters
            // Use HD quality for GPTIMAGE_HD, standard otherwise
            const isHD = modelKey === 'GPTIMAGE_HD';
            response = await openai.images.generate({
                model: model,
                prompt: prompt,
                n: 1,
                size: isHD ? '1536x1024' : size, // Larger size for HD
                quality: isHD ? 'high' : 'medium'
            });

            console.log(`[Services] gpt-image-1 response:`, JSON.stringify(response.data[0], null, 2));

            // gpt-image-1 may return b64_json or url depending on API version
            if (response.data[0].b64_json) {
                return Buffer.from(response.data[0].b64_json, 'base64');
            } else if (response.data[0].url) {
                const imageResponse = await fetch(response.data[0].url);
                const arrayBuffer = await imageResponse.arrayBuffer();
                return Buffer.from(arrayBuffer);
            } else {
                throw new Error('gpt-image-1 returned no image data');
            }
        } else {
            // DALL-E 3 supports b64_json
            response = await openai.images.generate({
                model: model,
                prompt: prompt,
                n: 1,
                size: size,
                response_format: "b64_json",
                quality: "standard",
                style: "natural"
            });
            const b64 = response.data[0].b64_json;
            return Buffer.from(b64, 'base64');
        }
    } catch (error) {
        console.error(`OpenAI Image Gen Failed (${model}):`, error);
        throw error;
    }
};

/**
 * Upload buffer to R2 and return public URL
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
exports.uploadToR2 = async (buffer) => {
    try {
        const fileName = `gen_img_${crypto.randomUUID()}.png`;
        const key = `generated/${fileName}`;

        await r2.send(
            new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: "image/png",
                CacheControl: "public, max-age=31536000"
            })
        );

        return `${R2_PUBLIC_BASE_URL}/${key}`;
    } catch (error) {
        console.error("R2 Upload Failed:", error);
        throw error;
    }
};
