/**
 * Notes store: pure functions over state.hubItems for note CRUD.
 * Used by main.js and by integration tests.
 */
import {
    publishConversationObject,
    recordConversationAction,
    setToolBranchState
} from './toolConversation.js';

function isNoteItem(item) {
    return item?.type === 'note' || (item?.type === 'user' && item?.data?.source === 'notes-tool');
}

export function getNoteItems(state) {
    return (state.hubItems || []).filter(isNoteItem);
}

export function addNote(state, content, data = {}) {
    const note = String(content || '').trim();
    if (!note) return false;
    const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'note',
        content: note,
        data: { source: 'notes-tool', ...data },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    if (!state.hubItems) state.hubItems = [];
    state.hubItems.unshift(item);
    if (state.hubItems.length > 50) state.hubItems.pop();
    try {
        setToolBranchState(state, 'notes', {
            currentTask: data.task || 'capture note',
            lastUtterance: String(data.lastUtterance || note).trim(),
            draft: {
                note
            },
            note
        });
        publishConversationObject(state, {
            id: item.id,
            kind: 'note',
            label: note,
            content: note,
            value: note,
            tool: 'notes',
            source: data.source || 'notes-tool',
            tags: Array.isArray(data.tags) ? data.tags : [],
            linkedIds: Array.isArray(data.linkedIds) ? data.linkedIds : [],
            undoable: true,
            createdAt: item.timestamp
        }, { tool: 'notes', source: data.source || 'notes-tool', undoable: true });
        recordConversationAction(state, {
            tool: 'notes',
            action_type: 'note_created',
            target_object: item.id,
            previous_state: null,
            new_state: { noteItem: { ...item }, content: note },
            undo_strategy: 'delete_note',
            undo_window: 'session',
            user_visible_summary: `Saved note: ${note}`
        });
    } catch (_) {
        // Conversation memory is best effort.
    }
    return true;
}

export function clearNotes(state) {
    const noteIds = new Set(getNoteItems(state).map((item) => String(item?.id)));
    if (!noteIds.size) return 0;
    const before = (state.hubItems || []).length;
    const previousNotes = getNoteItems(state).map((item) => ({ ...item }));
    state.hubItems = (state.hubItems || []).filter((item) => !noteIds.has(String(item?.id)));
    try {
        recordConversationAction(state, {
            tool: 'notes',
            action_type: 'notes_cleared',
            previous_state: { notes: previousNotes },
            new_state: { remaining: state.hubItems.length },
            undo_strategy: 'restore_notes',
            undo_window: 'session',
            user_visible_summary: 'Cleared notes'
        });
    } catch (_) {
        // best effort
    }
    return before - state.hubItems.length;
}

export function removeNoteById(state, id) {
    const before = (state.hubItems || []).length;
    const removedNote = (state.hubItems || []).find((item) => String(item?.id) === String(id));
    state.hubItems = (state.hubItems || []).filter((item) => String(item?.id) !== String(id));
    if (before !== state.hubItems.length) {
        try {
            recordConversationAction(state, {
                tool: 'notes',
                action_type: 'note_removed',
                target_object: String(id || ''),
                previous_state: { noteItem: removedNote },
                undo_strategy: 'restore_note',
                undo_window: 'session',
                user_visible_summary: `Removed note ${String(id || '')}`
            });
        } catch (_) {
            // best effort
        }
    }
    return before !== state.hubItems.length;
}
