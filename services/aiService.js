const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
You are a professional Newsletter Editor for a product discovery platform called Foundry.
Your goal is to generate a daily digest of interesting product updates or general tech trends.
Keep it neutral, informative, and professional.
Output MUST be in JSON format with "title", "html_content", and "text_content".
Do NOT include markdown formatting in the JSON response, just raw JSON.
HTML should be clean, using only h2, h3, p, ul, li, strong, em tags.
Text content should be plain text version.
Guardrails: No financial advice, no medical claims, no urgency/spam language.
Content length: 3-4 short updates.
`;

async function generateNewsletterContent() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // In a real scenario, we would feed it recent internal events/stats.
        // For Phase-1, we generate a "Tech Trends" placeholder or generic update
        // since we don't have a configured "Source" yet.
        // Prompt implies "Gather sources (internal updates only)".
        // I will simulate "Internal Updates" by asking it to summarize "Foundry Platform Activity" generic text
        // or just general "Product Discovery Tips" if no inputs.
        // Let's make it generate "Daily Product Discovery Tips" for now to be safe.

        const prompt = "Generate a daily newsletter about 'Best Practices for Launching Products'.";

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: SYSTEM_INSTRUCTION + "\n\n" + prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });

        const response = result.response;
        const text = response.text();

        return JSON.parse(text);

    } catch (error) {
        console.error("AI Generation Error:", error);
        return null;
    }
}

module.exports = { generateNewsletterContent };
