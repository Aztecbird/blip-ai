import { buildGeminiUrl, DEFAULT_IMAGE_MODEL, extractCandidateParts, postGeminiJson } from './geminiCore.js';

export async function generateImage(prompt, inputKey, options = {}) {
  const textPrompt = String(prompt || '').trim();
  if (!textPrompt) throw new Error('Gemini image generation requires a prompt.');

  const model = options.model || DEFAULT_IMAGE_MODEL;
  const url = buildGeminiUrl(model, inputKey);
  const body = {
    contents: [{ role: 'user', parts: [{ text: textPrompt }] }],
  };

  const data = await postGeminiJson(url, body, options.timeoutMs || 90000);
  const parts = extractCandidateParts(data);
  const imagePart = parts.find((part) => part?.inlineData?.data);
  const textPart = parts.find((part) => typeof part?.text === 'string' && part.text.trim());

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini image generation returned no image data.');
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  const base64 = imagePart.inlineData.data;
  return {
    mimeType,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
    text: textPart?.text?.trim() || '',
    model,
  };
}

