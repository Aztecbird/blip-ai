/**
 * Shared normalization for voice follow-ups (Gemini Flash / browser ASR).
 */
export function normalizeVoiceUtterance(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\w\s@.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
