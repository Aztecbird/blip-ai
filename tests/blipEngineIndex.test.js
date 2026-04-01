import test from 'node:test';
import assert from 'node:assert/strict';

import { createBlipEngine } from '../src/blip-engine/index.js';

test('createBlipEngine preloads app handlers into orchestrator', async () => {
  const engine = createBlipEngine({
    appHandlers: {
      timer: async () => ({ ok: true, response: 'Timer via app handler.' }),
    },
  });

  const out = await engine.processVoiceInput({
    utterance: 'set timer for 8 minutes',
  });

  assert.equal(out.ok, true);
  assert.equal(out.result.response, 'Timer via app handler.');
});
