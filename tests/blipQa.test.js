import test from 'node:test';
import assert from 'node:assert/strict';

import { getBlipQaAnswer } from '../src/services/blipQa.js';

test('matches how smart are you', () => {
    const a = getBlipQaAnswer('how smart are you');
    assert.ok(typeof a === 'string' && a.toLowerCase().includes('understand what you mean'));
});

test('matches are you intelligent variant', () => {
    const a = getBlipQaAnswer('are you intelligent?');
    assert.ok(typeof a === 'string' && a.toLowerCase().includes('understand what you mean'));
});

test('does not match when user adds extra meaning', () => {
    const a = getBlipQaAnswer('can you write emails to mom about monday');
    assert.equal(a, null);
});

