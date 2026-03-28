import { askGemini } from './geminiText.js';

function normalizeText(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\w\s@.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanPrompt(prompt = '') {
    const lower = normalizeText(prompt);
    return lower
        .replace(/\b(?:please|can|could|would|will|you|blip|my|the|this|that|it|image|photo|picture|snapshot|shot|homework|mind\s*map|mindmap|design|drawing|board|workspace|clearer|read|scan|transcribe|summarize|summarise|explain|analyze|analyse)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export async function analyzeHomeworkPhoto(image, prompt = '', apiKey, model) {
    const media = image && typeof image === 'object'
        ? image
        : { data: String(image || ''), mimeType: 'image/jpeg' };

    const rawData = String(media.data || '')
        .replace(/^data:[\w/+.-]+;base64,/, '')
        .trim();
    if (!rawData) {
        throw new Error('No image data to analyze.');
    }

    const focusedPrompt = cleanPrompt(prompt) || 'homework photo';
    const response = await askGemini(
        `Look at the attached homework photo and do two things:
1. Read any visible text as accurately as you can.
2. If it is a mind map, turn it into a short clean outline.

Return a concise spoken reply. Keep it short and useful. If any text is hard to read, say that briefly. Focus on the homework photo: ${focusedPrompt}`,
        [],
        [{ data: rawData, mimeType: media.mimeType || 'image/jpeg' }],
        apiKey,
        model
    );

    return {
        emotion: response?.emotion || 'curious',
        text: String(response?.text || '').trim() || 'I can see the homework photo, but I could not read all of it clearly.',
    };
}
