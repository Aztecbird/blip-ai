import test from 'node:test';
import assert from 'node:assert/strict';

import { getTelegramVoiceCommand } from '../src/services/telegramVoice.js';

test('getTelegramVoiceCommand opens the Telegram panel for compose prompts', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('can you send a telegram'),
        { action: 'compose', draft: { chatId: '', text: '' } }
    );
    assert.deepEqual(
        getTelegramVoiceCommand('open telegram messages'),
        { action: 'openPanel' }
    );
});

test('getTelegramVoiceCommand parses direct Telegram message drafts', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send telegram message hello from blip'),
        { action: 'sendDirect', draft: { text: 'hello from blip' } }
    );
    assert.deepEqual(
        getTelegramVoiceCommand('telegram send message'),
        { action: 'compose', draft: { chatId: '', text: '' } }
    );
});

test('getTelegramVoiceCommand closes telegram from common close phrasing', () => {
    assert.deepEqual(getTelegramVoiceCommand('close telegram'), { action: 'close' });
    assert.deepEqual(getTelegramVoiceCommand('close my telegram panel'), { action: 'close' });
});

test('getTelegramVoiceCommand detects photo-share requests', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send this photo on telegram'),
        { action: 'sharePhoto', quickSend: true, draft: { chatId: '' } }
    );
    assert.deepEqual(
        getTelegramVoiceCommand('send latest photo on telegram'),
        { action: 'sharePhoto', quickSend: true, draft: { chatId: '' } }
    );
});

test('getTelegramVoiceCommand parses targeted Telegram drafts', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send telegram to -1001234567890 message hello from blip'),
        { action: 'sendDirect', draft: { chatId: '-1001234567890', text: 'hello from blip' } }
    );
});

test('getTelegramVoiceCommand parses targeted Telegram photo shares', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send this photo on telegram to -1001234567890'),
        { action: 'sharePhoto', quickSend: true, draft: { chatId: '-1001234567890' } }
    );
});

test('getTelegramVoiceCommand parses natural targeted photo shares', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send picture to joy'),
        { action: 'sharePhoto', quickSend: true, draft: { chatId: 'joy' } }
    );
});

test('getTelegramVoiceCommand does not treat Gmail-style send it to as Telegram', () => {
    assert.equal(getTelegramVoiceCommand('send it to pablo arellano'), null);
    assert.equal(getTelegramVoiceCommand('send it to aztec bird at mac.com'), null);
});

test('getTelegramVoiceCommand still allows send it to on telegram for photos', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send it to joy on telegram'),
        { action: 'sharePhoto', quickSend: true, draft: { chatId: 'joy' } }
    );
});

test('getTelegramVoiceCommand routes send it to telegram to compose not Gmail', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send it to telegram'),
        { action: 'compose', draft: { chatId: '', text: '' } }
    );
    assert.deepEqual(
        getTelegramVoiceCommand('please send this to telegram'),
        { action: 'compose', draft: { chatId: '', text: '' } }
    );
});

test('getTelegramVoiceCommand parses polite explicit telegram photo shares', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('but i want it i want you to send it in telegram to joy'),
        { action: 'sharePhoto', quickSend: true, draft: { chatId: 'joy' } }
    );
});

test('getTelegramVoiceCommand parses conversational targeted telegram compose prompts', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('can you send a message to with telegram to joy'),
        { action: 'compose', draft: { chatId: 'joy', text: '' } }
    );
});

test('getTelegramVoiceCommand parses reversed targeted telegram compose prompts', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('can you send to joy in telegram a message'),
        { action: 'sendDirect', draft: { chatId: 'joy', text: '' } }
    );
});

test('getTelegramVoiceCommand keeps non-send verbs as drafts', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('write telegram to joy message hello from blip'),
        { action: 'compose', draft: { chatId: 'joy', text: 'hello from blip' } }
    );
});
