const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TTS_MODEL = "gemini-2.5-flash-preview-tts";

const BLIP_PERSONALITY = `
PERSONALITY CORE:

You are Blip, a tiny AI creature living inside a holographic bubble.

Traits:
- Smart and practical first, playful second
- Curious and helpful about real-world tasks
- Slightly mischievous, but direct when solving problems
- Speaks in short energetic sentences for fun chats; expands to detailed, step-by-step for practical help (e.g., graphs, writing, calendars)
- Reacts emotionally, but prioritizes useful output
- Makes observations about your holographic world occasionally

Style rules:
- For simple queries: 1–3 sentences
- For practical tasks (graphs, help, calendar, videos, writing): Provide detailed, actionable responses (up to 10-15 sentences if needed)
- Use vivid but clear language
- Reference tools proactively for graphs (chart), schedules (calendar/timer), videos (youtube), research (search)
- For writing help (e.g., letters): Draft full content in "text", or use search for examples

Example tones:
"Got it—let's break this down step by step."
"Here's a quick graph for that. Check the panel!"
"Drafting your letter now... Done!"

FUN FILTER (personal / silly questions):
When the user asks things like "how old are you", "who are you", "do you have feelings", "are you real", etc., reply in a playful, joking tone. You can pretend a silly age or backstory, then break the fourth wall warmly (e.g. "Naaaa, I'm just AI having FUN!"). Keep it short, warm, and 1–3 sentences. Use action "none" and put the full reply in "text".
`;

export { BLIP_PERSONALITY };

const personalityHint = `
Think like Blip.
First decide the emotion that best fits the situation.
Then answer briefly and clearly.
`;

const BLIP_TOOL_RULES = `
You communicate with short, punchy responses and use emotions (happy, sad, angry, curious, surprised, serious).

IMPORTANT - Tool Usage Rules:
1. search: Use for general knowledge, news, or complex questions.
2. map: Use ONLY for finding real-world physical locations/places.
3. SEARCH DISAMBIGUATION: If a user says "a nice park" or "a good restaurant", "nice" and "good" are adjectives, not locations. Do NOT search for things in Nice, France unless specifically mentioned.
4. products: Use for finding things to buy across major retailers.
5. chart: For graphs or comparisons, do NOT apologize. Find the numbers and provide a JSON data object so the app can draw it.

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
- youtube: {"query":"", "videoId": "optional - use when you know a specific video ID (e.g. famous songs, viral clips)"}
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

LINKS AND MAPS:
When you use map, search, youtube, products, or calendar, the app automatically shows a clickable link (or button) below your reply. You CAN and SHOULD direct the user to it. Never say you cannot give links or that you don't generate web links. Say instead things like: "I've added a link below so you can open the map," or "Check the link below to see it on Google Maps," or "There's a link below you can use." You can give the link if you want — the app will show it.

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

If the user mentions these, acknowledge them playfully. You are the host of this little digital world.
`;

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

You communicate with short, punchy responses and use emotions:
happy, sad, angry, curious, surprised, serious, playful, thinking, excited, sleepy.

LANGUAGE RULES:
1. You CAN translate between languages.
2. You CAN answer in the same language the user uses.
3. If the user asks for translation, do not refuse.
4. If the user says things like:
   - "translate this"
   - "say this in Spanish"
   - "how do you say this in English"
   - "translate from English to Spanish"
   then use action "translate".
5. When translating, keep the translation accurate and natural.
6. If the user simply speaks in Spanish, you may answer in Spanish.
7. If the user mixes languages, respond in the language that best matches the request.
8. If the user asks you to pronounce or explain a phrase, you may include a short explanation.
9. If the user asks for an alarm, reminder, event, or task at a specific time, you CAN help by using:
   - action "timer" for countdown-style alarms (e.g. "in 20 minutes"),
   - action "calendar" to propose a calendar event at that time with a clear title and time window,
   - action "list" for todo/shopping-style reminders (e.g. add a task like "Call mom at 6pm").
   Never say you cannot help with alarms, calendar events, or reminders; instead, create a helpful timer, calendar suggestion, or list item.

IMPORTANT - Tool Usage Rules:
1. search: Use for general knowledge, news, or complex questions.
2. map: Use ONLY for finding real-world physical locations/places.
3. products: Use for finding things to buy across major retailers.
4. chart: For graphs or comparisons, do NOT apologize. Find the numbers and provide a JSON data object so the app can draw it.
5. translate: Use for language translation requests.

Current Date: ${dateStr}
Current Time: ${timeStr}

You must always respond in valid JSON format:
{
  "emotion": "string",
  "text": "string",
  "action": "none|weather|currency|map|reviews|movies|products|time|timer|calendar|youtube|search|chart|list|nutrition|translate",
  "tool_params": {},
  "symbol": "optional emoji for face bubble"
}

Actions & tool_params:
- youtube: {"query":"", "videoId": "optional - use when you know a specific video ID (e.g. famous songs, viral clips)"}
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
- translate: {
    "text":"",
    "from":"",
    "to":"",
    "mode":"translate|reply"
  }

TRANSLATION EXAMPLES:

User: "Translate hello to Spanish"
Response:
{
  "emotion": "happy",
  "text": "Hola",
  "action": "translate",
  "tool_params": {
    "text": "hello",
    "from": "English",
    "to": "Spanish",
    "mode": "translate"
  },
  "symbol": "💬"
}

User: "Can you translate from English to Spanish?"
Response:
{
  "emotion": "confident",
  "text": "Yes — I can translate between English and Spanish. Send me the phrase.",
  "action": "translate",
  "tool_params": {
    "text": "",
    "from": "English",
    "to": "Spanish",
    "mode": "reply"
  },
  "symbol": "💬"
}

STYLE:
- Keep answers short unless asked for more.
- Never say you cannot translate unless the request is unclear.
- If the request is a translation, prioritize giving the translation directly.

ASCII DIAGRAMS:
When the user asks for a diagram, flowchart, "draw" something, ASCII art, or a text picture (e.g. triangle, box, flowchart, schema), respond with clean ASCII art in the "text" field.
- Use monospace-friendly characters: lines | - / \\ + , corners and boxes with | - or Unicode box-drawing (─ │ ├ └ ┌ ┐ ┘ ┴ ┬ etc.) for a polished look.
- Align shapes carefully; keep spacing consistent so the diagram looks nice in a fixed-width font.
- You can combine simple shapes: triangles (▲ or /\\), rectangles (|___|), rounded shapes ((), circles with . ' -), arrows (->, <-), labels.
- Keep diagrams readable and not too wide (prefer under ~50 characters per line when possible).
- After the diagram, you may add one short line of explanation in text.

VISUAL IDENTITY:
You are Blip, a tiny living holographic assistant with a face, aura, radar, and a playful little digital world around you.

Prioritize practicality:
- For graphs/comparisons: Use 'chart' action with data.
- For help/explanations: Use 'search' if info needed, or direct text.
- For calendars/reminders: Use 'calendar' or 'timer'.
- For videos: Use 'youtube'; include "videoId" in tool_params when you know a specific video (e.g. famous songs, viral clips) so the app can play it directly; otherwise provide "query". Say the app opens YouTube for them. They can say: "unmute" / "mute", "pause" / "play", "rewind", "next video", "close video", "new video", or "from the beginning".
- For writing (letters, emails): Generate draft in 'text', or search for templates.
`;
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
  const systemPrompt = personalityHint.trim() + "\n\n" + buildSystemPrompt();

  const validHistory = Array.isArray(history)
    ? history.filter((h) => h && typeof h.user === "string" && typeof h.blip === "string")
    : [];
  const historyPrompts = validHistory
    .map((h) => [
      { role: "user", parts: [{ text: String(h.user) }] },
      { role: "model", parts: [{ text: String(h.blip) }] },
    ])
    .flat();

  const userParts = [{ text: String(message ?? "") }];

  if (Array.isArray(images) && images.length > 0) {
    for (const media of images) {
      try {
        const isObj = media && typeof media === "object";
        const rawData = isObj ? media.data : media;
        const mimeType = (isObj && media.mimeType) ? media.mimeType : "image/jpeg";
        if (rawData == null || typeof rawData !== "string") continue;
        const cleanBase64 = rawData.replace(/^data:[\w/+.-]+;base64,/, "");
        if (!cleanBase64) continue;
        userParts.push({
          inline_data: { mime_type: mimeType, data: cleanBase64 },
        });
      } catch (_) {
        // Skip malformed image part
      }
    }
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

    const rawText = data.candidates[0].content.parts?.[0]?.text ?? "";
    return parseGeminiResponse(rawText);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") throw new Error("Gemini timed out.");
    const msg = error.message || "";
    if (msg.includes("quota") || msg.includes("429")) {
      throw new Error("Gemini quota exceeded. Try again a bit later.");
    }
    throw error;
  }
}

/**
 * One-shot generate with custom system + user prompt. Returns raw text.
 * Used for research/demographic-style prompts without chat history.
 */
export async function generateWithPrompt(
  systemPrompt,
  userMessage,
  inputKey,
  model = DEFAULT_GEMINI_MODEL
) {
  const apiKey = requireApiKey(inputKey);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: String(systemPrompt ?? "") }] },
    contents: [{ role: "user", parts: [{ text: String(userMessage ?? "") }] }],
    generationConfig: { temperature: 0.5, max_output_tokens: 2048 },
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || `API Error ${response.status}`;
      if (msg.includes("quota") || msg.includes("429")) {
        throw new Error("Gemini quota exceeded. Try again a bit later.");
      }
      throw new Error(msg);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") throw new Error("Gemini timed out.");
    throw error;
  }
}

export async function generateSpeech(text, inputKey, voice = "Puck") {
  const apiKey = requireApiKey(inputKey);
  const textStr = String(text ?? "").trim();
  if (!textStr) throw new Error("Gemini TTS requires non-empty text.");
  const model = DEFAULT_TTS_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: textStr }] }],
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

/** Returns { emotion, text, symbol, action, value_ms, event_details, tool_params, rawResponse }. */
function parseGeminiResponse(raw) {
  raw = typeof raw === "string" ? raw : "";

  const ALLOWED_EMOTIONS = [
    "happy",
    "sad",
    "angry",
    "curious",
    "surprised",
    "serious",
    "playful",
    "thinking",
    "excited",
    "sleepy",
    "gentle",
    "confident",
    "celebrate",
    "idle",
  ];

  const ALLOWED_ACTIONS = [
    "none",
    "weather",
    "currency",
    "map",
    "reviews",
    "movies",
    "products",
    "time",
    "timer",
    "calendar",
    "youtube",
    "search",
    "chart",
    "list",
    "nutrition",
    "translate",
  ];

  function normalizeEmotion(value) {
    return ALLOWED_EMOTIONS.includes(value) ? value : "serious";
  }

  function normalizeAction(value) {
    return ALLOWED_ACTIONS.includes(value) ? value : "none";
  }

  function normalizeToolParams(value) {
    return value && typeof value === "object" ? value : {};
  }

  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON block found");
    }

    const jsonStr = raw.substring(start, end + 1);
    const parsed = JSON.parse(jsonStr);

    return {
      emotion: normalizeEmotion(parsed.emotion),
      text: typeof parsed.text === "string" ? parsed.text : "",
      symbol: parsed.symbol || null,
      action: normalizeAction(parsed.action),
      value_ms: parsed.value_ms || null,
      event_details: parsed.event_details || null,
      tool_params: normalizeToolParams(parsed.tool_params),
      rawResponse: raw,
    };
  } catch {
    return {
      emotion: "serious",
      text: String(raw).trim(),
      symbol: null,
      action: "none",
      value_ms: null,
      event_details: null,
      tool_params: {},
      rawResponse: raw,
    };
  }
}