/**
 * Notes store: pure functions over state.hubItems for note CRUD.
 * Used by main.js and by integration tests.
 */

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
    return true;
}

export function clearNotes(state) {
    const noteIds = new Set(getNoteItems(state).map((item) => String(item?.id)));
    if (!noteIds.size) return 0;
    const before = (state.hubItems || []).length;
    state.hubItems = (state.hubItems || []).filter((item) => !noteIds.has(String(item?.id)));
    return before - state.hubItems.length;
}

export function removeNoteById(state, id) {
    const before = (state.hubItems || []).length;
    state.hubItems = (state.hubItems || []).filter((item) => String(item?.id) !== String(id));
    return before !== state.hubItems.length;
}
