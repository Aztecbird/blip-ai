import { cleanText } from './textParsing.js';
import { recordVoiceMessagingFocus } from './voiceSession.js';

const STORAGE_KEY = 'blip_tool_conversation';
const MAX_BRANCHES = 20;
const MAX_SHARED_OBJECTS = 120;
const MAX_ACTIONS = 120;

function nowIso() {
    return new Date().toISOString();
}

function safeClone(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (_) {
        return null;
    }
}

function safeReadState() {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
        return null;
    }
}

function safeWriteState(state) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
        // Best effort only.
    }
}

function trimArray(items = [], limit = MAX_ACTIONS) {
    return Array.isArray(items) ? items.slice(0, limit) : [];
}

function normalizeUndoableAction(action = {}) {
    const undoStrategy = cleanText(action.undo_strategy || '');
    const undoWindow = cleanText(action.undo_window || 'session');
    return action.action_type !== 'undo' && undoStrategy !== 'none' && undoWindow !== 'none';
}

function normalizeBranch(branch = {}, toolId = '') {
    return {
        toolId,
        currentTask: cleanText(branch.currentTask || ''),
        currentIntent: branch.currentIntent && typeof branch.currentIntent === 'object'
            ? { ...branch.currentIntent }
            : null,
        activePanel: cleanText(branch.activePanel || ''),
        panelStack: Array.isArray(branch.panelStack) ? branch.panelStack.slice(0, 10) : [],
        lastUtterance: cleanText(branch.lastUtterance || ''),
        draft: branch.draft && typeof branch.draft === 'object' ? { ...branch.draft } : null,
        referencedObjects: Array.isArray(branch.referencedObjects) ? branch.referencedObjects.slice(0, 10) : [],
        updatedAt: String(branch.updatedAt || nowIso()),
        note: cleanText(branch.note || ''),
    };
}

export function createToolConversationState() {
    const stored = safeReadState();
    if (stored && typeof stored === 'object') {
        return {
            activeTool: cleanText(stored.activeTool || ''),
            previousTool: cleanText(stored.previousTool || ''),
            currentIntent: stored.currentIntent && typeof stored.currentIntent === 'object' ? { ...stored.currentIntent } : null,
            currentScreenStack: Array.isArray(stored.currentScreenStack) ? stored.currentScreenStack.slice(0, 10) : [],
            referencedEntities: Array.isArray(stored.referencedEntities) ? stored.referencedEntities.slice(0, 20) : [],
            recentActions: Array.isArray(stored.recentActions) ? trimArray(stored.recentActions, MAX_ACTIONS) : [],
            sharedObjects: Array.isArray(stored.sharedObjects) ? trimArray(stored.sharedObjects, MAX_SHARED_OBJECTS) : [],
            branches: stored.branches && typeof stored.branches === 'object' ? { ...stored.branches } : {},
            lastUpdatedAt: String(stored.lastUpdatedAt || nowIso())
        };
    }

    return {
        activeTool: '',
        previousTool: '',
        currentIntent: null,
        currentScreenStack: [],
        referencedEntities: [],
        recentActions: [],
        sharedObjects: [],
        branches: {},
        lastUpdatedAt: nowIso()
    };
}

export function ensureToolConversationState(state = {}) {
    if (!state.conversation || typeof state.conversation !== 'object') {
        state.conversation = createToolConversationState();
    }
    const convo = state.conversation;
    convo.activeTool = cleanText(convo.activeTool || '');
    convo.previousTool = cleanText(convo.previousTool || '');
    convo.currentScreenStack = Array.isArray(convo.currentScreenStack) ? convo.currentScreenStack.slice(0, 10) : [];
    convo.referencedEntities = Array.isArray(convo.referencedEntities) ? convo.referencedEntities.slice(0, 20) : [];
    convo.recentActions = Array.isArray(convo.recentActions) ? trimArray(convo.recentActions, MAX_ACTIONS) : [];
    convo.sharedObjects = Array.isArray(convo.sharedObjects) ? trimArray(convo.sharedObjects, MAX_SHARED_OBJECTS) : [];
    convo.branches = convo.branches && typeof convo.branches === 'object' ? convo.branches : {};
    return convo;
}

function persistConversationState(state = {}) {
    const convo = ensureToolConversationState(state);
    convo.lastUpdatedAt = nowIso();
    safeWriteState({
        activeTool: convo.activeTool,
        previousTool: convo.previousTool,
        currentIntent: convo.currentIntent || null,
        currentScreenStack: convo.currentScreenStack || [],
        referencedEntities: convo.referencedEntities || [],
        recentActions: convo.recentActions || [],
        sharedObjects: convo.sharedObjects || [],
        branches: convo.branches || {},
        lastUpdatedAt: convo.lastUpdatedAt
    });
}

export function setToolBranchState(state = {}, toolId = '', snapshot = {}) {
    const convo = ensureToolConversationState(state);
    const normalizedToolId = cleanText(toolId || '').toLowerCase();
    if (!normalizedToolId) return null;
    convo.previousTool = convo.activeTool || convo.previousTool || '';
    convo.activeTool = normalizedToolId;
    convo.currentIntent = snapshot.currentIntent && typeof snapshot.currentIntent === 'object'
        ? { ...snapshot.currentIntent }
        : convo.currentIntent;
    convo.currentScreenStack = Array.isArray(snapshot.currentScreenStack)
        ? snapshot.currentScreenStack.slice(0, 10)
        : convo.currentScreenStack;

    convo.branches[normalizedToolId] = normalizeBranch({
        ...(convo.branches[normalizedToolId] || {}),
        ...snapshot
    }, normalizedToolId);

    const branchCount = Object.keys(convo.branches).length;
    if (branchCount > MAX_BRANCHES) {
        const entries = Object.entries(convo.branches)
            .sort((left, right) => String(left[1]?.updatedAt || '').localeCompare(String(right[1]?.updatedAt || '')))
            .slice(branchCount - MAX_BRANCHES);
        convo.branches = Object.fromEntries(entries);
    }

    persistConversationState(state);
    recordVoiceMessagingFocus(state, normalizedToolId);
    return convo.branches[normalizedToolId];
}

export function publishConversationObject(state = {}, object = {}, meta = {}) {
    const convo = ensureToolConversationState(state);
    const id = cleanText(object.id || meta.id || `${meta.tool || convo.activeTool || 'object'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const label = cleanText(object.label || object.title || object.name || object.summary || object.content || '');
    const entry = {
        id,
        kind: cleanText(object.kind || object.type || meta.kind || 'entity'),
        label,
        value: object.value ?? object.content ?? object.text ?? null,
        tool: cleanText(meta.tool || object.tool || convo.activeTool || ''),
        source: cleanText(meta.source || object.source || ''),
        summary: cleanText(object.summary || ''),
        tags: Array.isArray(object.tags) ? object.tags.map((tag) => cleanText(tag)).filter(Boolean).slice(0, 10) : [],
        linkedIds: Array.isArray(object.linkedIds) ? object.linkedIds.map((item) => cleanText(item)).filter(Boolean).slice(0, 10) : [],
        undoable: Boolean(meta.undoable ?? object.undoable),
        createdAt: String(object.createdAt || nowIso()),
        updatedAt: String(object.updatedAt || nowIso()),
        payload: safeClone(object.payload ?? object)
    };

    convo.sharedObjects.unshift(entry);
    convo.sharedObjects = trimArray(convo.sharedObjects, MAX_SHARED_OBJECTS);
    persistConversationState(state);
    return entry;
}

export function recordConversationAction(state = {}, action = {}) {
    const convo = ensureToolConversationState(state);
    const entry = {
        action_id: cleanText(action.action_id || action.id || `${action.tool || convo.activeTool || 'action'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        tool: cleanText(action.tool || convo.activeTool || ''),
        action_type: cleanText(action.action_type || action.type || 'unknown'),
        timestamp: String(action.timestamp || nowIso()),
        target_object: cleanText(action.target_object || ''),
        previous_state: safeClone(action.previous_state || null),
        new_state: safeClone(action.new_state || null),
        undo_strategy: cleanText(action.undo_strategy || 'none'),
        undo_window: cleanText(action.undo_window || 'session'),
        user_visible_summary: cleanText(action.user_visible_summary || ''),
        undo: typeof action.undo === 'function' ? action.undo : null
    };

    convo.recentActions.unshift(entry);
    convo.recentActions = trimArray(convo.recentActions, MAX_ACTIONS);
    persistConversationState(state);
    return entry;
}

function inferEmailDraftStage(draft = {}) {
    const to = cleanText(draft.to || '');
    const subject = cleanText(draft.subject || '');
    const text = cleanText(draft.text || '');
    if (!to && !cleanText(draft.recipientQuery || '')) return 'awaitingRecipient';
    if (!subject && !draft.subjectSkipped) return 'awaitingSubject';
    if (!text) return 'awaitingMessage';
    return 'awaitingSendDecision';
}

function removeSharedObjectById(state = {}, id = '') {
    const convo = ensureToolConversationState(state);
    const needle = cleanText(id);
    if (!needle) return false;
    const before = convo.sharedObjects.length;
    convo.sharedObjects = convo.sharedObjects.filter((item) => String(item?.id || '') !== needle);
    return before !== convo.sharedObjects.length;
}

function restoreNoteItem(state = {}, item = null) {
    if (!item || typeof item !== 'object') return false;
    if (!state.hubItems) state.hubItems = [];
    const next = {
        ...item,
        type: item.type || 'note',
        data: item.data && typeof item.data === 'object' ? { ...item.data } : { source: 'notes-tool' }
    };
    state.hubItems.unshift(next);
    if (state.hubItems.length > 50) state.hubItems.pop();
    return true;
}

function removeNoteById(state = {}, id = '') {
    const before = Array.isArray(state.hubItems) ? state.hubItems.length : 0;
    state.hubItems = (state.hubItems || []).filter((item) => String(item?.id || '') !== String(id || ''));
    return before !== state.hubItems.length;
}

function removeCalendarArtifactsById(state = {}, eventId = '') {
    const needle = String(eventId || '').trim();
    if (!needle) return false;
    let changed = false;
    if (Array.isArray(state.pendingCalendarEvents)) {
        const before = state.pendingCalendarEvents.length;
        state.pendingCalendarEvents = state.pendingCalendarEvents.filter((event) => String(event?.id || '') !== needle);
        changed = changed || before !== state.pendingCalendarEvents.length;
    }
    if (Array.isArray(state.calendarCache)) {
        const before = state.calendarCache.length;
        state.calendarCache = state.calendarCache.filter((event) => String(event?.id || '') !== needle);
        changed = changed || before !== state.calendarCache.length;
    }
    return changed;
}

function removeYouTubeSaveFromPlaylist(state = {}, action = {}) {
    const playlistName = cleanText(action?.new_state?.playlistName || action?.previous_state?.playlistName || action?.target_object || '');
    if (!playlistName) return false;
    const list = Array.isArray(state.videoPlaylists?.[playlistName]) ? [...state.videoPlaylists[playlistName]] : [];
    if (!list.length) return false;
    const target = action?.new_state || action?.previous_state || {};
    const targetId = cleanText(target.videoId || '');
    const targetUrl = cleanText(target.url || '');
    const targetTitle = cleanText(target.title || '');
    const nextList = list.filter((item) => {
        const sameId = targetId && String(item?.videoId || '') === targetId;
        const sameUrl = targetUrl && String(item?.url || '') === targetUrl;
        const sameTitle = targetTitle && String(item?.title || '') === targetTitle;
        return !(sameId || sameUrl || sameTitle);
    });
    if (nextList.length === list.length) return false;
    state.videoPlaylists = {
        ...(state.videoPlaylists || {}),
        [playlistName]: nextList
    };
    return true;
}

function restoreGmailDraftFromAction(state = {}, action = {}) {
    const draft = action.previous_state && typeof action.previous_state === 'object'
        ? { ...action.previous_state }
        : action.new_state && typeof action.new_state === 'object'
            ? { ...action.new_state }
            : null;
    if (!draft) return false;
    state.gmailComposeDraft = {
        to: String(draft.to || '').trim(),
        recipientQuery: String(draft.recipientQuery || '').trim(),
        subject: String(draft.subject || '').trim(),
        text: String(draft.text || '').trim(),
        attachments: Array.isArray(draft.attachments) ? [...draft.attachments] : []
    };
    state.pendingEmailReview = {
        stage: inferEmailDraftStage(state.gmailComposeDraft),
        source: 'undo'
    };
    return true;
}

function restoreTelegramDraftFromAction(state = {}, action = {}) {
    const draft = action.previous_state && typeof action.previous_state === 'object'
        ? { ...action.previous_state }
        : action.new_state && typeof action.new_state === 'object'
            ? { ...action.new_state }
            : null;
    if (!draft) return false;
    state.telegramDraft = {
        chatId: String(draft.chatId || '').trim(),
        text: String(draft.text || draft.caption || '').trim()
    };
    state.pendingTelegramReview = Boolean(state.telegramDraft.chatId || state.telegramDraft.text);
    return true;
}

function restoreCalendarDraftFromAction(state = {}, action = {}) {
    const draft = action.previous_state && typeof action.previous_state === 'object'
        ? { ...action.previous_state }
        : action.new_state && typeof action.new_state === 'object'
            ? { ...action.new_state }
            : null;
    if (!draft) return false;
    if (draft.title || draft.summary) {
        state.pendingCalendarDraft = {
            title: String(draft.title || draft.summary || '').trim(),
            start: String(draft.start || '').trim(),
            end: String(draft.end || '').trim(),
            description: String(draft.description || '').trim(),
            location: String(draft.location || '').trim(),
            reminderMinutes: Number(draft.reminderMinutes || 0) || 0
        };
        return true;
    }
    return false;
}

function applyConversationUndo(state = {}, action = {}) {
    const tool = cleanText(action.tool || '').toLowerCase();
    const type = cleanText(action.action_type || '').toLowerCase();

    if (tool === 'notes') {
        if (type === 'note_created') {
            const noteId = cleanText(action.target_object || '');
            removeNoteById(state, noteId);
            removeSharedObjectById(state, noteId);
            if (action.previous_state?.noteItem?.id) removeSharedObjectById(state, action.previous_state.noteItem.id);
            return { ok: true, message: 'I removed that note.' };
        }
        if (type === 'note_removed') {
            const note = action.previous_state?.noteItem || action.previous_state || null;
            if (restoreNoteItem(state, note)) {
                if (note?.id) {
                    const convo = ensureToolConversationState(state);
                    convo.sharedObjects.unshift({
                        id: String(note.id),
                        kind: 'note',
                        label: String(note.content || note.title || note.summary || ''),
                        value: note.content || note.text || note.summary || '',
                        tool: 'notes',
                        source: note.data?.source || 'notes-tool',
                        createdAt: nowIso(),
                        updatedAt: nowIso(),
                        payload: note
                    });
                }
                publishConversationObject(state, {
                    id: String(note.id || ''),
                    kind: 'note',
                    label: String(note.content || note.title || note.summary || ''),
                    value: note.content || note.text || note.summary || '',
                    tool: 'notes',
                    source: note.data?.source || 'notes-tool',
                    tags: Array.isArray(note.data?.tags) ? note.data.tags : [],
                    linkedIds: Array.isArray(note.data?.linkedIds) ? note.data.linkedIds : [],
                    undoable: true,
                    createdAt: String(note.timestamp || nowIso())
                }, { tool: 'notes', source: note.data?.source || 'notes-tool', undoable: true });
                return { ok: true, message: 'I restored that note.' };
            }
        }
        if (type === 'notes_cleared') {
            const notes = Array.isArray(action.previous_state?.notes) ? action.previous_state.notes : [];
            if (notes.length) {
                notes.slice().reverse().forEach((note) => restoreNoteItem(state, note));
                return { ok: true, message: 'I restored the notes.' };
            }
        }
    }

    if (tool === 'gmail') {
        if (type === 'draft_opened' || type === 'draft_updated' || type === 'email_sent') {
            if (restoreGmailDraftFromAction(state, action)) {
                const convo = ensureToolConversationState(state);
                convo.activeTool = 'gmail';
                convo.previousTool = convo.previousTool || '';
                convo.branches.gmail = normalizeBranch({
                    ...(convo.branches.gmail || {}),
                    currentTask: 'undo email draft',
                    currentIntent: {
                        family: 'gmail',
                        action: 'compose',
                        confidence: 0.8
                    },
                    activePanel: 'gmail',
                    draft: state.gmailComposeDraft,
                    note: 'Restored email draft.'
                }, 'gmail');
                if (type === 'email_sent') {
                    state.lastGmailSendResult = {
                        ok: false,
                        message: 'Last sent email was restored as a draft for correction.'
                    };
                    return { ok: true, message: 'That email already went out, but I restored the draft so you can send a correction.' };
                }
                return { ok: true, message: 'I restored the email draft.' };
            }
        }
    }

    if (tool === 'telegram') {
        if (type === 'telegram_sent' || type === 'telegram_photo_sent' || type === 'telegram_draft_updated' || type === 'telegram_draft_opened') {
            if (restoreTelegramDraftFromAction(state, action)) {
                const convo = ensureToolConversationState(state);
                convo.activeTool = 'telegram';
                convo.branches.telegram = normalizeBranch({
                    ...(convo.branches.telegram || {}),
                    currentTask: 'undo telegram draft',
                    currentIntent: {
                        family: 'telegram',
                        action: 'compose',
                        confidence: 0.8
                    },
                    activePanel: 'telegram',
                    draft: state.telegramDraft,
                    note: 'Restored Telegram draft.'
                }, 'telegram');
                if (type === 'telegram_sent' || type === 'telegram_photo_sent') {
                    return {
                        ok: true,
                        message: 'That message already went out, but I restored the draft so you can send a correction.'
                    };
                }
                return { ok: true, message: 'I restored the Telegram draft.' };
            }
        }
    }

    if (tool === 'calendar') {
        if (type === 'event_created' || type === 'event_queued' || type === 'event_requested') {
            const eventId = cleanText(action.target_object || action.new_state?.id || action.new_state?.eventId || '');
            if (removeCalendarArtifactsById(state, eventId)) {
                if (type !== 'event_requested') {
                    state.pendingCalendarDraft = null;
                }
                return { ok: true, message: 'I removed that calendar event.' };
            }
        }
    }

    if (tool === 'youtube') {
        if (type === 'video_saved') {
            if (removeYouTubeSaveFromPlaylist(state, action)) {
                return { ok: true, message: 'I removed that saved video.' };
            }
        }
        if (type === 'video_opened') {
            return { ok: true, message: 'I closed the video.' };
        }
    }

    if (tool === 'photos') {
        if (type === 'photo_edit') {
            const photoId = cleanText(action.target_object || action.previous_state?.id || '');
            const item = Array.isArray(state.mediaItems)
                ? state.mediaItems.find((entry) => String(entry?.id || '') === photoId)
                : null;
            if (item && action.previous_state) {
                item.url = action.previous_state.url || item.url;
                item.rotation = action.previous_state.rotation ?? item.rotation;
                item.lastEdit = action.previous_state.lastEdit || null;
                if (state.mediaBrightnessOverrides) delete state.mediaBrightnessOverrides[String(item.id)];
                return { ok: true, message: 'I restored the previous photo edit.' };
            }
        }
        if (type === 'photo_removed') {
            const removed = action.previous_state?.item || action.previous_state?.mediaItem || null;
            const index = Number(action.previous_state?.index);
            if (removed && Number.isFinite(index)) {
                if (!state.mediaItems) state.mediaItems = [];
                state.mediaItems.splice(Math.max(0, Math.min(state.mediaItems.length, index)), 0, removed);
                return { ok: true, message: 'I restored the removed photo.' };
            }
        }
    }

    if (tool === 'timer') {
        if (type === 'timer_created' || type === 'timer_cancelled' || type === 'timers_cleared') {
            const timers = Array.isArray(state.timers) ? [...state.timers] : [];
            if (type === 'timer_created') {
                const targetId = action.new_state?.id || action.target_object || null;
                if (targetId != null) {
                    const idx = timers.findIndex((timer) => String(timer?.id || '') === String(targetId));
                    if (idx >= 0) {
                        const [removedTimer] = timers.splice(idx, 1);
                        try { clearTimeout(removedTimer?.id); } catch (_) { }
                        state.timers = timers;
                        return { ok: true, message: 'I removed that timer.' };
                    }
                }
            }
            if (type === 'timer_cancelled') {
                const prev = action.previous_state && typeof action.previous_state === 'object' ? { ...action.previous_state } : null;
                if (prev?.id) {
                    const exists = timers.some((timer) => String(timer?.id || '') === String(prev.id));
                    if (!exists) {
                        timers.push(prev);
                        state.timers = timers;
                        return { ok: true, message: 'I restored that timer.' };
                    }
                }
            }
            if (type === 'timers_cleared') {
                const prevTimers = Array.isArray(action.previous_state?.timers) ? action.previous_state.timers.map((timer) => ({ ...timer })) : [];
                if (prevTimers.length) {
                    state.timers = prevTimers;
                    return { ok: true, message: 'I restored the timers.' };
                }
            }
        }
    }

    return { ok: false, message: 'Nothing undoable was found.' };
}

export function undoLastConversationAction(state = {}) {
    const convo = ensureToolConversationState(state);
    const index = convo.recentActions.findIndex((action) => normalizeUndoableAction(action));
    if (index < 0) {
        return { ok: false, message: 'Nothing to undo yet.' };
    }
    const action = convo.recentActions.splice(index, 1)[0];
    const result = applyConversationUndo(state, action);
    recordConversationAction(state, {
        tool: action.tool,
        action_type: 'undo',
        target_object: action.target_object,
        previous_state: action.new_state,
        new_state: action.previous_state,
        undo_strategy: 'performed',
        undo_window: 'session',
        user_visible_summary: result.message || `Undid ${action.user_visible_summary || action.action_type || 'action'}`
    });
    return result;
}

export function isGlobalUndoVoiceCommand(text = '') {
    const t = cleanText(text || '').toLowerCase();
    if (!t) return false;
    return /^(?:undo|undo that|undo this|take that back|scratch that|go back|revert that|cancel that|restore that|restore it|bring it back|bring that back|oops)(?:\s+please)?$/.test(t)
        || /\b(?:undo|revert|restore)\b/.test(t) && !/\b(?:draft|note|edit|change|delete|remove|last)\b/.test(t);
}

export function resolveConversationReference(state = {}, query = '') {
    const convo = ensureToolConversationState(state);
    const needle = cleanText(query).toLowerCase();
    if (!needle) return null;

    const candidates = [
        ...(convo.sharedObjects || []).map((item) => ({ ...item, _source: 'conversation' })),
        ...(Array.isArray(state.hubItems) ? state.hubItems.map((item) => ({ ...item, _source: 'hub' })) : [])
    ];

    let best = null;
    let bestScore = 0;
    for (const item of candidates) {
        const label = cleanText(item.label || item.title || item.name || item.content || item.summary || '');
        const payloadText = cleanText(typeof item.value === 'string' ? item.value : '');
        const haystack = `${label} ${payloadText} ${cleanText(item.tool || '')}`.toLowerCase();
        let score = 0;
        if (haystack === needle) score = 100;
        else if (haystack.includes(needle)) score = 75;
        else if (needle.includes(label.toLowerCase()) && label) score = 60;
        else if (needle.split(/\s+/).some((part) => part && haystack.includes(part))) score = 25;
        if (score > bestScore) {
            best = item;
            bestScore = score;
        }
    }

    return best;
}

export function getConversationSnapshot(state = {}) {
    const convo = ensureToolConversationState(state);
    return safeClone({
        activeTool: convo.activeTool,
        previousTool: convo.previousTool,
        currentIntent: convo.currentIntent,
        currentScreenStack: convo.currentScreenStack,
        referencedEntities: convo.referencedEntities,
        recentActions: convo.recentActions,
        sharedObjects: convo.sharedObjects,
        branches: convo.branches,
        lastUpdatedAt: convo.lastUpdatedAt
    });
}
