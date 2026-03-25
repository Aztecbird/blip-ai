import test from 'node:test';
import assert from 'node:assert/strict';

import { isPriorityOpenLocalPhotosIntentFromLower } from '../src/voice/voiceToolIntent.js';

test('priority photos intent: open/show + photo nouns', () => {
    assert.equal(isPriorityOpenLocalPhotosIntentFromLower('open photos'), true);
    assert.equal(isPriorityOpenLocalPhotosIntentFromLower('please open my pictures'), true);
    assert.equal(isPriorityOpenLocalPhotosIntentFromLower('hey blip open shots'), true);
    assert.equal(isPriorityOpenLocalPhotosIntentFromLower('show me snapshots'), true);
});

test('priority photos intent: opts out when youtube is named', () => {
    assert.equal(isPriorityOpenLocalPhotosIntentFromLower('open youtube photos'), false);
    assert.equal(isPriorityOpenLocalPhotosIntentFromLower('open yt videos'), false);
});

test('priority photos intent: not bare nouns', () => {
    assert.equal(isPriorityOpenLocalPhotosIntentFromLower('photos'), false);
});
