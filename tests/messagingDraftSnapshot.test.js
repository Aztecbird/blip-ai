import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildMessagingDraftSnapshot,
    summarizeGmailDraft,
    summarizeTelegramDraft
} from '../src/services/messagingDraftSnapshot.js';

test('summarizeGmailDraft detects recipient query, body, attachments', () => {
    assert.equal(summarizeGmailDraft({}).hasDraft, false);
    assert.equal(summarizeGmailDraft({ recipientQuery: 'mom' }).hasDraft, true);
    assert.equal(summarizeGmailDraft({ recipientQuery: 'mom' }).hasRecipientSlot, true);
    assert.equal(summarizeGmailDraft({ recipientQuery: 'mom' }).hasResolvedTo, false);
    assert.equal(summarizeGmailDraft({ to: 'a@b.com', text: 'hi' }).hasBody, true);
    assert.equal(summarizeGmailDraft({ attachments: [{}] }).hasDraft, true);
    assert.equal(summarizeGmailDraft({ attachments: [{}] }).hasAttachments, true);
});

test('summarizeTelegramDraft treats chatId or text as draft', () => {
    assert.equal(summarizeTelegramDraft({}).hasDraft, false);
    assert.equal(summarizeTelegramDraft({ chatId: '123' }).hasDraft, true);
    assert.equal(summarizeTelegramDraft({ chatId: '123' }).hasChatId, true);
    assert.equal(summarizeTelegramDraft({ text: 'hi' }).hasBody, true);
});

test('buildMessagingDraftSnapshot aggregates both channels', () => {
    const snap = buildMessagingDraftSnapshot({
        gmailComposeDraft: { to: 'x@y.com', text: 'a' },
        telegramDraft: { chatId: '1', text: '' }
    });
    assert.equal(snap.hasAnyMessagingDraft, true);
    assert.equal(snap.hasBothMessagingDrafts, true);
    assert.equal(snap.gmail.hasDraft, true);
    assert.equal(snap.telegram.hasDraft, true);
});
