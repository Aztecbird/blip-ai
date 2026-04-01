import test from 'node:test';
import assert from 'node:assert/strict';

import { createBlipSecretSauceEngine } from '../src/blip-core/index.js';

test('blip core asks clarification for ambiguous send', async () => {
  const engine = createBlipSecretSauceEngine({
    orchestrator: {
      handlers: {
        telegram: async () => ({ ok: true, response: 'sent' }),
      },
    },
  });

  const out = await engine.processVoiceInput({ utterance: "tell Teo I'm arriving late" });
  assert.equal(out.route.decision, 'clarify');
  assert.equal(out.actionPlan.confirmation_needed, true);
});

test('blip core maps timer command to timer tool', async () => {
  const engine = createBlipSecretSauceEngine({
    orchestrator: {
      handlers: {
        timer: async (action) => ({ ok: true, response: `timer for ${action.entities.minutes} min` }),
      },
    },
  });

  const out = await engine.processVoiceInput({ utterance: 'set timer for 8 minutes' });
  assert.equal(out.interpretedIntent.intent, 'timer_set');
  assert.equal(out.interpretedIntent.tool, 'timer');
  assert.equal(out.ok, true);
});
