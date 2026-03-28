import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createToolConversationState,
    isGlobalUndoVoiceCommand,
    publishConversationObject,
    recordConversationAction,
    resolveConversationReference,
    undoLastConversationAction,
    setToolBranchState
} from '../src/services/toolConversation.js';
import { addNote } from '../src/services/notesStore.js';

test('tool conversation state tracks active branches and shared objects', () => {
    const state = { conversation: createToolConversationState() };

    const branch = setToolBranchState(state, 'gmail', {
        currentTask: 'compose email',
        lastUtterance: 'send email to joy',
        draft: { to: 'joy@example.com' }
    });
    const shared = publishConversationObject(state, {
        kind: 'note',
        label: 'Dentist tomorrow',
        value: 'Dentist tomorrow at 4pm'
    }, { tool: 'notes' });
    const action = recordConversationAction(state, {
        tool: 'gmail',
        action_type: 'draft_updated',
        user_visible_summary: 'Updated the email draft.'
    });

    assert.equal(state.conversation.activeTool, 'gmail');
    assert.equal(state.conversation.previousTool, '');
    assert.equal(branch.currentTask, 'compose email');
    assert.equal(shared.kind, 'note');
    assert.equal(state.conversation.sharedObjects.length, 1);
    assert.equal(action.action_type, 'draft_updated');
    assert.equal(state.conversation.recentActions.length, 1);
    assert.equal(resolveConversationReference(state, 'dentist')?.id, shared.id);
});

test('addNote publishes the note into conversation memory', () => {
    const state = { hubItems: [] };

    const added = addNote(state, 'Call mom tomorrow', { source: 'notes-voice' });

    assert.equal(added, true);
    assert.equal(state.conversation?.activeTool, 'notes');
    assert.equal(state.conversation?.sharedObjects?.[0]?.label, 'Call mom tomorrow');
    assert.equal(state.conversation?.recentActions?.[0]?.action_type, 'note_created');
    assert.equal(resolveConversationReference(state, 'call mom')?.label, 'Call mom tomorrow');
});

test('undoLastConversationAction removes the last note action', () => {
    const state = { hubItems: [] };
    addNote(state, 'Undo me later', {});

    const result = undoLastConversationAction(state);

    assert.equal(result.ok, true);
    assert.match(result.message, /removed that note|restored/i);
    assert.equal(state.hubItems.length, 0);
    assert.equal(resolveConversationReference(state, 'Undo me later'), null);
});

test('isGlobalUndoVoiceCommand recognizes common undo phrasing', () => {
    assert.equal(isGlobalUndoVoiceCommand('undo'), true);
    assert.equal(isGlobalUndoVoiceCommand('take that back'), true);
    assert.equal(isGlobalUndoVoiceCommand('restore that please'), true);
    assert.equal(isGlobalUndoVoiceCommand('change the subject'), false);
});

test('undoLastConversationAction cancels the latest timer', () => {
    const timerId = 12345;
    const state = {
        timers: [{ id: timerId, text: 'Tea', time: Date.now() + 60000 }],
        conversation: createToolConversationState()
    };

    recordConversationAction(state, {
        tool: 'timer',
        action_type: 'timer_created',
        target_object: String(timerId),
        previous_state: null,
        new_state: { id: timerId, text: 'Tea', time: Date.now() + 60000 },
        undo_strategy: 'cancel_timer',
        undo_window: 'session',
        user_visible_summary: 'Set timer for tea'
    });

    const result = undoLastConversationAction(state);

    assert.equal(result.ok, true);
    assert.equal(state.timers.length, 0);
});
