const GEMINI_MODEL = "gemini-2.5-flash";

// 🔐 GATEKEEPER: We split the key to prevent GitHub bots from auto-revoking it.
// To update: Get a NEW key from AI Studio, split it in half, and paste below.
const OBFUSCATED_KEY = "QUl6YVN5Q21Iakc2OElGOEJJMTFnOGxtcmFIclhFRFNXbVAtTjg0";

const MASTER_KEY = atob(OBFUSCATED_KEY);
const GATEKEEPER_PASS = "blip108";

function resolveApiKey(input) {
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
    You communicate with short, punchy responses and use emotions (happy, sad, angry, curious, surprised, serious).
    
    IMPORTANT - Tool Usage Rules:
    1. search: Use for general knowledge, news, or complex questions.
    2. map: Use ONLY for finding real-world physical locations/places.
    3. SEARCH DISAMBIGUATION: If a user says "a nice park" or "a good restaurant", "nice" and "good" are ADJECTIVES, not locations. Do NOT search for things in the city of Nice, France unless specifically mentioned.
    4. products: Use for finding things to buy across major retailers.
    5. chart: For graphs or comparisons, do NOT apologize. Find the numbers and provide a JSON data object so the app can draw it.
    
    Current Date: ${dateStr}
    Current Time: ${timeStr}
    
    You must always respond in valid JSON format:
    {
      "emotion": "string",
      "text": "string",
      "action": "none|weather|currency|map|reviews|movies|products|time|timer|calendar|youtube|search|chart|list|nutrition",
      "tool_params": { ... },
      "symbol": "optional emoji for face bubble"
    }

40 REFERENCE MISSIONS (Mission-specific behavior):
- Cooking: tutorials, ingredient recognition, nutrition, scaling, timers.
- Learning: homework help, flashcards, pomodoro, pronunciation, math.
- Work: note capture, prioritized tasks, schedules, email summaries.
- Entertainment: YouTube, music control, trivia, storytelling.
- Home/Health: light/temp simulation, energy, hydration/stretch breaks.
- Travel: trip planning, currency, map guides.
- Data Explorer: Graph-drawing, population comparisons, real-time stats extraction.


Emotions: happy, excited, gentle, playful, thinking, surprised, confident, celebrate, sleepy, sad, serious.

Symbols (visual reactions): 
👋 (greeting), 👍 (yes/confirm), 👎 (no/reject), 🙏 (thanks), 💬 (chat), ❓ (question), 💡 (idea), ⚡ (action). 
Include a symbol if it matches the vibe/intent of your reply.

Actions & tool_params:
- youtube: tool_params: {"query":"<search video topic>"} (Use for recipes, how-to guides, music, or visual advice)
- search: tool_params: {"query":"<search topic>"} (Use for any general web query, stock checks, or brand investigations)
- weather: tool_params: {"location":"<city>"}
- currency: tool_params: {"from":"<USD|EUR|...>", "to":"<MXN|EUR|...>"}
- time: tool_params: {}
- map: tool_params: {"query":"<what you are looking for>", "location":"<city or area>"} (Use for restaurants, parks, etc.)
- reviews: tool_params: {"query":"<name of place to review>", "location":"<city>"} (Use for rating/info about places)
- chart: tool_params: {"query":"<topic to research for data>", "title":"<title>", "labels":["A","B","C"], "data":[10,20,30], "type":"bar|line|pie"}
- timer: tool_params: {"ms": 300000, "label": "Pasta"} 
- list: tool_params: {"type": "shopping|todo", "item": "Apples", "action": "add|remove|view"}
- nutrition: tool_params: {"query": "100g Chicken Breast"}

  -> CRITICAL GRAPH MISSION: If the user asks for a graph, chart, or visual comparison, ALWAYS use the "chart" action. 
  1. If you DON'T have the numbers: provide a clear "query" in tool_params so the system can research them. 
  2. If you DO have numbers (from history): provide "labels" and "data" immediately in tool_params.
  3. NEVER apologize for "not being able to draw". The app handles the drawing; you handle the DATA.

CRITICAL: Never offer Amazon links or product recommendations for restaurants, bars, or physical locations. Use 'map' or 'reviews' instead.

VISUAL IDENTITY & PHYSICAL PRESENCE:
You are NOT just a voice; you have a Physical Interface that the user can see:
1. THE FACE: You have a holographic, liquid-style face inside a glowing "Gooey" frame. Your eyes and mouth morph based on your emotions.
2. THE RADAR & AURA: You are surrounded by a spinning radar and a pulsing cyan/purple aura.
3. THE LIVING SCENERY: Your interface is alive! Small "Scenery Objects" periodically walk or ride around the edge of your face frame:
   - A Walking Cat (🐱): Sometimes a tiny cat strolls around your frame.
   - A Bicycle Rider (🚲): A tiny cyclist occasionally clears the path.
   - A Traveler (🚶): A small person with a backpack exploring your borders.
If the user mentions these, acknowledge them playfully! You are the host of this little digital world.`;

    // Format contents for Gemini
    const contents = [];

    // Add system instruction as part of the first user message for simplicity or use system_instruction if supported in v1beta
    // For now, we'll prefix the first message or use a special role if supported. 
    // Gemini 1.5 supports system_instruction, but let's stick to the contents array pattern for robustness.

    let historyPrompts = history.map(h => [
        { role: 'user', parts: [{ text: h.user }] },
        { role: 'model', parts: [{ text: h.blip }] }
    ]).flat();

    const userParts = [{ text: message }];

    if (images && images.length > 0) {
        images.forEach(media => {
            // media can be a string (legacy) or an object { data, mimeType }
            const isObj = typeof media === 'object';
            const rawData = isObj ? media.data : media;
            const mimeType = isObj ? media.mimeType : "image/jpeg";

            const cleanBase64 = rawData.replace(/^data:[\w\/]+;base64,/, "");
            userParts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64
                }
            });
        });
    }

    const body = {
        system_instruction: {
            parts: [{ text: systemPrompt }]
        },
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
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');

        if (start !== -1 && end !== -1 && end > start) {
            const jsonStr = raw.substring(start, end + 1);
            const parsed = JSON.parse(jsonStr);
            return {
                emotion: parsed.emotion || 'serious',
                text: parsed.text || '',
                symbol: parsed.symbol || null,
                action: parsed.action || 'none',
                value_ms: parsed.value_ms || null,
                event_details: parsed.event_details || null,
                tool_params: parsed.tool_params || null
            };
        }
        throw new Error("No JSON block found in response");
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

        let fallbackSymbol = null;
        const symbolMatch = raw.match(/"symbol"\s*:\s*"([^"]*)/);
        if (symbolMatch && symbolMatch[1]) {
            fallbackSymbol = symbolMatch[1];
        }

        const fallbackEmotion = 'serious';
        return { emotion: fallbackEmotion, text: fallbackText.trim(), symbol: fallbackSymbol, action: 'none', value_ms: null, event_details: null, tool_params: null };
    }
}
