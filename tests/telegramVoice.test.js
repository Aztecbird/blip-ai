import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getTelegramVoiceCommand
} from '../src/services/telegramVoice.js';

test('getTelegramVoiceCommand understands basic Telegram commands', () => {
    assert.deepEqual(getTelegramVoiceCommand('connect telegram'), { action: 'connect' });
    assert.deepEqual(getTelegramVoiceCommand('disconnect telegram'), { action: 'disconnect' });
    assert.deepEqual(getTelegramVoiceCommand('check telegram'), { action: 'openPanel' });
    assert.deepEqual(getTelegramVoiceCommand('open telegram'), { action: 'openPanel' });
    assert.deepEqual(getTelegramVoiceCommand('close telegram'), { action: 'close' });
});

test('getTelegramVoiceCommand understands Gmail-to-Telegram correction phrases', () => {
    assert.deepEqual(getTelegramVoiceCommand('telegram instead'), {
        action: 'compose',
        draft: { chatId: '', text: '' },
        switchFrom: 'gmail'
    });
    assert.deepEqual(getTelegramVoiceCommand('not email telegram'), {
        action: 'compose',
        draft: { chatId: '', text: '' },
        switchFrom: 'gmail'
    });
    assert.deepEqual(getTelegramVoiceCommand('send it in telegram'), {
        action: 'compose',
        draft: { chatId: '', text: '' },
        switchFrom: 'gmail'
    });
});

test('getTelegramVoiceCommand detects photo-share requests', () => {
    const res = getTelegramVoiceCommand('send my photo over telegram');
    assert.deepStrictEqual(res, {
        action: 'sharePhoto',
        draft: { chatId: '' },
        quickSend: true
    });
});

test('getTelegramVoiceCommand parses targeted Telegram drafts', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send telegram to -1001234567890 message hello from blip'),
        { action: 'sendDirect', draft: { chatId: '-1001234567890', text: 'hello from blip' } }
    );
});

test('getTelegramVoiceCommand parses targeted Telegram photo shares', () => {
    const res = getTelegramVoiceCommand('send my photo to telegram group -1001234567890');
    assert.deepStrictEqual(res, {
        action: 'sharePhoto',
        draft: { chatId: '-1001234567890' },
        quickSend: true
    });
});

test('getTelegramVoiceCommand parses YouTube link shares', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send this youtube link to telegram'),
        {
            action: 'shareCurrent',
            shareType: 'youtube',
            quickSend: true,
            draft: { chatId: '' }
        }
    );
    assert.deepEqual(
        getTelegramVoiceCommand('send this video to joy on telegram'),
        {
            action: 'shareCurrent',
            shareType: 'youtube',
            quickSend: true,
            draft: { chatId: 'joy' }
        }
    );
    assert.deepEqual(
        getTelegramVoiceCommand('telegram this youtube link'),
        {
            action: 'shareCurrent',
            shareType: 'youtube',
            quickSend: false,
            draft: { chatId: '' }
        }
    );
});

test('getTelegramVoiceCommand parses natural targeted photo shares', () => {
    const res = getTelegramVoiceCommand('send the photo to joy on telegram');
    assert.deepStrictEqual(res, {
        action: 'sharePhoto',
        draft: { chatId: 'joy on telegram' },
        quickSend: true
    });
});

test('getTelegramVoiceCommand parses polite explicit telegram photo shares', () => {
    const res = getTelegramVoiceCommand('blip send the photo to joy on telegram please');
    assert.deepStrictEqual(res, {
        action: 'sharePhoto',
        draft: { chatId: 'joy on telegram' },
        quickSend: true
    });
});

test('getTelegramVoiceCommand parses conversational targeted telegram compose prompts', () => {
    assert.deepEqual(
        getTelegramVoiceCommand('send telegram message to joy'),
        { action: 'sendDirect', draft: { chatId: 'joy', text: '' } }
    );
});
