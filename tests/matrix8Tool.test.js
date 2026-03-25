import test from 'node:test';
import assert from 'node:assert/strict';

// Mocking the intent parsers for a matrix test
// In a real scenario, we'd import the actual functions from src/main.js
// but since we want to verify the logic we've seen, we'll check the service boundaries.

import { getGmailVoiceCommand } from '../src/services/gmailVoice.js';
import { getTelegramVoiceCommand } from '../src/services/telegramVoice.js';

test('8-Tool Matrix: Gmail', () => {
    assert.ok(getGmailVoiceCommand('check my email').action === 'openInbox');
    assert.ok(getGmailVoiceCommand('send an email').action === 'compose');
});

test('8-Tool Matrix: Telegram', () => {
    assert.ok(getTelegramVoiceCommand('open telegram').action === 'openPanel');
    assert.ok(getTelegramVoiceCommand('compose telegram').action === 'compose');
});

// For Calendar, YouTube, etc. the logic is mostly in main.js regexes
// However, we can test that 'open photos' does not trigger Gmail/Telegram
test('8-Tool Matrix: Photos Priority', () => {
    assert.strictEqual(getGmailVoiceCommand('open photos'), null);
    assert.strictEqual(getTelegramVoiceCommand('open photos'), null);
});
