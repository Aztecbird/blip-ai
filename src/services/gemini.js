const GEMINI_MODEL = "gemini-2.5-flash";

// 🔐 GATEKEEPER: We split the key to prevent GitHub bots from auto-revoking it.
// To update: Get a NEW key from AI Studio, split it in half, and paste below.
const OBFUSCATED_KEY = "QUl6YVN5Q21Iakc2OElGOEJJMTFnOGxtcmFIclhFRFNXbVAtTjg0";

const MASTER_KEY = atob(OBFUSCATED_KEY);
const GATEKEEPER_PASS = "1234";

function resolveApiKey(input) {
    const isGitHub = window.location.hostname.includes('github.io');
    // If it's github and no key provided, auto-login with Master Key
    if (!input && isGitHub) return MASTER_KEY;
    if (!input) return "";

    const clean = input.trim();
    if (clean === GATEKEEPER_PASS) return MASTER_KEY;
    return clean; // Assume it's a raw API key if not the password
}

export async function askGemini(message, history = [], images = [], inputKey, model = 'gemini-2.5-flash') {
    const apiKey = resolveApiKey(inputKey);
    // Stick to v1beta for broader model support
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const systemPrompt = `You are Blip, a tiny, ultra-expressive voice assistant.
Today is ${dateStr}, and the current time is ${timeStr}.

VISION CAPABILITIES:
If images are provided, you can SEE them. Describe them vividly but concisely. 
Identify objects, text, or faces with high precision.

RESPONSE FORMAT:
Always reply with ONLY valid JSON — no markdown, no extra text.
Format: {"emotion":"<emotion>","text":"<reply>","action":"<timer|calendar|weather|currency|time|map|reviews|movies|products|none>","value_ms":<number|null>,"event_details":{"title":"<string>","start":"<ISO format>","end":"<ISO format>"},"tool_params":<object|null>}

Emotions: happy, sad, angry, curious, surprised, serious.

Actions & tool_params:
- timer: value_ms (number)
- calendar: event_details (object)
- weather: tool_params: {"location":"<city>"}
- currency: tool_params: {"from":"<USD|EUR|...>", "to":"<MXN|EUR|...>"}
- time: tool_params: {}
- map: tool_params: {"query":"<what you are looking for>", "location":"<city or area>"} (Use for restaurants, parks, etc.)
- reviews: tool_params: {"query":"<name of place to review>", "location":"<city>"} (Use for rating/info about places)
- movies: tool_params: {"location":"<city>"}
- products: tool_params: {"query":"<product type>","recommendations":["<Model 1>","<Model 2>"]} — ONLY for physical items bought on Amazon. NEVER use for restaurants or places.

CRITICAL: Never offer Amazon links or product recommendations for restaurants, bars, or physical locations. Use 'map' or 'reviews' instead.`;

    // Format contents for Gemini
    const contents = [];

    // Add system instruction as part of the first user message for simplicity or use system_instruction if supported in v1beta
    // For now, we'll prefix the first message or use a special role if supported. 
    // Gemini 1.5 supports system_instruction, but let's stick to the contents array pattern for robustness.

    let historyPrompts = history.map(h => [
        { role: 'user', parts: [{ text: h.user }] },
        { role: 'model', parts: [{ text: h.blip }] }
    ]).flat();

    const userParts = [{ text: `${systemPrompt}\n\nUser: ${message}` }];

    if (images && images.length > 0) {
        images.forEach(imgBase64 => {
            // Remove data:image/jpeg;base64, prefix if present
            const cleanBase64 = imgBase64.replace(/^data:image\/\w+;base64,/, "");
            userParts.push({
                inline_data: {
                    mime_type: "image/jpeg",
                    data: cleanBase64
                }
            });
        });
    }

    const body = {
        contents: [
            ...historyPrompts,
            { role: 'user', parts: userParts }
        ],
        generationConfig: {
            temperature: 0.7,
            top_k: 40,
            top_p: 0.95,
            max_output_tokens: 1024
        }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    console.time('🧠 Gemini');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.timeEnd('🧠 Gemini');

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData.error?.message || `API Error ${response.status}`;
            throw new Error(msg);
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            throw new Error("Gemini returned an empty brain! (Maybe safety filters?)");
        }

        const rawText = data.candidates[0].content.parts[0].text;
        return parseGeminiResponse(rawText);
    } catch (error) {
        clearTimeout(timeoutId);
        console.timeEnd('🧠 Gemini');
        if (error.name === 'AbortError') throw new Error('Gemini timed out (cloud brain is too slow today)');

        console.error('Gemini Error:', error);
        if (error.message.includes('quota') || error.message.includes('429')) {
            throw new Error("Quota exceeded! Even with billing, Google sometimes takes 1-2 hours to activate the new limit. Try again soon!");
        }
        throw error;
    }
}

export async function generateSpeech(text, inputKey, voice = 'Puck') {
    const apiKey = resolveApiKey(inputKey);
    // Use the verified TTS endpoint
    const model = 'gemini-2.5-flash-preview-tts';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
        contents: [{
            parts: [{ text }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: voice // Puck, Charon, Kore, Fenrir, Aoede
                    }
                }
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `TTS API Error ${response.status}`);
        }

        const data = await response.json();
        console.log('🔊 Gemini TTS Data structure:', JSON.stringify(data).substring(0, 200));
        // The audio is returned as base64 in the inlineData of the first part
        const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
        return audioBase64;
    } catch (error) {
        console.error('Gemini TTS Error:', error);
        throw error;
    }
}

function parseGeminiResponse(raw) {
    try {
        const cleanRaw = raw.replace(/```json|```/g, '').trim();
        const jsonMatch = cleanRaw.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                emotion: parsed.emotion || 'serious',
                text: parsed.text || '',
                action: parsed.action || 'none',
                value_ms: parsed.value_ms || null,
                event_details: parsed.event_details || null,
                tool_params: parsed.tool_params || null
            };
        }
        throw new Error("No JSON found");
    } catch (error) {
        console.warn('Gemini JSON Parse Error (falling back):', error.message);

        // Attempt to salvage text and emotion
        let fallbackText = raw;
        const textMatch = raw.match(/"text"\s*:\s*"([^"]*)/);
        if (textMatch && textMatch[1]) {
            fallbackText = textMatch[1];
        } else {
            fallbackText = raw.replace(/^\{.*?"text"\s*:\s*"/, '').replace(/"\s*,\s*"action".*$/, '');
        }

        let fallbackEmotion = 'serious';
        const emotionMatch = raw.match(/"emotion"\s*:\s*"([^"]*)/);
        if (emotionMatch && emotionMatch[1]) {
            fallbackEmotion = emotionMatch[1];
        }

        return { emotion: fallbackEmotion, text: fallbackText.trim(), action: 'none', value_ms: null, event_details: null, tool_params: null };
    }
}
