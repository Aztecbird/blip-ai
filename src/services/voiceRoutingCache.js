/**
 * In-memory cache for Gemini structured voice intent: same normalized utterance + routing
 * epoch hits return without another API call. Epoch shifts on panel, active tool, pending
 * review flags, draft presence, and messaging focus (see makeVoiceRoutingCacheEpoch).
 */

import { buildMessagingDraftSnapshot } from './messagingDraftSnapshot.js';
import { getVoiceMessagingFocus } from './voiceSession.js';

export const VOICE_ROUTING_CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_ENTRIES = 48;

const store = new Map();

export function makeVoiceRoutingCacheEpoch(state = {}) {
    const drafts = buildMessagingDraftSnapshot(state);
    return [
        String(state.currentSidePanelAction || ''),
        String(state.conversation?.activeTool || ''),
        state.pendingEmailReview ? '1' : '0',
        state.pendingTelegramReview ? '1' : '0',
        drafts.gmail.hasDraft ? '1' : '0',
        drafts.telegram.hasDraft ? '1' : '0',
        getVoiceMessagingFocus(state) || '',
    ].join('\t');
}

function cloneIntent(intent) {
    try {
        return JSON.parse(JSON.stringify(intent));
    } catch (_) {
        return null;
    }
}

function cacheKey(state, normalizedCommand) {
    return `${makeVoiceRoutingCacheEpoch(state)}::${String(normalizedCommand || '').trim()}`;
}

function pruneExpired() {
    const now = Date.now();
    for (const [k, v] of store) {
        if (now > v.expiresAt) store.delete(k);
    }
}

/** Test / session reset — clears all cached intents. */
export function clearVoiceRoutingCache() {
    store.clear();
}

export function getCachedStructuredVoiceIntent(state, normalizedCommand) {
    const key = cacheKey(state, normalizedCommand);
    pruneExpired();
    const row = store.get(key);
    if (!row || Date.now() > row.expiresAt) {
        if (row) store.delete(key);
        return null;
    }
    store.delete(key);
    store.set(key, row);
    const cloned = cloneIntent(row.intent);
    return cloned;
}

export function setCachedStructuredVoiceIntent(state, normalizedCommand, intent, ttlMs = VOICE_ROUTING_CACHE_TTL_MS) {
    if (!intent || typeof intent !== 'object') return;
    pruneExpired();
    while (store.size >= MAX_ENTRIES) {
        const oldest = store.keys().next().value;
        store.delete(oldest);
    }
    const key = cacheKey(state, normalizedCommand);
    const cloned = cloneIntent(intent);
    if (!cloned) return;
    store.set(key, { intent: cloned, expiresAt: Date.now() + ttlMs });
}

export function shouldCacheStructuredVoiceIntent(intent) {
    if (!intent || typeof intent !== 'object') return false;
    if (intent.family === 'none' && intent.action === 'none' && !intent.needsClarification) return false;
    if (intent.needsClarification && !String(intent.clarificationPrompt || '').trim()) return false;
    return true;
}
