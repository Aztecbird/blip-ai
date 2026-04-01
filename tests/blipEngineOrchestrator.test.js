import test from 'node:test';
import assert from 'node:assert/strict';

import { createOrchestrator } from '../src/blip-engine/core/Orchestrator.js';

test('createOrchestrator exposes default registered tools', () => {
  const orchestrator = createOrchestrator();
  const tools = orchestrator.getRegisteredTools();

  assert.ok(tools.includes('chat'));
  assert.ok(tools.includes('system'));
  assert.ok(tools.includes('youtube'));
});

test('createOrchestrator allows registering custom handlers', async () => {
  const orchestrator = createOrchestrator();
  const added = orchestrator.registerHandler('timer', async () => ({ ok: true, response: 'Timer started.' }));
  assert.equal(added, true);

  const result = await orchestrator.execute({
    tool: 'timer',
    intent: 'timer_set',
    confirmation_needed: false,
    entities: { minutes: 8 },
  }, {});

  assert.equal(result.ok, true);
  assert.equal(result.response, 'Timer started.');
});
