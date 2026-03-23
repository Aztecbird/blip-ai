import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getNoteItems,
    addNote,
    clearNotes,
    removeNoteById
} from '../src/services/notesStore.js';

test('addNote adds a note and getNoteItems returns it', () => {
    const state = { hubItems: [] };

    const added = addNote(state, 'Buy milk tomorrow', { source: 'notes-voice' });
    const notes = getNoteItems(state);

    assert.equal(added, true);
    assert.equal(notes.length, 1);
    assert.equal(notes[0].content, 'Buy milk tomorrow');
    assert.equal(notes[0].type, 'note');
    assert.ok(notes[0].id != null);
    assert.ok(notes[0].timestamp != null);
    assert.ok(notes[0].data?.source === 'notes-tool' || notes[0].data?.source === 'notes-voice');
});

test('clearNotes removes all notes', () => {
    const state = { hubItems: [] };
    addNote(state, 'First note', {});
    addNote(state, 'Second note', {});

    const removedCount = clearNotes(state);
    const notes = getNoteItems(state);

    assert.equal(removedCount, 2);
    assert.equal(notes.length, 0);
    assert.equal(state.hubItems.length, 0);
});

test('removeNoteById removes only the note with the given id', () => {
    const state = { hubItems: [] };
    addNote(state, 'Note A', {});
    addNote(state, 'Note B', {});
    const notesBefore = getNoteItems(state);
    const idToRemove = notesBefore[0].id;
    const contentToKeep = notesBefore[1].content;

    const removed = removeNoteById(state, idToRemove);
    const notesAfter = getNoteItems(state);

    assert.equal(removed, true);
    assert.equal(notesAfter.length, 1);
    assert.equal(notesAfter[0].content, contentToKeep);
    assert.equal(notesAfter[0].id, notesBefore[1].id);
});

test('addNote returns false for empty content', () => {
    const state = { hubItems: [] };

    const added = addNote(state, '   ', {});
    const notes = getNoteItems(state);

    assert.equal(added, false);
    assert.equal(notes.length, 0);
});

test('clearNotes returns 0 when there are no notes', () => {
    const state = { hubItems: [] };

    const removedCount = clearNotes(state);

    assert.equal(removedCount, 0);
});
