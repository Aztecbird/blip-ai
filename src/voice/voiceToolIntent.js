/**
 * Priority voice routing for tool surfaces (media lanes, etc.).
 * Intent checks run in main.js *before* YouTube shortcuts so “open photos” cannot be
 * pre-empted by `openVideos` when the utterance clearly names local photo nouns.
 */

const PHOTO_NOUNS = /\b(?:photos?|fotos?|pictures?|shots?|snapshots?)\b/;

/**
 * @param {string} lower - already `normalizeVoiceTokens` output from main.js
 * @returns {boolean}
 */
export function isPriorityOpenLocalPhotosIntentFromLower(lower) {
    if (!lower || typeof lower !== 'string') return false;
    const l = lower.replace(/\s+/g, ' ').trim();
    if (/\b(?:youtube|yt)\b/.test(l)) return false;
    if (!PHOTO_NOUNS.test(l)) return false;

    const stripped = l
        .replace(/^hey\s+blip[,\s]+/i, '')
        .replace(/^(?:please|can|could|would|will)\s+you\s+/i, '')
        .replace(/^please\s+/i, '')
        .trim();

    if (/^(?:open|show|view|display|browse|pull\s+up|bring\s+up)\b/.test(stripped)) return true;
    if (/^(?:(?:let\s+me\s+see)|(?:show\s+me))\b/.test(stripped)) return true;
    return false;
}

const LOCK_MS = 12000;

/** @type {{ lane: 'media_shots'|'media_videos'|'media_music', until: number } | null} */
let voiceToolFollowUpLock = null;

/** After opening a lane from voice, bias very short follow-ups (e.g. “show more”) toward that lane. */
export function setVoiceToolFollowUpLock(lane) {
    if (!lane) {
        voiceToolFollowUpLock = null;
        return;
    }
    voiceToolFollowUpLock = { lane, until: Date.now() + LOCK_MS };
}

export function clearVoiceToolFollowUpLock() {
    voiceToolFollowUpLock = null;
}

export function getActiveVoiceToolFollowUpLock() {
    if (!voiceToolFollowUpLock) return null;
    if (Date.now() > voiceToolFollowUpLock.until) {
        voiceToolFollowUpLock = null;
        return null;
    }
    return voiceToolFollowUpLock.lane;
}
