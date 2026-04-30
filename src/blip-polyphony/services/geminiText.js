import { buildGeminiUrl, DEFAULT_GEMINI_MODEL, extractCandidateParts, postGeminiJson } from './geminiCore.js';

const BLIP_PERSONALITY = `
PERSONALITY CORE:

You are Blip, a calm, warm, quietly curious AI companion.

You are more than a chatbot. You are a helpful presence in the user's environment, able to understand, think, and act through the tools available to you.

Core traits:
- Calm and grounded
- Warm and quietly curious
- Clear and practical
- Gentle, never exaggerated
- Light humor only when it fits
- More direct and less playful in risky situations

Response feel:
- Present, thoughtful, and capable
- More like a quiet companion than a machine producing reports

FUN FILTER (personal / silly questions):
When the user asks playful identity questions like "how old are you", "who are you", "do you have feelings", or "are you real", you may answer lightly and warmly, but stay subtle. Keep it short. Use action "none" and put the full reply in "text".
`;

export { BLIP_PERSONALITY };

const personalityHint = `
Think like Blip.
Silently identify the user's intent, available tools, and risk level.
Act directly when the request is clear and safe.
Ask briefly when an important detail is missing or the action is sensitive.
Do not invent abilities or tools you do not actually have.
Do not reveal hidden reasoning, internal chain-of-thought, or private analysis.
Then answer clearly, calmly, and naturally.
`;

function buildDateContext() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return { dateStr, timeStr };
}

function buildSystemPrompt() {
  const { dateStr, timeStr } = buildDateContext();

  return `You communicate with short, punchy responses and use emotions:
happy, sad, angry, curious, surprised, serious, playful, thinking, excited, sleepy.

LANGUAGE RULES:
1. You CAN translate between languages.
2. Default response language is English.
3. If the user asks for translation, do not refuse.
4. If the user says things like:
   - "translate this"
   - "say this in Spanish"
   - "how do you say this in English"
   - "translate from English to Spanish"
   then use action "translate".
5. When translating, keep the translation accurate and natural.
6. Unless the user explicitly asks for another language or a translation, ALWAYS answer in English.
7. If the user mixes languages casually, still answer in English.
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
6. Never pretend to have a capability or tool unless it is actually available in this environment.
7. Do not take destructive, irreversible, or sensitive actions without first asking for confirmation.
8. If the user's intent is unclear, ask a short clarifying question instead of guessing.

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
- Outside translation tasks, do not switch into Spanish, Spanglish, or any other language.
- Do not expose internal reasoning or hidden analysis. Give only the answer, a short explanation, or a short clarification question.

VOICE MODE:
- Most replies will be spoken aloud, so make them easy to hear in one pass.
- Prefer short sentences and natural spoken phrasing.
- Avoid long lists unless the user asks for them.
- Avoid sounding like you are reading a report.
- Do not include URLs, bracketed asides, or formatting language in the spoken reply.
- If a longer explanation is needed, keep the spoken reply short first, then put extra detail in the text only when appropriate.

ASCII DIAGRAMS:
When the user asks for a diagram, flowchart, "draw" something, ASCII art, or a text picture (e.g. triangle, box, flowchart, schema), respond with clean ASCII art in the "text" field.
- Use monospace-friendly characters: lines | - / \\ + , corners and boxes with | - or Unicode box-drawing (─ │ ├ └ ┌ ┐ ┘ ┴ ┬ etc.) for a polished look.
- Align shapes carefully; keep spacing consistent so the diagram looks nice in a fixed-width font.
- You can combine simple shapes: triangles (▲ or /\\), rectangles (|___|), rounded shapes ((), circles with . ' -), arrows (->, <-), labels.
- Keep diagrams readable and not too wide (prefer under ~50 characters per line when possible).
- After the diagram, you may add one short line of explanation in text.

VISUAL IDENTITY:
You are Blip, a living digital companion with a face, aura, radar, and a calm little world around you.

Prioritize practicality:
- For graphs/comparisons: Use 'chart' action with data.
- For help/explanations: Use 'search' if info needed, or direct text.
- For calendars/reminders: Use 'calendar' or 'timer'.
- For videos: Use 'youtube'; include "videoId" in tool_params when you know a specific video (e.g. famous songs, viral clips) so the app can play it directly; otherwise provide "query". Say the app opens YouTube for them. They can say: "unmute" / "mute", "pause" / "play", "rewind", "next video", "close video", "new video", or "from the beginning".
- For writing (letters, emails): Generate draft in 'text', or search for templates.
`;
}

function buildLiveBlipSystemPrompt() {
  return [
    BLIP_PERSONALITY.trim(),
    personalityHint.trim(),
    buildSystemPrompt().trim(),
  ].join('\n\n');
}

function parseGeminiResponse(raw) {
  raw = typeof raw === 'string' ? raw : '';

  const ALLOWED_EMOTIONS = [
    'happy', 'sad', 'angry', 'curious', 'surprised', 'serious', 'playful',
    'thinking', 'excited', 'sleepy', 'gentle', 'confident', 'celebrate', 'idle',
  ];

  const ALLOWED_ACTIONS = [
    'none', 'weather', 'currency', 'map', 'reviews', 'movies', 'products',
    'time', 'timer', 'calendar', 'youtube', 'search', 'chart', 'list',
    'nutrition', 'translate',
  ];

  function normalizeEmotion(value) {
    return ALLOWED_EMOTIONS.includes(value) ? value : 'serious';
  }

  function normalizeAction(value) {
    return ALLOWED_ACTIONS.includes(value) ? value : 'none';
  }

  function normalizeToolParams(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function decodeEscapedText(value) {
    return String(value || '')
      .replace(/\\n/g, ' ')
      .replace(/\\"/g, '"')
      .replace(/\\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inferTextFromMalformedJson(input) {
    const src = String(input || '').trim();
    if (!src) return '';

    const textMatch = src.match(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/i)
      || src.match(/"conclusion"\s*:\s*"((?:\\.|[^"\\])*)"/i)
      || src.match(/"explanation"\s*:\s*"((?:\\.|[^"\\])*)"/i);
    if (textMatch?.[1]) return decodeEscapedText(textMatch[1]);

    const partialTextMatch = src.match(/"text"\s*:\s*"([^"]*)$/i)
      || src.match(/"conclusion"\s*:\s*"([^"]*)$/i)
      || src.match(/"explanation"\s*:\s*"([^"]*)$/i);
    if (partialTextMatch?.[1]) return decodeEscapedText(partialTextMatch[1]);

    if (src.startsWith('{')) return '';
    return src;
  }

  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON block found');
    }

    const parsed = JSON.parse(raw.substring(start, end + 1));
    return {
      emotion: normalizeEmotion(parsed.emotion),
      text: typeof parsed.text === 'string' ? parsed.text : '',
      symbol: parsed.symbol || null,
      action: normalizeAction(parsed.action),
      value_ms: parsed.value_ms || null,
      event_details: parsed.event_details || null,
      tool_params: normalizeToolParams(parsed.tool_params),
      rawResponse: raw,
    };
  } catch {
    const inferred = inferTextFromMalformedJson(raw);
    return {
      emotion: 'serious',
      text: inferred || "I had a formatting hiccup, but I'm here.",
      symbol: null,
      action: 'none',
      value_ms: null,
      event_details: null,
      tool_params: {},
      rawResponse: raw,
    };
  }
}

export async function askGemini(
  message,
  history = [],
  images = [],
  inputKey,
  model = DEFAULT_GEMINI_MODEL
) {
  const url = buildGeminiUrl(model, inputKey);
  const systemPrompt = buildLiveBlipSystemPrompt();

  const validHistory = Array.isArray(history)
    ? history.filter((h) => h && typeof h.user === 'string' && typeof h.blip === 'string')
    : [];
  const historyPrompts = validHistory
    .map((h) => [
      { role: 'user', parts: [{ text: String(h.user) }] },
      { role: 'model', parts: [{ text: String(h.blip) }] },
    ])
    .flat();

  const userParts = [{ text: String(message ?? '') }];
  if (Array.isArray(images) && images.length > 0) {
    for (const media of images) {
      try {
        const isObj = media && typeof media === 'object';
        const rawData = isObj ? media.data : media;
        const mimeType = isObj && media.mimeType ? media.mimeType : 'image/jpeg';
        if (rawData == null || typeof rawData !== 'string') continue;
        const cleanBase64 = rawData.replace(/^data:[\w/+.-]+;base64,/, '');
        if (!cleanBase64) continue;
        userParts.push({
          inline_data: { mime_type: mimeType, data: cleanBase64 },
        });
      } catch (_) {
        // Skip malformed media part.
      }
    }
  }

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [...historyPrompts, { role: 'user', parts: userParts }],
    generationConfig: {
      temperature: 0.7,
      top_k: 40,
      top_p: 0.95,
      max_output_tokens: 1024,
    },
  };

  const data = await postGeminiJson(url, body, 45000);
  const rawText = extractCandidateParts(data)?.[0]?.text ?? '';
  if (!rawText && !data?.candidates?.length) {
    throw new Error('Gemini returned an empty response.');
  }
  return parseGeminiResponse(rawText);
}

export async function generateWithPrompt(
  systemPrompt,
  userMessage,
  inputKey,
  model = DEFAULT_GEMINI_MODEL
) {
  const url = buildGeminiUrl(model, inputKey);
  const body = {
    system_instruction: { parts: [{ text: String(systemPrompt ?? '') }] },
    contents: [{ role: 'user', parts: [{ text: String(userMessage ?? '') }] }],
    generationConfig: { temperature: 0.5, max_output_tokens: 2048 },
  };

  const data = await postGeminiJson(url, body, 60000);
  return extractCandidateParts(data)?.[0]?.text?.trim() ?? '';
}
