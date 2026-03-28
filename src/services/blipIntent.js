import { cleanText, createParseResult, normalizeVoiceCommandText } from './textParsing.js';

function normalizeText(value = '') {
    return normalizeVoiceCommandText(value);
}

function hasAny(text = '', patterns = []) {
    return patterns.some((pattern) => pattern.test(text));
}

const CARE_CAM_HELP_PATTERNS = [
    /\bcall\s+for\s+help\b/,
    /\bcall\s+help\b/,
    /\bsend\s+help\b/,
    /\bsend\s+for\s+help\b/,
    /\bsend\s+message\b/,
    /\bhelp\s+me\b/,
    /\bhelp\b/,
    /\burgent\s+help\b/,
    /\bemergency\b/,
];

const CARE_CAM_URGENT_PATTERNS = [
    /\bno\b/,
    /\bnope\b/,
    /\bnot\s+okay\b/,
    /\bnot\s+good\b/,
    /\bnot\s+fine\b/,
    /\bi'?m\s+not\s+okay\b/,
    /\bi\s+m\s+not\s+okay\b/,
    /\bim\s+not\s+okay\b/,
    /\bi'?m\s+not\s+fine\b/,
    /\bi\s+m\s+not\s+fine\b/,
    /\bim\s+not\s+fine\b/,
    /\bhelp\b/,
    /\bemergency\b/,
];

const CARE_CAM_START_AND_HELP_PATTERNS = [
    /\bsend\s+help\s+message\b/,
    /\bsend\s+alert\s+message\b/,
    /\bsend\s+message\s+for\s+help\b/,
    /\bturn\s+on\s+care\s+cam\s+and\s+send\s+help(?:\s+message)?\b/,
    /\bstart\s+care\s+cam\s+and\s+send\s+help(?:\s+message)?\b/,
    /\bcare\s+cam\s+on\s+and\s+send\s+help(?:\s+message)?\b/,
    /\bblip\s+help\b/,
    /\bhelp\s+blip\b/,
];

const CARE_CAM_START_PATTERNS = [
    /\bturn\s+on\s+care\s+cam\b/,
    /\bstart\s+care\s+cam\b/,
    /\bopen\s+care\s+cam\b/,
    /\bactivate\s+care\s+cam\b/,
    /\benable\s+care\s+cam\b/,
    /\bcare\s+cam\s+on\b/,
    /\bcarecam\s+on\b/,
];

const CARE_CAM_STOP_PATTERNS = [
    /\bturn\s+off\s+care\s+cam\b/,
    /\bstop\s+care\s+cam\b/,
    /\bclose\s+care\s+cam\b/,
    /\bhide\s+care\s+cam\b/,
    /\bdeactivate\s+care\s+cam\b/,
    /\bdisable\s+care\s+cam\b/,
    /\bcare\s+cam\s+off\b/,
    /\bcarecam\s+off\b/,
];

const CARE_CAM_TEL_PATTERNS = [
    /\btelegram\b.*\b(send|message|text)\b/,
    /\b(send|message|text)\b.*\btelegram\b/,
    /\bcall\s+telegram\b/,
    /\bsend\s+telegram\s+message\b/,
];

const CARE_CAM_CLEAR_PATTERNS = [
    /^(?:yes|yeah|yep|okay|ok|sure|all\s+good|false\s+alarm|i'?m\s+okay|i\s+m\s+okay|im\s+okay|i\s+am\s+okay|i'?m\s+fine|i\s+m\s+fine|im\s+fine|i\s+am\s+fine|no\s+problem|i'?m\s+okay\s+now|i\s+m\s+okay\s+now)$/,
    /^(?:no|nope|not\s+hurt|not\s+hurt\s+at\s+all)$/,
];

export function normalizeBlipIntentText(text = '') {
    return normalizeText(text);
}

export function parseBlipIntent(text = '', context = {}) {
    const raw = cleanText(text);
    const lower = normalizeText(raw);
    const careCamActive = Boolean(context.careCamActive);
    const careCamHelpActive = Boolean(context.careCamHelpActive);
    const careCamFollowUpPhase = String(context.careCamFollowUpPhase || '').toLowerCase();
    const build = (result) => createParseResult({
        raw,
        lower,
        normalized: lower,
        careCamActive,
        careCamHelpActive,
        careCamFollowUpPhase,
        ...result
    });

    if (!lower) {
        return build({ kind: 'none', action: 'none', confidence: 0 });
    }

    if (lower === 'help') {
        if (careCamHelpActive && careCamFollowUpPhase === 'check') {
            return build({
                kind: 'carecam',
                action: 'urgent_help',
                confidence: 0.95
            });
        }
        return build({
            kind: 'carecam',
            action: 'start_and_send_help',
            confidence: 0.98
        });
    }

    if (hasAny(lower, CARE_CAM_START_AND_HELP_PATTERNS)) {
        return build({
            kind: 'carecam',
            action: 'start_and_send_help',
            confidence: 0.98
        });
    }

    if (careCamHelpActive) {
        if (careCamFollowUpPhase === 'check' && (
            hasAny(lower, CARE_CAM_CLEAR_PATTERNS)
                ? false
                : hasAny(lower, CARE_CAM_URGENT_PATTERNS) || hasAny(lower, CARE_CAM_HELP_PATTERNS) || hasAny(lower, CARE_CAM_TEL_PATTERNS)
        )) {
            return build({
                kind: 'carecam',
                action: 'urgent_help',
                confidence: 0.95
            });
        }
        if (hasAny(lower, CARE_CAM_CLEAR_PATTERNS)) {
            return build({
                kind: 'carecam',
                action: 'clear_help',
                confidence: 0.96
            });
        }
        if (hasAny(lower, CARE_CAM_HELP_PATTERNS) || hasAny(lower, CARE_CAM_TEL_PATTERNS)) {
            return build({
                kind: 'carecam',
                action: 'send_help',
                confidence: 0.94
            });
        }
    }

    if (careCamActive && hasAny(lower, CARE_CAM_HELP_PATTERNS)) {
        return build({
            kind: 'carecam',
            action: 'request_help',
            confidence: 0.9
        });
    }

    if (hasAny(lower, CARE_CAM_START_PATTERNS)) {
        return build({
            kind: 'carecam',
            action: 'start_carecam',
            confidence: 0.92
        });
    }

    if (hasAny(lower, CARE_CAM_STOP_PATTERNS)) {
        return build({
            kind: 'carecam',
            action: 'stop_carecam',
            confidence: 0.92
        });
    }

    return build({
        kind: 'none',
        action: 'none',
        confidence: 0.2
    });
}
