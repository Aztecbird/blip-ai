import test from 'node:test';
import assert from 'node:assert/strict';

import {
    advanceFreeformNotesDraft,
    isNotesDraftFinishIntent,
    parseFreeformNoteBody
} from '../src/services/notesDraftVoice.js';

test('isNotesDraftFinishIntent recognizes explicit note-done phrases', () => {
    assert.equal(isNotesDraftFinishIntent('save note'), true);
    assert.equal(isNotesDraftFinishIntent('i am done with the note'), true);
    assert.equal(isNotesDraftFinishIntent("i'm done with the note"), true);
    assert.equal(isNotesDraftFinishIntent('finish the note'), true);
    assert.equal(isNotesDraftFinishIntent('done with the note'), true);
    assert.equal(isNotesDraftFinishIntent('that is my whole note'), true);
    assert.equal(isNotesDraftFinishIntent('buy milk'), false);
});

test('advanceFreeformNotesDraft accumulates fragments until finish phrase', () => {
    const draft = { stage: 'awaiting_freeform', noteType: 'note', title: 'Note', items: [], bodyText: '' };

    const a = advanceFreeformNotesDraft(draft, 'first paragraph about the meeting', 'first paragraph about the meeting');
    assert.equal(a.type, 'needsMore');
    assert.match(a.message, /done with the note/i);
    assert.match(String(a.draft.bodyText || ''), /first paragraph/);

    const b = advanceFreeformNotesDraft(a.draft, 'second part with action items', 'second part with action items');
    assert.equal(b.type, 'needsMore');
    assert.ok(String(b.draft.bodyText || '').includes('first paragraph'));
    assert.ok(String(b.draft.bodyText || '').includes('second part'));

    const c = advanceFreeformNotesDraft(b.draft, 'I am done with the note', 'i am done with the note');
    assert.equal(c.type, 'complete');
    assert.ok(String(c.draft.bodyText || '').includes('first paragraph'));
    assert.ok(!String(c.draft.bodyText || '').toLowerCase().includes('done with the note'));
});

test('advanceFreeformNotesDraft does not complete on empty body when user says done', () => {
    const draft = { stage: 'awaiting_freeform', noteType: 'note', title: 'Note', items: [], bodyText: '' };
    const r = advanceFreeformNotesDraft(draft, 'save note', 'save note');
    assert.equal(r.type, 'needsMore');
    assert.match(r.message, /anything to save/i);
});

test('parseFreeformNoteBody strips note prefixes', () => {
    assert.equal(parseFreeformNoteBody('note: remember the keys'), 'remember the keys');
    assert.equal(parseFreeformNoteBody('Hey Blip, note: remember the keys!'), 'remember the keys');
});
