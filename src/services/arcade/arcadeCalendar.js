import { executeTool, getAuthUrl } from './arcadeService.js';
import { isArcadeConfigured } from './authMapping.js';

const DEFAULT_ARCADE_USER = 'default-user';

function normalizeArcadeEvent(raw = {}) {
    const start = raw?.start?.dateTime || raw?.start?.date || raw?.start || '';
    const end = raw?.end?.dateTime || raw?.end?.date || raw?.end || '';
    return {
        id: String(raw.id || raw.eventId || raw.event_id || raw.uid || raw.summary || raw.title || ''),
        summary: String(raw.summary || raw.title || raw.name || 'Event'),
        description: String(raw.description || ''),
        start: String(start || ''),
        end: String(end || ''),
        htmlLink: String(raw.htmlLink || raw.html_url || raw.link || raw.url || ''),
        source: 'arcade'
    };
}

function extractArcadeEvents(output) {
    if (!output) return [];
    if (Array.isArray(output)) return output;
    if (Array.isArray(output.items)) return output.items;
    if (Array.isArray(output.events)) return output.events;
    if (Array.isArray(output.data?.items)) return output.data.items;
    if (Array.isArray(output.data?.events)) return output.data.events;
    return [];
}

export async function getArcadeCalendarAuthLink() {
    if (!isArcadeConfigured()) return '';
    const response = await getAuthUrl(DEFAULT_ARCADE_USER, 'google');
    return String(response || '');
}

export async function listArcadeCalendarEvents(options = {}) {
    if (!isArcadeConfigured()) {
        return { ok: false, error: 'Arcade not configured.' };
    }
    const input = {
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        maxResults: Math.max(1, Math.min(250, Number(options.maxResults) || 8)),
        singleEvents: true,
        orderBy: 'startTime'
    };
    const result = await executeTool(DEFAULT_ARCADE_USER, 'GoogleCalendar.ListEvents', input);
    if (result?.requires_auth) {
        return { ok: false, requiresAuth: true, authUrl: result.auth_url };
    }
    if (!result?.success) {
        return { ok: false, error: result?.error || 'Arcade calendar list failed.' };
    }
    const events = extractArcadeEvents(result.data).map(normalizeArcadeEvent).filter((event) => event.id);
    return { ok: true, events, raw: result.data };
}

export async function createArcadeCalendarEvent(details = {}) {
    if (!isArcadeConfigured()) {
        return { ok: false, error: 'Arcade not configured.' };
    }
    const input = {
        summary: details.title || details.summary || 'Event',
        description: details.description || '',
        start: details.start,
        end: details.end
    };
    const result = await executeTool(DEFAULT_ARCADE_USER, 'GoogleCalendar.CreateEvent', input);
    if (result?.requires_auth) {
        return { ok: false, requiresAuth: true, authUrl: result.auth_url };
    }
    if (!result?.success) {
        return { ok: false, error: result?.error || 'Arcade calendar create failed.' };
    }
    const rawEvent = result.data?.event || result.data?.item || result.data;
    const event = normalizeArcadeEvent(rawEvent || {});
    return { ok: true, event, raw: result.data };
}

export async function updateArcadeCalendarEvent(eventId, details = {}) {
    if (!isArcadeConfigured()) {
        return { ok: false, error: 'Arcade not configured.' };
    }
    const input = {
        eventId: eventId,
        id: eventId,
        summary: details.title || details.summary || 'Event',
        description: details.description || '',
        start: details.start,
        end: details.end
    };
    const result = await executeTool(DEFAULT_ARCADE_USER, 'GoogleCalendar.UpdateEvent', input);
    if (result?.requires_auth) {
        return { ok: false, requiresAuth: true, authUrl: result.auth_url };
    }
    if (!result?.success) {
        return { ok: false, error: result?.error || 'Arcade calendar update failed.' };
    }
    const rawEvent = result.data?.event || result.data?.item || result.data;
    const event = normalizeArcadeEvent(rawEvent || {});
    return { ok: true, event, raw: result.data };
}

export async function deleteArcadeCalendarEvent(eventId) {
    if (!isArcadeConfigured()) {
        return { ok: false, error: 'Arcade not configured.' };
    }
    const input = { eventId: eventId, id: eventId };
    const result = await executeTool(DEFAULT_ARCADE_USER, 'GoogleCalendar.DeleteEvent', input);
    if (result?.requires_auth) {
        return { ok: false, requiresAuth: true, authUrl: result.auth_url };
    }
    if (!result?.success) {
        return { ok: false, error: result?.error || 'Arcade calendar delete failed.' };
    }
    return { ok: true, raw: result.data };
}
