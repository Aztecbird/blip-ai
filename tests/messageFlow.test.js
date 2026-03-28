import test from 'node:test';
import assert from 'node:assert/strict';

import { parseNaturalMessageFlow, parseRecipientAfterTo } from '../src/services/messageFlow.js';

test('parseNaturalMessageFlow opens compose for I want to send email', () => {
    const a = parseNaturalMessageFlow('I want to send email', {});
    assert.equal(a?.channel, 'gmail');
    assert.equal(a?.draft?.to, '');
    assert.equal(a?.draft?.recipientQuery, undefined);
});

test('parseNaturalMessageFlow does not treat want to as recipient', () => {
    const r = parseNaturalMessageFlow('I want to send email', {});
    assert.notEqual(r?.draft?.to, 'send');
});

test('parseNaturalMessageFlow bare send email with trailing please', () => {
    const r = parseNaturalMessageFlow('send email please', {});
    assert.equal(r?.channel, 'gmail');
    assert.equal(r?.draft?.to, '');
});

test('parseNaturalMessageFlow ASR variants for send an email', () => {
    assert.equal(parseNaturalMessageFlow('I want send and email', {})?.action, 'compose');
    assert.equal(parseNaturalMessageFlow('I want send email', {})?.action, 'compose');
    assert.equal(parseNaturalMessageFlow('can i send an email', {})?.action, 'compose');
    assert.equal(parseNaturalMessageFlow('I want to send email!', {})?.action, 'compose');
});

test('parseRecipientAfterTo ignores email to send and command words', () => {
    assert.equal(parseRecipientAfterTo('compose email to send'), '');
    assert.equal(parseRecipientAfterTo('I want to send email'), '');
    assert.equal(parseRecipientAfterTo('send email to send'), '');
    assert.equal(parseRecipientAfterTo('send email to bob@example.com'), 'bob@example.com');
});

test('parseNaturalMessageFlow does not turn telegram command words into a recipient', () => {
    const a = parseNaturalMessageFlow('telegram send message', {});
    assert.equal(a?.channel, 'telegram');
    assert.equal(a?.draft?.chatId, '');
    assert.equal(a?.draft?.text, '');

    const b = parseNaturalMessageFlow("telegram didn't want to send message", {});
    assert.equal(b, null);
});

test('parseNaturalMessageFlow send it to telegram opens telegram compose without bogus chat id', () => {
    const r = parseNaturalMessageFlow('send it to telegram', {});
    assert.equal(r?.channel, 'telegram');
    assert.equal(r?.draft?.chatId, '');
    assert.equal(r?.draft?.text, '');
});
