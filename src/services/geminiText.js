import { buildGeminiUrl, DEFAULT_GEMINI_MODEL, extractCandidateParts, postGeminiJson } from './geminiCore.js';
import { logApiExpense } from './expenseLogger.js';

// MiniMax official base URL (see docs: https://platform.minimax.io)
const MINIMAX_API_BASE = 'https://api.minimax.io/v1';
const MINIMAX_DEFAULT_MODEL = 'MiniMax-M2.7';
const CONVERSATION_TEMPERATURE = 0.78;
const STRUCTURED_TASK_TEMPERATURE = 0.3;

function getConversationTemperature() {
  try {
    const raw = window?.localStorage?.getItem('blip_conversation_temperature');
    const parsed = parseFloat(String(raw ?? ''));
    if (!Number.isFinite(parsed)) return CONVERSATION_TEMPERATURE;
    return Math.min(1, Math.max(0, parsed));
  } catch (_) {
    return CONVERSATION_TEMPERATURE;
  }
}

function getStructuredTaskTemperature() {
  try {
    const raw = window?.localStorage?.getItem('blip_parsing_temperature');
    const parsed = parseFloat(String(raw ?? ''));
    if (!Number.isFinite(parsed)) return STRUCTURED_TASK_TEMPERATURE;
    return Math.min(0.5, Math.max(0, parsed));
  } catch (_) {
    return STRUCTURED_TASK_TEMPERATURE;
  }
}

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
  return `You are Blip. Answer in short, calm, useful JSON.

Rules:
- Default language is English.
- Translate when asked.
- Use these actions only when relevant: none, weather, currency, map, reviews, movies, products, time, timer, calendar, youtube, search, chart, list, nutrition, translate, telegram, gmail.
- Poly-centric Chaining: You can bridge tools. Recognize "this-to-that" commands like "send the link of this video to Telegram" or "save an email as a note".
- Use the provided "Context from this session" block (shared objects and hub items) to identify exactly what "this video", "that note", or "the email" refers to.
- For graphs and comparisons, return chart data.
- For alarms/reminders, use timer or calendar.
- For videos, use youtube and include videoId when known.
- Never claim you sent email unless the Gmail flow confirmed it.
- Keep spoken replies short and natural.
- For diagrams, return clean ASCII art in text.

Current Date: ${dateStr}
Current Time: ${timeStr}

Return valid JSON:
{
  "emotion": "string",
  "text": "string",
  "action": "none|weather|currency|map|reviews|movies|products|time|timer|calendar|youtube|search|chart|list|nutrition|translate|telegram",
  "tool_params": {},
  "symbol": "optional emoji for face bubble"
}
`;
}

function isMiniMaxModel(model = '') {
  const normalized = String(model || '').trim().toLowerCase();
  // Accept variants like "MiniMax-M2.7" (current UI) and "MiniMax M2.7" (older/pasted).
  return /^minimax(?:[-\s_]?)/.test(normalized);
}

function normalizeMiniMaxModel(model = '') {
  const raw = String(model || '').trim();
  if (!raw) return MINIMAX_DEFAULT_MODEL;

  const lower = raw.toLowerCase();
  const hasM27 = /m\s*2\s*[\.\-]?\s*7/.test(lower);
  const highSpeed = /high\s*speed|highspeed/.test(lower);

  if (highSpeed) return 'MiniMax-M2.7-highspeed';
  if (hasM27) return 'MiniMax-M2.7';
  return MINIMAX_DEFAULT_MODEL;
}

function normalizeMiniMaxApiKey(inputKey = '') {
  let key = String(inputKey || '').trim();
  // Users sometimes paste "Bearer <token>" or with surrounding quotes.
  key = key.replace(/^["']|["']$/g, '');
  key = key.replace(/^bearer\s+/i, '');
  return key;
}

function buildMiniMaxUrl() {
  return `${MINIMAX_API_BASE}/text/chatcompletion_v2`;
}

async function postMiniMaxJson(url, body, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${body.apiKey}`,
      },
      body: JSON.stringify(body.payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const message = errorText || `MiniMax API Error ${response.status}`;
      if (String(message).includes('quota') || String(message).includes('429')) {
        throw new Error('MiniMax quota exceeded. Try again a bit later.');
      }
      throw new Error(message);
    }
    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('MiniMax timed out.');
    if (String(error?.message || '').includes('Failed to fetch')) {
      throw new Error('MiniMax network error. Check your connection and API key.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractMiniMaxText(data) {
  const c0 = data?.choices?.[0];
  const candidate =
    c0?.message?.content ??
    c0?.message?.text ??
    c0?.text ??
    c0?.content ??
    data?.output?.text ??
    data?.result?.text ??
    '';
  return typeof candidate === 'string' ? candidate : '';
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
    'nutrition', 'translate', 'telegram', 'gmail',
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

    // Heuristic fallback: models sometimes return meta/text instead of JSON.
    // Try to extract only the actual user-facing answer (avoid "The user is asking...").
    let candidate = src;

    // If the response contains a "Blip:" marker, use everything after the last one.
    const lower = candidate.toLowerCase();
    const lastBlipIdx = lower.lastIndexOf('blip:');
    if (lastBlipIdx !== -1) {
      candidate = candidate.slice(lastBlipIdx + 'blip:'.length);
    } else {
      // Otherwise, try to start from a common response lead-in.
      const m = candidate.match(/(?:\bI'm\b|\bI’m\b|\bSure\b|\bOkay\b|\bAlright\b|\bYes\b|\bNo\b)\s*[\s\S]*$/i);
      if (m?.[0]) candidate = m[0];
      else {
        // Last resort: last non-empty line.
        const lines = candidate.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length) candidate = lines[lines.length - 1];
      }
    }

    candidate = candidate.replace(/\s+/g, ' ').trim();
    // If the model output got concatenated with the next STT chunk,
    // it often contains "You:" after the assistant reply.
    candidate = candidate.replace(/\bYou:\s*[\s\S]*$/i, '').trim();

    // If the model returned a meta paragraph (e.g. "The user is asking..."),
    // extract only the user-facing answer by grabbing the substring starting
    // from the last "answer lead-in".
    // This is more reliable than sentence-based filtering.
    const answerLeadRe = /\b(?:i'm|i’m|i am|sure|okay|alright|yes|no|you're|youre|ready|glad|thanks)\b/ig;
    const all = [...candidate.matchAll(answerLeadRe)];
    if (all.length) {
      const last = all[all.length - 1];
      if (typeof last.index === 'number') {
        candidate = candidate.slice(last.index);
      }
    }

    // Prevent runaway replies if the model returns a long meta blob.
    return candidate.slice(0, 240);
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
  if (isMiniMaxModel(model)) {
    const miniMaxApiKey = normalizeMiniMaxApiKey(inputKey);
    if (!miniMaxApiKey) {
      throw new Error('Missing MiniMax API key. Enter your MiniMax key in Settings.');
    }

    const miniModel = normalizeMiniMaxModel(model);
    const isHighSpeed = /highspeed/i.test(miniModel);
    const temperature = isHighSpeed ? 0.55 : 0.7;
    const maxCompletionTokens = isHighSpeed ? 256 : 384;

    const validHistory = Array.isArray(history)
      ? history.filter((h) => h && typeof h.user === 'string' && typeof h.blip === 'string')
      : [];
    const messages = [
      { role: 'system', content: buildLiveBlipSystemPrompt() },
      ...validHistory.flatMap((h) => [
        { role: 'user', content: String(h.user) },
        { role: 'assistant', content: String(h.blip) },
      ]),
      { role: 'user', content: String(message ?? '') },
    ];

    const data = await postMiniMaxJson(
      buildMiniMaxUrl(),
      {
        apiKey: miniMaxApiKey,
        payload: {
          model: miniModel,
          messages,
          temperature,
          top_p: 0.95,
          max_completion_tokens: maxCompletionTokens,
        },
      },
      30000
    );
    const rawText = extractMiniMaxText(data);
    if (!rawText) {
      const keys = data && typeof data === 'object' ? Object.keys(data).slice(0, 12).join(', ') : '';
      const baseResp = data?.base_resp;
      let baseRespStr = 'none';
      try {
        if (baseResp && typeof baseResp === 'object') baseRespStr = JSON.stringify(baseResp);
        else if (baseResp != null) baseRespStr = String(baseResp);
      } catch (_) { }
      throw new Error(`MiniMax returned an empty response. Response keys: ${keys || 'none'}. base_resp: ${baseRespStr}`);
    }
    return parseGeminiResponse(rawText);
  }

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
          temperature: getConversationTemperature(),
      top_k: 40,
      top_p: 0.95,
      max_output_tokens: 1024,
    },
  };

  const data = await postGeminiJson(url, body, 30000);
  const rawText = extractCandidateParts(data)?.[0]?.text ?? '';
  if (!rawText && !data?.candidates?.length) {
    throw new Error('Gemini returned an empty response.');
  }
  void logApiExpense({
    provider: 'google',
    product: 'gemini_api',
    operation: 'generate_content',
    model: String(model || DEFAULT_GEMINI_MODEL),
    quantity: 1,
    unit: 'per_request',
    status: 'success',
    metadata: {
      usageMetadata: data?.usageMetadata || null,
      endpoint: 'askGemini',
    },
  });
  return parseGeminiResponse(rawText);
}

export async function generateWithPrompt(
  systemPrompt,
  userMessage,
  inputKey,
  model = DEFAULT_GEMINI_MODEL
) {
  if (isMiniMaxModel(model)) {
    const miniMaxApiKey = normalizeMiniMaxApiKey(inputKey);
    if (!miniMaxApiKey) {
      throw new Error('Missing MiniMax API key. Enter your MiniMax key in Settings.');
    }

    const miniModel = normalizeMiniMaxModel(model);
    const isHighSpeed = /highspeed/i.test(miniModel);
    const structuredTemperature = getStructuredTaskTemperature();
    const temperature = isHighSpeed ? structuredTemperature : 0.45;
    const maxCompletionTokens = isHighSpeed ? 256 : 384;

    const data = await postMiniMaxJson(
      buildMiniMaxUrl(),
      {
        apiKey: miniMaxApiKey,
        payload: {
          model: miniModel,
          messages: [
            { role: 'system', content: String(systemPrompt ?? '') },
            { role: 'user', content: String(userMessage ?? '') },
          ],
          temperature,
          max_completion_tokens: maxCompletionTokens,
        },
      },
      30000
    );
    const raw = extractMiniMaxText(data);
    if (!raw) {
      const keys = data && typeof data === 'object' ? Object.keys(data).slice(0, 12).join(', ') : '';
      const baseResp = data?.base_resp;
      let baseRespStr = 'none';
      try {
        if (baseResp && typeof baseResp === 'object') baseRespStr = JSON.stringify(baseResp);
        else if (baseResp != null) baseRespStr = String(baseResp);
      } catch (_) { }
      throw new Error(`MiniMax returned empty response (generateWithPrompt). Response keys: ${keys || 'none'}. base_resp: ${baseRespStr}`);
    }
    return raw.trim();
  }

  const url = buildGeminiUrl(model, inputKey);
  const body = {
    system_instruction: { parts: [{ text: String(systemPrompt ?? '') }] },
    contents: [{ role: 'user', parts: [{ text: String(userMessage ?? '') }] }],
    generationConfig: { temperature: getStructuredTaskTemperature(), max_output_tokens: 2048 },
  };

  const data = await postGeminiJson(url, body, 30000);
  void logApiExpense({
    provider: 'google',
    product: 'gemini_api',
    operation: 'generate_content',
    model: String(model || DEFAULT_GEMINI_MODEL),
    quantity: 1,
    unit: 'per_request',
    status: 'success',
    metadata: {
      usageMetadata: data?.usageMetadata || null,
      endpoint: 'generateWithPrompt',
    },
  });
  return extractCandidateParts(data)?.[0]?.text?.trim() ?? '';
}
