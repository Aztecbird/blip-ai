import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAudienceStyle,
  classifyReasoningMode,
  interpretIntent,
  runDeepReasoning,
} from '../src/services/reasoning.js';

test('buildAudienceStyle prefers explicit context mode for kids', () => {
  const result = buildAudienceStyle({
    mode: 'child',
    message: 'Explain planets to me',
  });

  assert.equal(result.mode, 'kids');
  assert.equal(result.label, 'kids');
  assert.match(result.prompt, /child under 7/i);
});

test('buildAudienceStyle detects senior phrasing from the message', () => {
  const result = buildAudienceStyle({
    message: 'Can you explain this for my grandma in simple steps?',
  });

  assert.equal(result.mode, 'senior');
  assert.equal(result.label, 'senior');
  assert.match(result.prompt, /for a senior/i);
});

test('classifyReasoningMode keeps greetings on the fast path', () => {
  const result = classifyReasoningMode('Hi Blip');

  assert.equal(result.mode, 'fast');
  assert.equal(result.reason, 'greeting');
  assert.deepEqual(result.reasonCodes, []);
  assert.deepEqual(result.toolSignals, []);
});

test('classifyReasoningMode switches to deep mode for multi-step planning requests', () => {
  const result = classifyReasoningMode(
    'Can you explain the weather forecast for tomorrow and then schedule a reminder at 6 pm?'
  );

  assert.equal(result.mode, 'deep');
  assert.match(result.reason, /multi_step/);
  assert.match(result.reason, /planning/);
  assert.match(result.reason, /explanation/);
  assert.deepEqual(result.toolSignals.sort(), ['calendar', 'weather']);
});

test('interpretIntent identifies demographic research prompts', async () => {
  const result = await interpretIntent('Who buys this product and what is the audience profile?');

  assert.equal(result.intent, 'demographic_research');
  assert.equal(result.originalInput, 'Who buys this product and what is the audience profile?');
});

test('runDeepReasoning returns an internal plan and preferred action without network calls', async () => {
  const result = await runDeepReasoning(
    'Please explain the weather forecast for tomorrow for my grandma.'
  );

  assert.equal(result.mode, 'deep');
  assert.equal(result.audienceMode, 'senior');
  assert.ok(result.internalPlan.length >= 3);
  assert.ok(result.internalPlan.some((step) => /weather/i.test(step)));
  assert.deepEqual(result.preferredActions, ['weather']);
  assert.equal(result.reviewedMessage, 'Please explain the weather forecast for tomorrow for my grandma.');
});
