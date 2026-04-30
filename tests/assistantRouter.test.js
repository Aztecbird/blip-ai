import test from 'node:test';
import assert from 'node:assert/strict';

import { buildVoiceRoutingSnapshot, resolveVoiceRoutingSnapshot } from '../src/services/assistantRouter.js';
import { normalizeStructuredVoiceIntent } from '../src/services/voiceIntentSchema.js';
import { clearVoiceRoutingCache } from '../src/services/voiceRoutingCache.js';

test('buildVoiceRoutingSnapshot keeps fresh Gmail compose separate from follow-up handling', () => {
    const route = buildVoiceRoutingSnapshot('send email to joy@example.com subject hello message hi', {
        pendingEmailReview: true,
        currentSidePanelAction: 'gmail',
        gmailComposeDraft: { to: 'someone@example.com', subject: 'hi', text: 'hello' }
    });

    assert.equal(route.family, 'gmail');
    assert.equal(route.gmailCmd?.action, 'sendDirect');
    assert.equal(route.action, 'sendDirect');
    assert.equal(route.needsClarification, false);
    assert.equal(route.isFreshGmailComposeIntent, true);
    assert.equal(route.shouldHandleEmailDraftVoice, false);
});

test('buildVoiceRoutingSnapshot keeps follow-up handling for short confirmations', () => {
    const route = buildVoiceRoutingSnapshot('yes', {
        pendingEmailReview: true,
        currentSidePanelAction: 'gmail',
        gmailComposeDraft: { to: '', subject: '', text: 'draft' }
    });

    assert.equal(route.family, 'none');
    assert.equal(route.gmailCmd, null);
    assert.equal(route.isFreshGmailComposeIntent, false);
    assert.equal(route.shouldHandleEmailDraftVoice, true);
});

test('buildVoiceRoutingSnapshot still detects telegram and care cam intents', () => {
    const route = buildVoiceRoutingSnapshot('turn on care cam', {});
    assert.equal(route.family, 'carecam');
    assert.equal(route.careCamIntent?.kind, 'carecam');
    assert.equal(route.careCamIntent?.action, 'start_carecam');

    const telegramRoute = buildVoiceRoutingSnapshot('send telegram', {
        currentSidePanelAction: 'telegram'
    });
    assert.equal(telegramRoute.family, 'telegram');
    assert.equal(telegramRoute.telegramCmd?.action, 'compose');
});

test('buildVoiceRoutingSnapshot treats telegram instead as a telegram correction route', () => {
    const route = buildVoiceRoutingSnapshot('telegram instead', {
        pendingEmailReview: true,
        currentSidePanelAction: 'gmail',
        gmailComposeDraft: { to: '', recipientQuery: 'ana', subject: '', text: 'hello' }
    });

    assert.equal(route.family, 'telegram');
    assert.equal(route.action, 'compose');
    assert.equal(route.telegramCmd?.switchFrom, 'gmail');
});

test('buildVoiceRoutingSnapshot asks for clarification on vague messaging', () => {
    const route = buildVoiceRoutingSnapshot('message alex', {});
    assert.equal(route.family, 'message');
    assert.equal(route.action, 'clarify');
    assert.equal(route.needsClarification, true);
    assert.match(route.clarificationPrompt, /Gmail or Telegram/);
});

test('buildVoiceRoutingSnapshot sends bare telegram approval words when a telegram draft exists', () => {
    const route = buildVoiceRoutingSnapshot('send', {
        currentSidePanelAction: 'telegram',
        pendingTelegramReview: false,
        telegramDraft: { chatId: 'joy', text: 'hello there' }
    });

    assert.equal(route.family, 'telegram');
    assert.equal(route.action, 'sendDirect');
    assert.equal(route.needsClarification, false);
    assert.equal(route.telegramCmd, null);
});

test('buildVoiceRoutingSnapshot sends bare send to gmail when a gmail draft exists', () => {
    const route = buildVoiceRoutingSnapshot('send it', {
        currentSidePanelAction: 'gmail',
        pendingEmailReview: false,
        gmailComposeDraft: { to: 'joy@example.com', subject: 'hello', text: 'hi there' }
    });

    assert.equal(route.family, 'gmail');
    assert.equal(route.action, 'sendDirect');
    assert.equal(route.needsClarification, false);
    assert.equal(route.gmailCmd, null);
});

test('buildVoiceRoutingSnapshot uses voice messaging focus when both drafts exist', () => {
    const base = {
        currentSidePanelAction: '',
        pendingEmailReview: false,
        pendingTelegramReview: false,
        gmailComposeDraft: { to: 'a@b.com', subject: 's', text: 'body' },
        telegramDraft: { chatId: '123', text: 'hi' },
        voiceSession: { lastMessagingTool: 'telegram', lastMessagingToolAtMs: Date.now() }
    };

    const toTelegram = buildVoiceRoutingSnapshot('send', base);
    assert.equal(toTelegram.family, 'telegram');
    assert.equal(toTelegram.action, 'sendDirect');
    assert.equal(toTelegram.needsClarification, false);

    const toGmail = buildVoiceRoutingSnapshot('send', {
        ...base,
        voiceSession: { lastMessagingTool: 'gmail', lastMessagingToolAtMs: Date.now() }
    });
    assert.equal(toGmail.family, 'gmail');
});

test('buildVoiceRoutingSnapshot clarifies bare send when both drafts exist and no focus', () => {
    const route = buildVoiceRoutingSnapshot('send it', {
        currentSidePanelAction: '',
        gmailComposeDraft: { to: 'a@b.com', subject: 's', text: 'body' },
        telegramDraft: { chatId: '123', text: 'hi' },
        voiceSession: { lastMessagingTool: '', lastMessagingToolAtMs: 0 }
    });

    assert.equal(route.family, 'message');
    assert.equal(route.action, 'clarify');
    assert.equal(route.needsClarification, true);
    assert.match(route.clarificationPrompt, /Gmail draft or the Telegram/i);
});

test('buildVoiceRoutingSnapshot routes go send it via strong send matcher', () => {
    const route = buildVoiceRoutingSnapshot('go send it', {
        currentSidePanelAction: 'gmail',
        gmailComposeDraft: { to: 'a@b.com', subject: '', text: 'ok' }
    });
    assert.equal(route.family, 'gmail');
    assert.equal(route.action, 'sendDirect');
});

test('normalizeStructuredVoiceIntent clamps and cleans structured parser output', () => {
    const intent = normalizeStructuredVoiceIntent({
        family: 'telegram',
        action: 'sendText',
        confidence: 2,
        needsClarification: '',
        clarificationPrompt: '  Which one?  ',
        draft: {
            to: '  ',
            recipientQuery: ' Joy  ',
            subject: '  ',
            text: '  hi there  ',
            chatId: '  @joy  '
        }
    });

    assert.deepEqual(intent, {
        family: 'telegram',
        action: 'sendText',
        confidence: 1,
        needsClarification: false,
        clarificationPrompt: 'Which one?',
        draft: {
            to: '',
            recipientQuery: 'Joy',
            subject: '',
            text: 'hi there',
            chatId: '@joy'
        }
    });
});

test('resolveVoiceRoutingSnapshot uses Gemini fallback for ambiguous commands', async () => {
    clearVoiceRoutingCache();
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;

    globalThis.fetch = async () => {
        fetchCalls += 1;
        return {
            ok: true,
            json: async () => ({
                candidates: [{
                    content: {
                        parts: [{
                            text: JSON.stringify({
                                family: 'telegram',
                                action: 'compose',
                                confidence: 0.97,
                                needsClarification: false,
                                clarificationPrompt: '',
                                draft: {
                                    to: '',
                                    recipientQuery: '',
                                    subject: '',
                                    text: 'hello alex',
                                    chatId: 'alex'
                                }
                            })
                        }]
                    }
                }]
            })
        };
    };

    try {
        const state = {
            currentSidePanelAction: 'gmail',
            geminiKey: 'test-key',
            conversation: { activeTool: '' },
            pendingEmailReview: false,
            pendingTelegramReview: false,
            gmailComposeDraft: {},
            telegramDraft: {}
        };
        const route = await resolveVoiceRoutingSnapshot('message alex', state);

        assert.equal(fetchCalls, 1);
        assert.equal(route.family, 'telegram');
        assert.equal(route.action, 'compose');
        assert.equal(route.needsClarification, false);
        assert.equal(route.telegramCmd?.action, 'compose');
        assert.equal(route.telegramCmd?.draft?.chatId, 'alex');
        assert.equal(route.telegramCmd?.draft?.text, 'hello alex');

        const route2 = await resolveVoiceRoutingSnapshot('message alex', state);
        assert.equal(fetchCalls, 1);
        assert.equal(route2.family, 'telegram');
        assert.equal(route2.telegramCmd?.draft?.chatId, 'alex');
    } finally {
        globalThis.fetch = originalFetch;
        clearVoiceRoutingCache();
    }
});
