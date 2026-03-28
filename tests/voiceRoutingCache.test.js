import test from 'node:test';
import assert from 'node:assert/strict';

import {
    clearVoiceRoutingCache,
    getCachedStructuredVoiceIntent,
    makeVoiceRoutingCacheEpoch,
    setCachedStructuredVoiceIntent,
    shouldCacheStructuredVoiceIntent
} from '../src/services/voiceRoutingCache.js';

test('makeVoiceRoutingCacheEpoch shifts when panel or draft flags change', () => {
    const a = makeVoiceRoutingCacheEpoch({
        currentSidePanelAction: 'gmail',
        conversation: { activeTool: 'gmail' },
        pendingEmailReview: false,
        pendingTelegramReview: false,
        gmailComposeDraft: {},
        telegramDraft: {}
    });
    const b = makeVoiceRoutingCacheEpoch({
        currentSidePanelAction: 'telegram',
        conversation: { activeTool: 'gmail' },
        pendingEmailReview: false,
        pendingTelegramReview: false,
        gmailComposeDraft: {},
        telegramDraft: {}
    });
    assert.notEqual(a, b);

    const c = makeVoiceRoutingCacheEpoch({
        currentSidePanelAction: 'gmail',
        conversation: { activeTool: 'gmail' },
        pendingEmailReview: false,
        pendingTelegramReview: false,
        gmailComposeDraft: { to: 'x@y.com', text: 'hi' },
        telegramDraft: {}
    });
    assert.notEqual(a, c);
});

test('getCachedStructuredVoiceIntent returns a clone; expired entries miss', () => {
    clearVoiceRoutingCache();
    const state = {
        currentSidePanelAction: '',
        conversation: { activeTool: '' },
        pendingEmailReview: false,
        pendingTelegramReview: false,
        gmailComposeDraft: {},
        telegramDraft: {}
    };
    const intent = {
        family: 'telegram',
        action: 'compose',
        confidence: 0.9,
        needsClarification: false,
        clarificationPrompt: '',
        draft: { to: '', recipientQuery: '', subject: '', text: 'hi', chatId: '1' }
    };
    setCachedStructuredVoiceIntent(state, 'message bob', intent);
    const hit = getCachedStructuredVoiceIntent(state, 'message bob');
    assert.deepEqual(hit, intent);
    assert.notStrictEqual(hit, intent);

    setCachedStructuredVoiceIntent(state, 'stale', intent, -1);
    assert.equal(getCachedStructuredVoiceIntent(state, 'stale'), null);
    clearVoiceRoutingCache();
});

test('shouldCacheStructuredVoiceIntent skips empty and incomplete clarification', () => {
    assert.equal(
        shouldCacheStructuredVoiceIntent({
            family: 'none',
            action: 'none',
            needsClarification: false,
            clarificationPrompt: '',
            draft: {}
        }),
        false
    );
    assert.equal(
        shouldCacheStructuredVoiceIntent({
            family: 'message',
            action: 'clarify',
            needsClarification: true,
            clarificationPrompt: '',
            draft: {}
        }),
        false
    );
    assert.equal(
        shouldCacheStructuredVoiceIntent({
            family: 'message',
            action: 'clarify',
            needsClarification: true,
            clarificationPrompt: 'Which one?',
            draft: {}
        }),
        true
    );
});
