import test from 'node:test';
import assert from 'node:assert/strict';

import { mistakeLearner, getToolLearningHint } from '../src/blip-engine/logic/MistakeLearner.js';

test('getToolLearningHint returns null for unknown command signatures', () => {
    mistakeLearner.memory = {};
    assert.equal(getToolLearningHint('open weather'), null);
});

test('getToolLearningHint returns confidence nudges for learned tool preferences', () => {
    mistakeLearner.memory = {};
    mistakeLearner.recordOutcome('open youtube music', 'youtube', 'success');
    mistakeLearner.recordOutcome('open youtube music', 'youtube', 'success');
    mistakeLearner.recordOutcome('open youtube music', 'youtube', 'success');

    const hint = getToolLearningHint('open youtube music');

    assert.equal(hint.tool, 'youtube');
    assert.equal(hint.signature, 'open_youtube_music');
    assert.ok(hint.confidence > 0.55);
});

test('getToolLearningHint ignores close scoring ties', () => {
    mistakeLearner.memory = {};
    mistakeLearner.recordOutcome('send it now', 'gmail', 'success');
    mistakeLearner.recordOutcome('send it now', 'telegram', 'success');

    assert.equal(getToolLearningHint('send it now'), null);
});
