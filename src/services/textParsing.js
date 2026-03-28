function cleanText(value = '') {
    return String(value || '').trim().replace(/\s+/g, ' ');
}

function stripAssistantPrefix(value = '') {
    return cleanText(String(value || '')
        .replace(/^(?:hey\s+)?blip\b[\s:,\-]*/i, '')
        .replace(/^[\s:,\-]+/, '')
        .replace(/[\s.,!?]+$/, ''));
}

export function normalizeCommandText(value = '') {
    return cleanText(value)
        .toLowerCase()
        .replace(/[^\w\s@.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeVoiceCommandText(value = '') {
    return normalizeCommandText(stripAssistantPrefix(value));
}

export function stripVoiceAssistantPrefix(value = '') {
    return stripAssistantPrefix(value);
}

function clampConfidence(value = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric < 0) return 0;
    if (numeric > 1) return 1;
    return numeric;
}

export function createParseResult(result = {}) {
    const raw = cleanText(result.raw || '');
    const normalized = cleanText(result.normalized || raw).toLowerCase();
    return {
        ...result,
        raw,
        normalized,
        confidence: clampConfidence(result.confidence),
    };
}

export { cleanText };
