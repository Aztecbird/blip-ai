export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
export const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image-preview';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function resolveApiKey(input) {
  return String(input || '').trim();
}

export function requireApiKey(inputKey) {
  const apiKey = resolveApiKey(inputKey);
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Enter your own Google AI Studio key in Settings.');
  }
  return apiKey;
}

export function buildGeminiUrl(model, inputKey) {
  const apiKey = resolveApiKey(inputKey);
  if (!apiKey) {
    // If no key is provided, use the local backend proxy
    return `/api/gemini/models/${model}:generateContent`;
  }
  return `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
}

export async function postGeminiJson(url, body, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || `API Error ${response.status}`;
      if (msg.includes('quota') || msg.includes('429')) {
        throw new Error('Gemini quota exceeded. Try again a bit later.');
      }
      throw new Error(msg);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Gemini timed out.');
    if (String(error?.message || '').includes('Failed to fetch')) {
      throw new Error('Gemini network error. Check your connection and API key.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function extractCandidateParts(data) {
  return data?.candidates?.[0]?.content?.parts || [];
}
