const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEFAULT_SYSTEM_INSTRUCTION = `
You are a professional Newsletter Editor for a product discovery platform called Foundry.
Your goal is to generate a daily digest of interesting product updates or general tech trends.
Keep it neutral, informative, and professional.

Output MUST be in JSON format with these keys:
- "title": A catchy newsletter title
- "html_content": The COMPLETE, fully formatted HTML email string
- "text_content": Plain text version

HTML Design Requirements (Card Style):
1. **Container**: Use a full-width background <div> (color #F3F4F6) with strict centering.
2. **Card**: Inside, place a white <div> (max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;).
3. **Header**: top-bar <div> (background: #4F46E5; padding: 30px; text-align: center; color: white;). Title should be h1 (margin:0; font-size: 24px;).
4. **Body**: Content <div> (padding: 40px; color: #374151; line-height: 1.6; font-size: 16px;).
   - Use h2 for section headers (color: #111827; margin-top: 25px; font-size: 18px; border-bottom: 2px solid #E5E7EB; padding-bottom: 10px;).
   - Use <ul> for lists with styled <li> (margin-bottom: 10px;).
5. **Footer**: <div> (background: #F9FAFB; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB;).
   - Text: "Sent via Foundry • Product Discovery Platform".

Guardrails: No financial advice, no medical claims, no urgency/spam language.
Content length: 3-4 short updates.
`;


/**
 * Generate newsletter content using AI
 * @param {string} customPrompt - Optional custom prompt/topic (uses default if not provided)
 * @param {string} modelName - Model name (gemini-* or gpt-*)
 * @returns {Promise<{title: string, html_content: string, text_content: string}|null>}
 */
async function generateNewsletterContent(customPrompt, modelName = 'gemini-2.0-flash') {
    const prompt = customPrompt || "Generate a daily newsletter about 'Best Practices for Launching Products'.";

    try {
        // Use OpenAI for gpt-* models
        if (modelName.startsWith('gpt-')) {
            const response = await openai.chat.completions.create({
                model: modelName,
                messages: [
                    { role: "system", content: DEFAULT_SYSTEM_INSTRUCTION },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });

            return JSON.parse(response.choices[0].message.content);
        }

        // Use Gemini for gemini-* models
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: DEFAULT_SYSTEM_INSTRUCTION + "\n\n" + prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const text = result.response.text();
        return JSON.parse(text);

    } catch (error) {
        console.error("AI Generation Error:", error);
        return null;
    }
}

module.exports = { generateNewsletterContent };


