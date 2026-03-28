import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createParseResult,
    normalizeCommandText,
    normalizeVoiceCommandText,
    stripVoiceAssistantPrefix
} from '../src/services/textParsing.js';

test('normalizeCommandText gives parsers a shared cleanup pass', () => {
    assert.equal(normalizeCommandText('  Send an email!  '), 'send an email');
    assert.equal(normalizeCommandText('I want to send and email'), 'i want to send and email');
});

test('normalizeVoiceCommandText strips the wake prefix before parsing', () => {
    assert.equal(normalizeVoiceCommandText('Hey Blip, open student desk!'), 'open student desk');
    assert.equal(stripVoiceAssistantPrefix('Hey Blip, note: remember the keys!'), 'note: remember the keys');
});

test('createParseResult clamps confidence and preserves raw text', () => {
    const result = createParseResult({
        raw: '  Help  ',
        lower: 'help',
        kind: 'carecam',
        action: 'start_and_send_help',
        confidence: 1.4
    });

    assert.equal(result.raw, 'Help');
    assert.equal(result.normalized, 'help');
    assert.equal(result.confidence, 1);
    assert.equal(result.kind, 'carecam');
    assert.equal(result.action, 'start_and_send_help');
});
