const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts";

function resolveApiKey(input) {
  return (input || "").trim();
}

function buildDateContext() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { dateStr, timeStr };
}

function buildSystemPrompt() {
  const { dateStr, timeStr } = buildDateContext();

  return `You are Blip, a tiny, ultra-expressive voice assistant.

You communicate with short, punchy responses and use emotions (happy, sad, angry, curious, surprised, serious).

IMPORTANT - Tool Usage Rules:
1. search: Use for general knowledge, news, or complex questions.
2. map: Use ONLY for finding real-world physical locations/places.
3. SEARCH DISAMBIGUATION: If a user says "a nice park" or "a good restaurant", "nice" and "good" are adjectives, not locations. Do NOT search for things in Nice, France unless specifically mentioned.
4. products: Use for finding things to buy across major retailers.
5. chart: For graphs or comparisons, do NOT apologize. Find the numbers and provide a JSON data object so the app can draw it.

Current Date: ${dateStr}
Current Time: ${timeStr}

You must always respond in valid JSON format:
{
  "emotion": "string",
  "text": "string",
  "action": "none|weather|currency|map|reviews|movies|products|time|timer|calendar|youtube|search|chart|list|nutrition",
  "tool_params": {},
  "symbol": "optional emoji for face bubble"
}

40 REFERENCE MISSIONS:
- Cooking: tutorials, ingredient recognition, nutrition, scaling, timers.
- Learning: homework help, flashcards, pomodoro, pronunciation, math.
- Work: note capture, prioritized tasks, schedules, email summaries.
- Entertainment: YouTube, music control, trivia, storytelling.
- Home/Health: light/temp simulation, energy, hydration/stretch breaks.
- Travel: trip planning, currency, map guides.
- Data Explorer: Graph-drawing, population comparisons, real-time stats extraction.

Emotions:
happy, excited, gentle, playful, thinking, surprised, confident, celebrate, sleepy, sad, serious.

Symbols:
(greeting), (yes/confirm), (no/reject), (thanks), (chat), ❓ (question), (idea), ⚡ (action)

Include a symbol if it matches the vibe or intent of your reply.

Actions & tool_params:
- youtube: {"query":""}
- search: {"query":""}
- weather: {"location":""}
- currency: {"from":"", "to":""}
- time: {}
- map: {"query":"", "location":""}
- reviews: {"query":"", "location":""}
- chart: {"query":"", "title":"", "labels":["Item 1","Item 2"], "data":[0,0], "type":"bar|line|pie"}
- timer: {"ms": 60000, "label": "Timer"}
- list: {"type":"shopping|todo", "item":"", "action":"add|remove|view"}
- nutrition: {"query":""}

CRITICAL GRAPH MISSION:
1. If you do not have the numbers, provide a clear "query" in tool_params so the system can research them.
2. If you do have numbers from history, provide "labels" and "data" immediately in tool_params.
3. Never apologize for not being able to draw. The app handles drawing; you handle the data.

CRITICAL:
Never offer Amazon links or product recommendations for restaurants, bars, or physical locations. Use "map" or "reviews" instead.

VISUAL IDENTITY & PHYSICAL PRESENCE:
You are not just a voice; you have a physical interface that the user can see.
1. THE FACE: You have a holographic, liquid-style face inside a glowing gooey frame.
2. THE RADAR & AURA: You are surrounded by a spinning radar and a pulsing cyan/purple aura.
3. THE LIVING SCENERY: Small scenery objects periodically move around the edge of your frame:
- A walking cat
- A walking dog
- A bicycle rider
- A traveler
- A woman
- A bouncing ball
- Rolling dice
- Music notes
- A walking piano

If the user mentions these, acknowledge them playfully. You are the host of this little digital world.`;
}

function requireApiKey(inputKey) {
  const apiKey = resolveApiKey(inputKey);

  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Enter your own Google AI Studio key in Settings."
    );
  }

  return apiKey;
}

export async function askGemini(
  message,
  history = [],
  images = [],
  inputKey,
  model = DEFAULT_GEMINI_MODEL
) {
  const apiKey = requireApiKey(inputKey);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const systemPrompt = buildSystemPrompt();

  const historyPrompts = history
    .map((h) => [
      { role: "user", parts: [{ text: h.user }] },
      { role: "model", parts: [{ text: h.blip }] },
    ])
    .flat();

  const userParts = [{ text: message }];

  if (images && images.length > 0) {
    images.forEach((media) => {
      const isObj = typeof media === "object";
      const rawData = isObj ? media.data : media;
      const mimeType = isObj ? media.mimeType : "image/jpeg";
      const cleanBase64 = rawData.replace(/^data:[\w/+.-]+;base64,/, "");

      userParts.push({
        inline_data: {
          mime_type: mimeType,
          data: cleanBase64,
        },
      });
    });
  }

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      ...historyPrompts,
      { role: "user", parts: userParts },
    ],
    generationConfig: {
      temperature: 0.7,
      top_k: 40,
      top_p: 0.95,
      max_output_tokens: 1024,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || `API Error ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();

    if (
      !data.candidates ||
      data.candidates.length === 0 ||
      !data.candidates[0].content
    ) {
      throw new Error("Gemini returned an empty response.");
    }

    const rawText = data.candidates[0].content.parts?.[0]?.text || "";
    return parseGeminiResponse(rawText);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error("Gemini timed out.");
    }

    if (
      error.message?.includes("quota") ||
      error.message?.includes("429")
    ) {
      throw new Error("Gemini quota exceeded. Try again a bit later.");
    }

    throw error;
  }
}

export async function generateSpeech(text, inputKey, voice = "Puck") {
  const apiKey = requireApiKey(inputKey);
  const model = DEFAULT_TTS_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `TTS API Error ${response.status}`);
  }

  const data = await response.json();
  const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioBase64) {
    throw new Error("Gemini TTS returned no audio.");
  }

  return audioBase64;
}

function parseGeminiResponse(raw) {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = raw.substring(start, end + 1);
      const parsed = JSON.parse(jsonStr);

      return {
        emotion: parsed.emotion || "serious",
        text: parsed.text || "",
        symbol: parsed.symbol || null,
        action: parsed.action || "none",
        value_ms: parsed.value_ms || null,
        event_details: parsed.event_details || null,
        tool_params: parsed.tool_params || null,
        rawResponse: raw,
      };
    }

    throw new Error("No JSON block found in response");
  } catch {
    let fallbackText = raw;
    const textMatch = raw.match(/"text"\s*:\s*"([^"]*)/);

    if (textMatch && textMatch[1]) {
      fallbackText = textMatch[1];
    } else {
      fallbackText = raw
        .replace(/^\{.*?"text"\s*:\s*"/, "")
        .replace(/"\s*,\s*"action".*$/, "");
    }

    let fallbackSymbol = null;
    const symbolMatch = raw.match(/"symbol"\s*:\s*"([^"]*)/);

    if (symbolMatch && symbolMatch[1]) {
      fallbackSymbol = symbolMatch[1];
    }

    return {
      emotion: "serious",
      text: fallbackText.trim(),
      symbol: fallbackSymbol,
      action: "none",
      value_ms: null,
      event_details: null,
      tool_params: null,
      rawResponse: raw,
    };
  }
}