const GOOGLE_IDENTITY_SRC = 'https://accounts.google.com/gsi/client';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const BACKEND_BASE = (() => {
    try {
        const custom = window.localStorage?.getItem('blip_calendar_backend_url');
        return custom ? custom.replace(/\/$/, '') : '/api/google-calendar';
    } catch (_) {
        return '/api/google-calendar';
    }
})();

let googleIdentityPromise = null;
let tokenClient = null;
let configuredClientId = '';
let tokenClientId = '';
let accessToken = '';
let accessTokenExpiresAt = 0;
<<<<<<< HEAD
let authStateListener = () => {};
=======
const authStateListeners = new Set();
>>>>>>> ui-update-final
let pendingAuth = null;
let backendConfigured = false;
let backendConnected = false;
let activeMode = 'none'; // 'backend' | 'browser' | 'none'

function emitAuthState() {
<<<<<<< HEAD
    authStateListener(getGoogleCalendarAuthState());
=======
    const state = getGoogleCalendarAuthState();
    authStateListeners.forEach(listener => {
        try { listener(state); } catch (e) { console.error('Calendar auth listener error:', e); }
    });
>>>>>>> ui-update-final
}

function clearBrowserAccessToken() {
    accessToken = '';
    accessTokenExpiresAt = 0;
    if (activeMode === 'browser') activeMode = 'none';
}

function hasValidBrowserAccessToken() {
    return Boolean(accessToken) && Date.now() < accessTokenExpiresAt;
}

async function fetchBackend(path = '', options = {}) {
    return fetch(`${BACKEND_BASE}${path}`, options);
}

async function refreshBackendStatus() {
    try {
        const response = await fetchBackend('/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('Backend status unavailable.');
        const data = await response.json();
        backendConfigured = Boolean(data?.backendConfigured);
        backendConnected = Boolean(data?.connected);
        if (backendConnected) activeMode = 'backend';
        else if (activeMode === 'backend') activeMode = 'none';
        emitAuthState();
        return data;
    } catch (_) {
        backendConfigured = false;
        backendConnected = false;
        if (activeMode === 'backend') activeMode = 'none';
        emitAuthState();
        return null;
    }
}

function ensureGoogleIdentityScript() {
    if (window.google?.accounts?.oauth2) {
        return Promise.resolve(window.google);
    }
    if (googleIdentityPromise) return googleIdentityPromise;

    googleIdentityPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${GOOGLE_IDENTITY_SRC}"]`);
        const script = existing || document.createElement('script');

        const handleLoad = () => {
            if (window.google?.accounts?.oauth2) {
                resolve(window.google);
                return;
            }
            reject(new Error('Google Identity Services loaded, but OAuth is unavailable.'));
        };

        const handleError = () => {
            googleIdentityPromise = null;
            reject(new Error('Could not load Google Identity Services.'));
        };

        script.addEventListener('load', handleLoad, { once: true });
        script.addEventListener('error', handleError, { once: true });

        if (!existing) {
            script.src = GOOGLE_IDENTITY_SRC;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    });

    return googleIdentityPromise;
}

function initTokenClient() {
    if (!configuredClientId) {
        throw new Error('Missing Google Calendar Client ID.');
    }

    tokenClientId = configuredClientId;
    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: configuredClientId,
        scope: CALENDAR_SCOPE,
        callback: (response) => {
            const pending = pendingAuth;
            pendingAuth = null;

            if (!response || response.error) {
                const error = new Error(response?.error || 'Google Calendar sign-in failed.');
                emitAuthState();
                pending?.reject?.(error);
                return;
            }

            accessToken = response.access_token || '';
            const expiresIn = Math.max(0, Number(response.expires_in) || 0);
            accessTokenExpiresAt = Date.now() + Math.max(0, expiresIn - 30) * 1000;
            activeMode = 'browser';
            emitAuthState();
            pending?.resolve?.(getGoogleCalendarAuthState());
        },
        error_callback: (error) => {
            const pending = pendingAuth;
            pendingAuth = null;
            emitAuthState();
            pending?.reject?.(new Error(error?.type || 'Google Calendar popup failed.'));
        }
    });
}

function normalizeEventDateTime(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('Invalid calendar date/time.');
    }
    return parsed.toISOString();
}

function getBackendOrigin() {
    try {
        return new URL(BACKEND_BASE, window.location.origin).origin;
    } catch (_) {
        return window.location.origin;
    }
}

async function connectViaBackend() {
    const popup = window.open(
        `${BACKEND_BASE}/auth/start`,
        'blip-google-calendar-auth',
        'popup=yes,width=520,height=720,menubar=no,toolbar=no,status=no,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
        throw new Error('Popup blocked. Allow popups and press Connect Calendar again.');
    }

    return new Promise((resolve, reject) => {
        const backendOrigin = getBackendOrigin();
        let settled = false;

        const cleanup = () => {
            window.removeEventListener('message', onMessage);
            clearInterval(pollTimer);
        };

        const finish = async (success, errorMessage) => {
            if (settled) return;
            settled = true;
            cleanup();
            await refreshBackendStatus();
            if (success && backendConnected) {
                resolve(getGoogleCalendarAuthState());
                return;
            }
            reject(new Error(errorMessage || 'Google Calendar connection cancelled.'));
        };

        const onMessage = (event) => {
            if (event.origin !== backendOrigin) return;
            if (event.data?.type !== 'blip-google-calendar-auth') return;
            finish(Boolean(event.data?.success), event.data?.message);
        };

        const pollTimer = window.setInterval(() => {
            if (!popup || popup.closed) {
                finish(backendConnected, backendConnected ? '' : 'Google Calendar connection cancelled.');
            }
        }, 500);

        window.addEventListener('message', onMessage);
    });
}

async function connectViaBrowserTokenModel() {
    if (!configuredClientId) {
        throw new Error('Add your Google Calendar Client ID first.');
    }

    await ensureGoogleIdentityScript();
    if (!tokenClient || tokenClientId !== configuredClientId) {
        initTokenClient();
    }

    return new Promise((resolve, reject) => {
        pendingAuth = { resolve, reject };
        tokenClient.requestAccessToken({ prompt: hasValidBrowserAccessToken() ? '' : 'consent' });
    });
}

function calendarAuthError(message = 'Google Calendar is not connected.') {
    const error = new Error(message);
    error.code = 'calendar_auth_required';
    return error;
}

export async function initGoogleCalendar() {
    await refreshBackendStatus();
    return getGoogleCalendarAuthState();
}

export function setGoogleCalendarClientId(clientId) {
    const normalized = String(clientId || '').trim();
    if (normalized === configuredClientId) return;
    configuredClientId = normalized;
    tokenClient = null;
    tokenClientId = '';
    clearBrowserAccessToken();
    emitAuthState();
}

export function onGoogleCalendarAuthStateChange(listener) {
<<<<<<< HEAD
    authStateListener = typeof listener === 'function' ? listener : () => {};
    emitAuthState();
=======
    if (typeof listener !== 'function') return () => {};
    authStateListeners.add(listener);
    listener(getGoogleCalendarAuthState());
    return () => authStateListeners.delete(listener);
>>>>>>> ui-update-final
}

export function getGoogleCalendarAuthState() {
    const browserConnected = hasValidBrowserAccessToken();
    const connected = backendConnected || browserConnected;
    return {
        hasClientId: Boolean(configuredClientId),
        connected,
        expiresAt: browserConnected ? accessTokenExpiresAt : 0,
        backendConfigured,
        mode: backendConnected ? 'backend' : (browserConnected ? 'browser' : 'none')
    };
}

export async function connectGoogleCalendar() {
    const backendStatus = await refreshBackendStatus();
    if (backendStatus?.backendConfigured) {
        return connectViaBackend();
    }
    return connectViaBrowserTokenModel();
}

export async function disconnectGoogleCalendar() {
    const backendStatus = await refreshBackendStatus();
    if (backendStatus?.backendConfigured) {
        await fetchBackend('/disconnect', { method: 'POST' });
        backendConnected = false;
        if (activeMode === 'backend') activeMode = 'none';
        emitAuthState();
        return;
    }

    const tokenToRevoke = accessToken;
    clearBrowserAccessToken();
    emitAuthState();

    if (!tokenToRevoke || !window.google?.accounts?.oauth2?.revoke) {
        return;
    }

    await new Promise((resolve) => {
        window.google.accounts.oauth2.revoke(tokenToRevoke, () => resolve());
    });
}

export async function createGoogleCalendarEvent(details) {
    const reminderMinutes = Math.max(0, Number(details.reminderMinutes || 0) || 0);
    const backendStatus = await refreshBackendStatus();
    if (backendStatus?.backendConfigured) {
        if (!backendConnected) throw calendarAuthError();
        const response = await fetchBackend('/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: details.title || details.summary || 'Event',
                description: details.description || '',
                start: normalizeEventDateTime(details.start),
                end: normalizeEventDateTime(details.end),
                reminderMinutes
            })
        });

        if (response.status === 401 || response.status === 403) {
            backendConnected = false;
            emitAuthState();
            throw calendarAuthError('Google Calendar session expired.');
        }
        if (!response.ok) {
            let message = 'Could not create the Google Calendar event.';
            try {
                const errorData = await response.json();
                message = errorData?.error || errorData?.message || message;
            } catch (_) {
                // Keep default message.
            }
            throw new Error(message);
        }
        return response.json();
    }

    if (!hasValidBrowserAccessToken()) {
        throw calendarAuthError();
    }

    const payload = {
        summary: details.title || details.summary || 'Event',
        description: details.description || '',
        start: { dateTime: normalizeEventDateTime(details.start) },
        end: { dateTime: normalizeEventDateTime(details.end) }
    };
    if (reminderMinutes > 0) {
        payload.reminders = {
            useDefault: false,
            overrides: [{ method: 'popup', minutes: reminderMinutes }]
        };
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (response.status === 401 || response.status === 403) {
        clearBrowserAccessToken();
        emitAuthState();
        throw calendarAuthError('Google Calendar session expired.');
    }
    if (!response.ok) {
        let message = 'Could not create the Google Calendar event.';
        try {
            const errorData = await response.json();
            message = errorData?.error?.message || message;
        } catch (_) {
            // Keep default message.
        }
        throw new Error(message);
    }
    return response.json();
}

export async function listGoogleCalendarEvents(options = {}) {
    const backendStatus = await refreshBackendStatus();
    if (backendStatus?.backendConfigured) {
        if (!backendConnected) throw calendarAuthError();
        const params = new URLSearchParams({
            maxResults: String(Math.max(1, Math.min(250, Number(options.maxResults) || 8))),
            timeMin: String(options.timeMin || new Date().toISOString())
        });
        if (options.timeMax) params.set('timeMax', String(options.timeMax));

        const response = await fetchBackend(`/events?${params.toString()}`);
        if (response.status === 401 || response.status === 403) {
            backendConnected = false;
            emitAuthState();
            throw calendarAuthError('Google Calendar session expired.');
        }
        if (!response.ok) {
            let message = 'Could not load Google Calendar events.';
            try {
                const errorData = await response.json();
                message = errorData?.error || errorData?.message || message;
            } catch (_) {
                // Keep default message.
            }
            throw new Error(message);
        }
        const data = await response.json();
        return Array.isArray(data?.items) ? data.items : [];
    }

    if (!hasValidBrowserAccessToken()) {
        throw calendarAuthError();
    }

    const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: String(Math.max(1, Math.min(250, Number(options.maxResults) || 8))),
        timeMin: String(options.timeMin || new Date().toISOString())
    });
    if (options.timeMax) params.set('timeMax', String(options.timeMax));

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (response.status === 401 || response.status === 403) {
        clearBrowserAccessToken();
        emitAuthState();
        throw calendarAuthError('Google Calendar session expired.');
    }
    if (!response.ok) {
        let message = 'Could not load Google Calendar events.';
        try {
            const errorData = await response.json();
            message = errorData?.error?.message || message;
        } catch (_) {
            // Keep default message.
        }
        throw new Error(message);
    }
    const data = await response.json();
    return Array.isArray(data?.items) ? data.items : [];
}

export async function updateGoogleCalendarEvent(eventId, details) {
    const normalizedId = String(eventId || '').trim();
    if (!normalizedId) throw new Error('Missing calendar event id.');

    const backendStatus = await refreshBackendStatus();
    if (backendStatus?.backendConfigured) {
        if (!backendConnected) throw calendarAuthError();
        const response = await fetchBackend(`/events/${encodeURIComponent(normalizedId)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: details.title || details.summary || 'Event',
                description: details.description || '',
                start: normalizeEventDateTime(details.start),
                end: normalizeEventDateTime(details.end)
            })
        });
        if (response.status === 401 || response.status === 403) {
            backendConnected = false;
            emitAuthState();
            throw calendarAuthError('Google Calendar session expired.');
        }
        if (!response.ok) {
            let message = 'Could not update the Google Calendar event.';
            try {
                const errorData = await response.json();
                message = errorData?.error || errorData?.message || message;
            } catch (_) {}
            throw new Error(message);
        }
        return response.json();
    }

    if (!hasValidBrowserAccessToken()) throw calendarAuthError();
    const payload = {
        summary: details.title || details.summary || 'Event',
        description: details.description || '',
        start: { dateTime: normalizeEventDateTime(details.start) },
        end: { dateTime: normalizeEventDateTime(details.end) }
    };
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(normalizedId)}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (response.status === 401 || response.status === 403) {
        clearBrowserAccessToken();
        emitAuthState();
        throw calendarAuthError('Google Calendar session expired.');
    }
    if (!response.ok) {
        let message = 'Could not update the Google Calendar event.';
        try {
            const errorData = await response.json();
            message = errorData?.error?.message || message;
        } catch (_) {}
        throw new Error(message);
    }
    return response.json();
}

export async function deleteGoogleCalendarEvent(eventId) {
    const normalizedId = String(eventId || '').trim();
    if (!normalizedId) throw new Error('Missing calendar event id.');

    const backendStatus = await refreshBackendStatus();
    if (backendStatus?.backendConfigured) {
        if (!backendConnected) throw calendarAuthError();
        const response = await fetchBackend(`/events/${encodeURIComponent(normalizedId)}`, {
            method: 'DELETE'
        });
        if (response.status === 401 || response.status === 403) {
            backendConnected = false;
            emitAuthState();
            throw calendarAuthError('Google Calendar session expired.');
        }
        if (!response.ok) {
            let message = 'Could not delete the Google Calendar event.';
            try {
                const errorData = await response.json();
                message = errorData?.error || errorData?.message || message;
            } catch (_) {}
            throw new Error(message);
        }
        return true;
    }

    if (!hasValidBrowserAccessToken()) throw calendarAuthError();
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(normalizedId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (response.status === 401 || response.status === 403) {
        clearBrowserAccessToken();
        emitAuthState();
        throw calendarAuthError('Google Calendar session expired.');
    }
    if (!response.ok) {
        let message = 'Could not delete the Google Calendar event.';
        try {
            const errorData = await response.json();
            message = errorData?.error?.message || message;
        } catch (_) {}
        throw new Error(message);
    }
    return true;
}
