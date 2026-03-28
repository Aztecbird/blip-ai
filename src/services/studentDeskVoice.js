import { normalizeVoiceCommandText } from './textParsing.js';

function normalizeText(value = '') {
    return normalizeVoiceCommandText(value);
}

export function getStudentDeskVoiceCommand(cmd = '') {
    if (!cmd || typeof cmd !== 'string') return null;
    const lower = normalizeText(cmd);
    const deskNoun = '(?:hub|student\\s+desk|student|study\\s+desk|study|desk)';

    if (new RegExp(`\\b(close|hide|dismiss|exit)\\s+(?:the\\s+)?${deskNoun}\\b`).test(lower)) return { action: 'close' };
    if (new RegExp(`\\b(open|go to|enter|show|view|launch)\\s+(?:the\\s+)?${deskNoun}\\b`).test(lower)) return { action: 'open' };
    if (new RegExp(`\\b(clear|empty|wipe|reset|erase|trash|delete|remove)\\s+(?:the\\s+)?${deskNoun}\\b`).test(lower)) return { action: 'clear' };
    if (new RegExp(`\\b(show|review|read|list)\\s+(?:me\\s+)?(?:the\\s+)?${deskNoun}\\b`).test(lower) ||
        new RegExp(`\\bwhat(?:'s| is)\\s+(?:in|inside)\\s+(?:the\\s+)?${deskNoun}\\b`).test(lower)) return { action: 'review' };
    if (new RegExp(`\\b(save|store|keep)\\s+(this|that|it|current)\\b[\\s\\w]{0,18}\\b(to|in)\\s+(?:the\\s+)?${deskNoun}\\b`).test(lower)) return { action: 'saveCurrent' };

    const removeMatch = lower.match(new RegExp(`\\b(?:remove|delete|drop|erase|trash)\\s+(.+?)(?:\\s+from)?\\s+(?:the\\s+)?${deskNoun}\\b`));
    if (removeMatch) {
        const query = String(removeMatch[1] || '')
            .replace(/^(?:the\s+)?/, '')
            .replace(/^(?:item|note|link|photo|image)\s+/, '')
            .trim();
        if (!query || /^(?:it|this|that|one|item|note|link|photo|image|last|latest|newest)$/.test(query)) {
            return { action: 'removeLatest' };
        }
        return { action: 'removeMatch', query };
    }

    const notePatterns = [
        new RegExp(`^(?:please\\s+)?(?:save|add|put|store|remember)\\s+(?:my\\s+|this\\s+|that\\s+|the\\s+)?(?:homework\\s+|math\\s+|study\\s+|school\\s+|class\\s+)?(?:note\\s+)?(?:to|in)\\s+(?:the\\s+)?${deskNoun}[:\\s,-]*(.+)$`),
        new RegExp(`^(?:please\\s+)?(?:save|add|put|store|remember)\\s+(?:note\\s+)?(?:to|in)\\s+(?:the\\s+)?${deskNoun}[:\\s,-]*(.+)$`),
        new RegExp(`^(?:please\\s+)?(?:save|add|put|store|remember)\\s+(.+?)\\s+(?:to|in)\\s+(?:the\\s+)?${deskNoun}$`)
    ];
    for (const re of notePatterns) {
        const match = lower.match(re);
        const note = String(match?.[1] || '').trim();
        if (!note) continue;
        if (/^(?:this|that|it|current)$/.test(note)) return { action: 'saveCurrent' };
        return { action: 'saveNote', note };
    }
    return null;
}
