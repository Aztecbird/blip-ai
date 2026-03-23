/**
 * Single entry point for image generation. Dispatches to Gemini or ComfyUI based on options.
 * Same return shape so Blip's UI (panel, gallery, projector) works unchanged.
 */
import { generateImage as generateImageGemini } from './geminiImage.js';
import { generateImageComfyUI } from './comfyuiImage.js';
import { generateImageOpenAI } from './openaiImage.js';

/**
 * Generate an image. Uses ComfyUI if options.imageEngine === 'comfyui' and options.comfyuiBaseUrl is set; otherwise Gemini.
 * @param {string} prompt - Text prompt for the image.
 * @param {string} apiKey - Gemini API key (used only when engine is Gemini).
 * @param {object} options - { model, timeoutMs, imageEngine, comfyuiBaseUrl }
 * @returns {Promise<{ mimeType, base64, dataUrl, text?, model?, source? }>}
 */
export async function generateImage(prompt, apiKey, options = {}) {
  const engine = options.imageEngine || 'gemini';
  const baseUrl = (options.comfyuiBaseUrl || '').trim();
  const ckptName = (options.comfyuiCheckpoint || '').trim();

  if (engine === 'dalle') {
    return generateImageOpenAI(prompt, options);
  }

  if (engine === 'comfyui' && baseUrl) {
    const result = await generateImageComfyUI(prompt, {
      baseUrl,
      ckptName,
      timeoutMs: options.timeoutMs || 120000,
      pollIntervalMs: options.pollIntervalMs
    });
    return {
      mimeType: result.mimeType,
      base64: result.base64,
      dataUrl: result.dataUrl,
      text: '',
      source: result.source || 'comfyui'
    };
  }

  return generateImageGemini(prompt, apiKey, options);
}
