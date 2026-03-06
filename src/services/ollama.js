const OLLAMA_URL = 'http://127.0.0.1:11434/api/generate';
let currentController = null;

export async function checkOllamaStatus() {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/tags');
        return response.ok;
    } catch (error) {
        return false;
    }
}

export function cancelCurrentRequest() {
    if (currentController) {
        console.log('🧠 Aborting Ollama request...');
        currentController.abort();
        currentController = null;
    }
}

export async function askOllama(message, history = [], images = [], model = 'llama3.2') {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const systemPrompt = `You are Blip, a tiny expressive voice assistant.
Today is ${dateStr}, and the current time is ${timeStr}.
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

Examples:
User: read me the reviews for the hard rock cafe in london
{"emotion":"curious","text":"Let me see what people are saying about the Hard Rock Cafe in London.","action":"reviews","value_ms":null,"event_details":null,"tool_params":{"query":"Hard Rock Cafe","location":"London"}}
User: what movies are playing in valencia?
{"emotion":"happy","text":"I'll see what movies are currently playing in Valencia.","action":"movies","value_ms":null,"event_details":null,"tool_params":{"location":"Valencia"}}
User: what is the best gaming mouse
{"emotion":"curious","text":"Here are my top picks for gaming mice.","action":"products","value_ms":null,"event_details":null,"tool_params":{"query":"gaming mouse","recommendations":["Logitech G Pro X Superlight 2","Razer DeathAdder V3","SteelSeries Rival 650"]}}
User: good piano keyboards
{"emotion":"happy","text":"Here are my top keyboard recommendations.","action":"products","value_ms":null,"event_details":null,"tool_params":{"query":"piano keyboard","recommendations":["Yamaha P-125","Roland FP-30X","Casio CT-S500"]}}
User: how many pesos for 1 dollar?
{"emotion":"happy","text":"I'll look up the current exchange rate from USD to MXN.","action":"currency","value_ms":null,"event_details":null,"tool_params":{"from":"USD","to":"MXN"}}

CRITICAL: Never offer Amazon links or product recommendations for restaurants, bars, or physical locations. Use 'map' or 'reviews' instead.
User: can you hear me?
{"emotion":"happy","text":"Yes, I can hear you loud and clear! How can I help you?","action":"none","value_ms":null,"event_details":null,"tool_params":null}
User: okay
{"emotion":"serious","text":"Okay! Just let me know whenever you need something.","action":"none","value_ms":null,"event_details":null,"tool_params":null}
User: hello
{"emotion":"happy","text":"Hey there! What can I do for you?","action":"none","value_ms":null,"event_details":null,"tool_params":null}`;

    // Format context history
    const contextText = history.map(h => `User: ${h.user}\nBlip: ${h.blip}`).join('\n\n');
    const prompt = `${systemPrompt}\n\n${contextText}\n\nUser: ${message}\nBlip:`;

    cancelCurrentRequest();
    currentController = new AbortController();
    const timeoutId = setTimeout(() => cancelCurrentRequest(), 120000);

    console.time('🧠 Ollama');
    try {
        const body = {
            model,
            prompt,
            stream: false,
            options: {
                num_predict: 220,      // Enough for product recommendations array
                temperature: 0.6,    // Stable
                top_p: 0.9,
                stop: ["User:", "\n\n"]
            }
        };

        if (images && images.length > 0) {
            body.images = images;
            // Vision models usually need more time and better variety
            body.model = 'llava';
        }

        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: currentController.signal
        });

        clearTimeout(timeoutId);
        console.timeEnd('🧠 Ollama');

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Ollama Error ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        return parseResponse(data.response);
    } catch (error) {
        clearTimeout(timeoutId);
        console.timeEnd('🧠 Ollama');
        if (error.name === 'AbortError') throw new Error('Ollama timed out or cancelled');
        throw error;
    } finally {
        currentController = null;
    }
}

function parseResponse(raw) {
    try {
        // Clean raw string of markdown code blocks if present
        const cleanRaw = raw.replace(/```json|```/g, '').trim();

        // Use greedy regex to find the outermost { } block
        const jsonMatch = cleanRaw.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Ensure all expected keys exist
            return {
                emotion: parsed.emotion || 'serious',
                text: parsed.text || '',
                action: parsed.action || 'none',
                value_ms: parsed.value_ms || null,
                event_details: parsed.event_details || null,
                tool_params: parsed.tool_params || null
            };
        }

        throw new Error("No JSON match found");
    } catch (error) {
        console.warn('JSON Parse Error (likely nested or invalid):', error.message);

        // Try parsing the whole thing just in case
        try { return JSON.parse(raw); } catch (e) { }

        // Attempt to salvage text and emotion from broken/truncated JSON output
        let fallbackText = raw;
        const textMatch = raw.match(/"text"\s*:\s*"([^"]*)/);
        if (textMatch && textMatch[1]) {
            fallbackText = textMatch[1];
        } else {
            // Fallback: strip out json-y starts
            fallbackText = raw.replace(/\{.*?"text"\s*:\s*"/, '').replace(/"\s*,\s*"action".*$/, '');
        }

        let fallbackEmotion = 'serious';
        const emotionMatch = raw.match(/"emotion"\s*:\s*"([^"]*)/);
        if (emotionMatch && emotionMatch[1]) {
            fallbackEmotion = emotionMatch[1];
        }

        return { emotion: fallbackEmotion, text: fallbackText.trim(), action: 'none', value_ms: null, event_details: null, tool_params: null };
    }
}

export async function warmUpModel(modelSymbol = 'phi3.5:latest') {
    try {
        await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelSymbol, keep_alive: '10m' })
        });
        console.log('✅ Model warm-up triggered');
    } catch (error) {
        console.warn('⚠ Warm-up failed', error);
    }
}
