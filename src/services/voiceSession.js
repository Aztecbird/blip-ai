/**
 * Short-lived voice UX memory: which messaging tool (Gmail vs Telegram) the user
 * last touched, so bare “send” can disambiguate when both drafts exist.
 */

const DEFAULT_MESSAGING_FOCUS_TTL_MS = 12 * 60 * 1000;

export function ensureVoiceSession(state = {}) {
    if (!state.voiceSession || typeof state.voiceSession !== 'object') {
        state.voiceSession = {
            lastMessagingTool: '',
            lastMessagingToolAtMs: 0
        };
    }
    return state.voiceSession;
}

/** Call when the user materially uses Gmail or Telegram (branch updates). */
export function recordVoiceMessagingFocus(state, toolId = '') {
    const t = String(toolId || '').trim().toLowerCase();
    if (t !== 'gmail' && t !== 'telegram') return;
    const vs = ensureVoiceSession(state);
    vs.lastMessagingTool = t;
    vs.lastMessagingToolAtMs = Date.now();
}

/**
 * @returns {'gmail'|'telegram'|null}
 */
export function getVoiceMessagingFocus(state = {}, ttlMs = DEFAULT_MESSAGING_FOCUS_TTL_MS) {
    const vs = state.voiceSession;
    const tool = String(vs?.lastMessagingTool || '').trim().toLowerCase();
    if (tool !== 'gmail' && tool !== 'telegram') return null;
    const at = Number(vs?.lastMessagingToolAtMs || 0);
    if (!at || Date.now() - at > ttlMs) return null;
    return tool;
}
