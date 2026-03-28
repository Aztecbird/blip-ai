import { normalizeVoiceCommandText } from './textParsing.js';

function normalizeText(value = '') {
    return normalizeVoiceCommandText(value);
}

export function getCameraDesignTransferCommand(command = '') {
    const lower = normalizeText(command);
    if (!lower) return null;

    const hasDesignTarget = /\b(design|drawing|drawing\s+board|workspace|board)\b/.test(lower);
    const hasVisualNoun = /\b(photo|picture|image|snapshot|shot|photo\s+of\s+my\s+son|homework|mind\s+map|mindmap|notes?|writing|worksheet)\b/.test(lower);
    const hasCaptureVerb = /\b(take|capture|snap|shoot|photo|picture)\b/.test(lower);
    const hasTransferVerb = /\b(transfer|send|move|put|show|open|take\s+it\s+to)\b/.test(lower);
    const hasReadVerb = /\b(read|transcribe|summarize|summarise|explain|clearer|clear|understand|scan)\b/.test(lower);
    const hasHomeworkCue = /\b(homework|mind\s*map|mindmap|notes?|writing|worksheet)\b/.test(lower);

    if (!hasVisualNoun) return null;

    if (hasReadVerb && (hasDesignTarget || hasHomeworkCue)) {
        return {
            action: 'analyzeHomework',
            title: /\bhomework\b/.test(lower) || /\bmind\s*map\b/.test(lower)
                ? 'Homework Mind Map'
                : 'Camera Photo'
        };
    }

    if (!hasDesignTarget) return null;
    if (!hasCaptureVerb && !hasTransferVerb) return null;

    return {
        action: 'captureToDesign',
        title: /\bhomework\b/.test(lower) ? 'Homework Photo' : 'Camera Photo'
    };
}
