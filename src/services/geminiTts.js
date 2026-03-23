import { buildGeminiUrl, DEFAULT_TTS_MODEL, extractCandidateParts, postGeminiJson } from './geminiCore.js';

export async function generateSpeech(text, inputKey, voice = 'Puck') {
  const textStr = String(text ?? '').trim();
  if (!textStr) throw new Error('Gemini TTS requires non-empty text.');

  const url = buildGeminiUrl(DEFAULT_TTS_MODEL, inputKey);
  const body = {
    contents: [{ parts: [{ text: textStr }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
    },
  };

  const data = await postGeminiJson(url, body, 60000);
  const audioBase64 = extractCandidateParts(data)?.[0]?.inlineData?.data;
  if (!audioBase64) throw new Error('Gemini TTS returned no audio.');
  return audioBase64;
}

