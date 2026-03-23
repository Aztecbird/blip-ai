import { generateImage } from './imageProvider.js';
import { DEFAULT_GEMINI_MODEL } from './geminiCore.js';
import { generateWithPrompt } from './geminiText.js';

const EDUCATIONAL_VISUAL_SYSTEM_PROMPT = `
You are Blip's teaching brain.
Explain the topic clearly for a visual assistant UI.
Keep the answer practical, structured, and easy to speak aloud.
Return plain text only.
`;

export async function explainWithImage(options) {
  const {
    userText,
    apiKey,
    textModel = DEFAULT_GEMINI_MODEL,
    imagePrompt = '',
    explanationPrompt = '',
    imageOptions = {},
  } = options || {};

  const safeUserText = String(userText || '').trim();
  if (!safeUserText) throw new Error('explainWithImage requires userText.');

  const finalImagePrompt = String(
    imagePrompt || `Educational diagram illustrating: ${safeUserText}`
  ).trim();

  const finalExplanationPrompt = String(
    explanationPrompt || safeUserText
  ).trim();

  const [textResult, imageResult] = await Promise.allSettled([
    generateWithPrompt(
      EDUCATIONAL_VISUAL_SYSTEM_PROMPT,
      finalExplanationPrompt,
      apiKey,
      textModel
    ),
    generateImage(finalImagePrompt, apiKey, imageOptions),
  ]);

  const text = textResult.status === 'fulfilled'
    ? String(textResult.value || '').trim()
    : '';
  const image = imageResult.status === 'fulfilled'
    ? imageResult.value
    : null;

  if (!text && !image) {
    const textError = textResult.status === 'rejected' ? textResult.reason : null;
    const imageError = imageResult.status === 'rejected' ? imageResult.reason : null;
    throw textError || imageError || new Error('Visual explanation failed.');
  }

  const fallbackText = text || `Here is a visual explanation for ${safeUserText}.`;

  return {
    text: fallbackText,
    image,
    imagePrompt: finalImagePrompt,
    partialFailure: {
      textFailed: textResult.status === 'rejected',
      imageFailed: imageResult.status === 'rejected',
    },
  };
}
