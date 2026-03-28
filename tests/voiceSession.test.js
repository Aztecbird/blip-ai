import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ensureVoiceSession,
    getVoiceMessagingFocus,
    recordVoiceMessagingFocus
} from '../src/services/voiceSession.js';

test('recordVoiceMessagingFocus only tracks gmail and telegram', () => {
    const state = {};
    recordVoiceMessagingFocus(state, 'calendar');
    assert.equal(state.voiceSession, undefined);

    recordVoiceMessagingFocus(state, 'gmail');
    assert.equal(ensureVoiceSession(state).lastMessagingTool, 'gmail');
    assert.ok(Number(state.voiceSession.lastMessagingToolAtMs) > 0);

    recordVoiceMessagingFocus(state, 'Telegram');
    assert.equal(state.voiceSession.lastMessagingTool, 'telegram');
});

test('getVoiceMessagingFocus expires after ttl', () => {
    const state = {
        voiceSession: {
            lastMessagingTool: 'gmail',
            lastMessagingToolAtMs: Date.now() - 60 * 60 * 1000
        }
    };
    assert.equal(getVoiceMessagingFocus(state, 12 * 60 * 1000), null);
    assert.equal(getVoiceMessagingFocus(state, 2 * 60 * 60 * 1000), 'gmail');
});
