import { stripVoiceAssistantPrefix } from './textParsing.js';

/**
 * Voice follow-up for freeform notes: accumulate dictation until the user
 * says an explicit finish phrase (avoids saving on the first pause).
 */

function sanitizeVoiceQuery(text) {
    return stripVoiceAssistantPrefix(text);
}

export function parseFreeformNoteBody(text = '') {
    return sanitizeVoiceQuery(text)
        .replace(/^(?:yes\s+)?(?:this|here)(?:\s+is)?\s+(?:the\s+)?note[:\s,-]*/i, '')
        .replace(/^(?:yes\s+)?(?:it'?s|it is)\s+(?:the\s+)?note[:\s,-]*/i, '')
        .replace(/^(?:please\s+)?(?:take|save|write)\s+(?:this\s+)?note[:\s,-]*/i, '')
        .replace(/^(?:note|memo)[:\s,-]*/i, '')
        .trim();
}

/** @param {string} lower - already lowercased, single-spaced (e.g. normalizeVoiceTokens output) */
export function isNotesDraftFinishIntent(lower = '') {
    if (!lower) return false;
    return (
        /^(?:done|finished|finish|save|save it|save note|save the note|save list|save the list|you can save the note|you can save the list|that's all|thats all|that's it|thats it|that is all|end note|end list|complete|okay save note|ok save note)$/i.test(lower)
        || /^(?:i\s+)?(?:am\s+)?(?:done|finished)\s+with\s+(?:the\s+)?note$/i.test(lower)
        || /^i(?:'m|\s+m)\s+(?:done|finished)\s+with\s+(?:the\s+)?note$/i.test(lower)
        || /^(?:finish|finished|end)\s+(?:the\s+)?note$/i.test(lower)
        || /^(?:that'?s|that\s+is)\s+(?:my\s+)?(?:whole\s+)?note$/i.test(lower)
        || /^note\s+(?:is\s+)?(?:done|finished|complete)$/i.test(lower)
    );
}

/**
 * @param {object} draft - pending notes draft with stage === 'awaiting_freeform'
 * @param {string} cmd - raw voice command
 * @param {string} normalizedLower - normalizeVoiceTokens(cmd)
 * @returns {{ type: 'complete', draft: object } | { type: 'needsMore', draft: object, message: string } | null}
 */
export function advanceFreeformNotesDraft(draft, cmd, normalizedLower) {
    if (!draft || draft.stage !== 'awaiting_freeform') return null;

    if (isNotesDraftFinishIntent(normalizedLower)) {
        const bodyText = String(draft.bodyText || '').trim();
        if (!bodyText) {
            return {
                type: 'needsMore',
                draft,
                message: 'I do not have anything to save yet. Dictate your note first, or say cancel.'
            };
        }
        return { type: 'complete', draft: { ...draft, bodyText } };
    }

    const fragment = parseFreeformNoteBody(cmd);
    if (!fragment) {
        return {
            type: 'needsMore',
            draft,
            message: 'I am still listening. Keep dictating, or say I am done with the note when you are finished.'
        };
    }

    const prev = String(draft.bodyText || '').trim();
    const nextBody = prev ? `${prev}\n\n${fragment}` : fragment;
    const nextDraft = { ...draft, bodyText: nextBody };
    const message = prev
        ? 'Got it. Add more, or say I am done with the note to save.'
        : 'Got it. Keep going, or say I am done with the note when you are finished.';
    return { type: 'needsMore', draft: nextDraft, message };
}
