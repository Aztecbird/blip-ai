import test from 'node:test';
import assert from 'node:assert/strict';

import { buildVoiceIntentPrompt } from '../src/services/voiceIntentSchema.js';

test('buildVoiceIntentPrompt passes voice session and draft flags to the model context', () => {
    const prompt = buildVoiceIntentPrompt('send it', {
        activePanel: '',
        gmailFlow: true,
        telegramFlow: true,
        pendingEmailReview: false,
        pendingTelegramReview: false,
        careCamActive: false,
        lastMessagingFocus: 'telegram',
        hasGmailDraft: true,
        hasTelegramDraft: true,
        gmailHasBody: true,
        telegramHasBody: false
    });
    assert.match(prompt, /"lastMessagingFocus":"telegram"/);
    assert.match(prompt, /"hasGmailDraft":true/);
    assert.match(prompt, /"hasTelegramDraft":true/);
    assert.match(prompt, /"gmailHasBody":true/);
    assert.match(prompt, /"telegramHasBody":false/);
});
