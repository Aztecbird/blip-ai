import test from 'node:test';
import assert from 'node:assert/strict';

import { createBlipNextBridge, shouldTryBlipNextRoute } from '../src/services/blipNextBridge.js';

test('shouldTryBlipNextRoute catches messaging intents and short follow-ups', () => {
    assert.equal(shouldTryBlipNextRoute('email Natasha hello', {}), true);
    assert.equal(shouldTryBlipNextRoute('send it', { pendingEmailReview: true }), true);
    assert.equal(shouldTryBlipNextRoute('yes', {}), false);
    assert.equal(shouldTryBlipNextRoute('yes', { activeConversationFlow: true }), true);
    assert.equal(shouldTryBlipNextRoute('remind me to email tomorrow', {}), false);
    assert.equal(shouldTryBlipNextRoute('what is the capital of France', {}), false);
});

test('bridge routes gmail drafts into existing email feature', async () => {
    const calls = [];
    const bridge = createBlipNextBridge({
        emailFeature: {
            handleVoiceCommand: async (payload) => calls.push(payload),
            handlePendingVoiceFollowUp: async () => false,
        },
        telegramFeature: {
            handlePendingVoiceFollowUp: async () => false,
        },
        quickReply: async () => {},
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: '',
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: '', text: '' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('email Natasha "Running late"', state);

    assert.equal(result.handled, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].action, 'compose');
    assert.equal(calls[0].draft.recipientQuery, 'Natasha');
    assert.equal(calls[0].draft.text, 'Running late');
});

test('bridge routes confirmations into pending telegram flow', async () => {
    const calls = [];
    const bridge = createBlipNextBridge({
        emailFeature: {
            handlePendingVoiceFollowUp: async () => false,
        },
        telegramFeature: {
            handlePendingVoiceFollowUp: async (command) => {
                calls.push(command);
                return true;
            },
        },
        quickReply: async () => {},
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: true,
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: 'Teo', text: 'hello' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('send it', state);

    assert.equal(result.handled, true);
    assert.deepEqual(calls, ['send it']);
});

test('bridge treats plain "send" as pending telegram confirmation', async () => {
    const calls = [];
    const bridge = createBlipNextBridge({
        emailFeature: {
            handlePendingVoiceFollowUp: async () => false,
        },
        telegramFeature: {
            handlePendingVoiceFollowUp: async (command) => {
                calls.push(command);
                return true;
            },
        },
        quickReply: async () => {},
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: true,
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: 'Teo', text: 'hello' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('send', state);

    assert.equal(result.handled, true);
    assert.deepEqual(calls, ['send']);
});

test('bridge drops pending draft and lets notes command continue', async () => {
    const quickReplies = [];
    const bridge = createBlipNextBridge({
        emailFeature: {
            handlePendingVoiceFollowUp: async () => false,
        },
        telegramFeature: {
            handlePendingVoiceFollowUp: async () => false,
        },
        quickReply: async (text) => quickReplies.push(text),
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: true,
        pendingEmailReview: false,
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: 'Teo', text: 'hello' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('forget the draft open notes', state);

    assert.equal(result.handled, false);
    assert.equal(state.pendingTelegramReview, false);
    assert.equal(state.telegramDraft.text, '');
    assert.equal(quickReplies.length, 0);
});

test('bridge clears pending draft for explicit new command and falls through', async () => {
    const quickReplies = [];
    const bridge = createBlipNextBridge({
        emailFeature: {
            handlePendingVoiceFollowUp: async () => false,
        },
        telegramFeature: {
            handlePendingVoiceFollowUp: async () => false,
        },
        quickReply: async (text) => quickReplies.push(text),
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: true,
        pendingEmailReview: false,
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: 'Teo', text: 'hello' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('send photo one to my telegram', state);

    assert.equal(result.handled, false);
    assert.equal(state.pendingTelegramReview, false);
    assert.equal(state.telegramDraft.text, '');
    assert.equal(quickReplies.length, 0);
});

test('bridge clears pending draft for navigation commands like close telegram', async () => {
    const bridge = createBlipNextBridge({
        emailFeature: { handlePendingVoiceFollowUp: async () => false },
        telegramFeature: { handlePendingVoiceFollowUp: async () => false },
        quickReply: async () => {},
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: true,
        pendingEmailReview: false,
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: 'Teo', text: 'hello' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('close telegram', state);

    assert.equal(result.handled, false);
    assert.equal(state.pendingTelegramReview, false);
    assert.equal(state.telegramDraft.text, '');
});

test('bridge clears pending draft for panel shortcut command photos', async () => {
    const bridge = createBlipNextBridge({
        emailFeature: { handlePendingVoiceFollowUp: async () => false },
        telegramFeature: { handlePendingVoiceFollowUp: async () => false },
        quickReply: async () => {},
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: true,
        pendingEmailReview: false,
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: 'Teo', text: 'hello' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('photos', state);

    assert.equal(result.handled, false);
    assert.equal(state.pendingTelegramReview, false);
    assert.equal(state.telegramDraft.text, '');
});

test('bridge clears pending draft for general conversation sentence', async () => {
    const bridge = createBlipNextBridge({
        emailFeature: { handlePendingVoiceFollowUp: async () => false },
        telegramFeature: { handlePendingVoiceFollowUp: async () => false },
        quickReply: async () => {},
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: true,
        pendingEmailReview: false,
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: 'Teo', text: 'hello' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('my insulin should be 36', state);

    assert.equal(result.handled, false);
    assert.equal(state.pendingTelegramReview, false);
    assert.equal(state.telegramDraft.text, '');
});

test('bridge clears pending draft for panel navigation with extra query words', async () => {
    const bridge = createBlipNextBridge({
        emailFeature: { handlePendingVoiceFollowUp: async () => false },
        telegramFeature: { handlePendingVoiceFollowUp: async () => false },
        quickReply: async () => {},
        runTimer: async () => ({ text: 'Timer set.' }),
    });

    const state = {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: true,
        pendingEmailReview: false,
        gmailComposeDraft: { to: '', subject: '', text: '' },
        telegramDraft: { chatId: 'Teo', text: 'hello' },
        hubItems: [],
        lastContext: {},
    };

    const result = await bridge.handle('open the youtube of jethro tull playing flute', state);

    assert.equal(result.handled, false);
    assert.equal(state.pendingTelegramReview, false);
    assert.equal(state.telegramDraft.text, '');
});
