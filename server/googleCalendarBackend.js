#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';

const PORT = Number(process.env.GOOGLE_CALENDAR_BACKEND_PORT || 8787);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `http://127.0.0.1:${PORT}/api/google-calendar/auth/callback`;
const DATA_DIR = path.join(process.cwd(), '.blip-data');
const TOKEN_PATH = path.join(DATA_DIR, 'google-calendar-tokens.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const oauthStates = new Map();

function isConfigured() {
    return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

function getAllowedOrigin(request) {
    const origin = request.headers.origin || FRONTEND_ORIGIN;
    const allowed = new Set([FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173']);
    return allowed.has(origin) ? origin : FRONTEND_ORIGIN;
}

function sendJson(request, response, statusCode, payload) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': getAllowedOrigin(request),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    response.end(JSON.stringify(payload));
}

function sendHtml(response, statusCode, html) {
    response.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
}

async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readTokenStore() {
    try {
        const raw = await fs.readFile(TOKEN_PATH, 'utf8');
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

async function writeTokenStore(data) {
    await ensureDataDir();
    await fs.writeFile(TOKEN_PATH, JSON.stringify(data, null, 2), 'utf8');
}

async function clearTokenStore() {
    try {
        await fs.unlink(TOKEN_PATH);
    } catch (_) {
        // Ignore missing file.
    }
}

async function collectJsonBody(request) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function exchangeCodeForToken(code) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        })
    });

    if (!response.ok) {
        const data = await response.text();
        throw new Error(`OAuth token exchange failed: ${data}`);
    }

    return response.json();
}

async function refreshAccessToken(refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        })
    });

    if (!response.ok) {
        const data = await response.text();
        throw new Error(`OAuth token refresh failed: ${data}`);
    }

    return response.json();
}

async function getValidTokenStore() {
    const store = await readTokenStore();
    if (!store?.refresh_token && !store?.access_token) return null;

    const now = Date.now();
    if (store.access_token && Number(store.expires_at || 0) > now + 60_000) {
        return store;
    }
    if (!store.refresh_token) return null;

    const refreshed = await refreshAccessToken(store.refresh_token);
    const nextStore = {
        ...store,
        access_token: refreshed.access_token,
        expires_at: Date.now() + (Number(refreshed.expires_in || 0) * 1000),
        scope: refreshed.scope || store.scope || SCOPES.join(' ')
    };
    await writeTokenStore(nextStore);
    return nextStore;
}

async function fetchGoogleCalendar(pathname, options = {}) {
    const store = await getValidTokenStore();
    if (!store?.access_token) {
        const error = new Error('Google Calendar is not connected.');
        error.statusCode = 401;
        throw error;
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3${pathname}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${store.access_token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    if (response.status === 401 || response.status === 403) {
        const error = new Error('Google Calendar token expired or unauthorized.');
        error.statusCode = response.status;
        throw error;
    }

    return response;
}

function oauthCallbackHtml(success, message) {
    const payload = JSON.stringify({
        type: 'blip-google-calendar-auth',
        success,
        message
    });
    return `<!doctype html>
<html>
<body style="font-family: sans-serif; background:#0f172a; color:#e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0;">
  <div style="max-width:320px; text-align:center;">
    <h2 style="margin:0 0 12px 0;">${success ? 'Google Calendar Connected' : 'Google Calendar Error'}</h2>
    <p style="opacity:0.85; line-height:1.5;">${message}</p>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage(${payload}, ${JSON.stringify(FRONTEND_ORIGIN)});
      }
    } catch (e) {}
    setTimeout(function () { window.close(); }, 300);
  </script>
</body>
</html>`;
}

function pruneOAuthStates() {
    const now = Date.now();
    for (const [key, createdAt] of oauthStates.entries()) {
        if (now - createdAt > OAUTH_STATE_TTL_MS) oauthStates.delete(key);
    }
}

const server = http.createServer(async (request, response) => {
    try {
        const url = new URL(request.url || '/', `http://${request.headers.host}`);

        if (request.method === 'OPTIONS') {
            response.writeHead(204, {
                'Access-Control-Allow-Origin': getAllowedOrigin(request),
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            });
            response.end();
            return;
        }

        if (url.pathname === '/api/google-calendar/status' && request.method === 'GET') {
            const store = await readTokenStore();
            sendJson(request, response, 200, {
                backendConfigured: isConfigured(),
                connected: Boolean(store?.refresh_token || store?.access_token)
            });
            return;
        }

        if (!isConfigured()) {
            sendJson(request, response, 500, {
                error: 'Backend Google Calendar is not configured. Set GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET, and GOOGLE_CALENDAR_REDIRECT_URI.'
            });
            return;
        }

        if (url.pathname === '/api/google-calendar/auth/start' && request.method === 'GET') {
            pruneOAuthStates();
            const state = crypto.randomBytes(24).toString('hex');
            oauthStates.set(state, Date.now());
            const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            authUrl.searchParams.set('client_id', CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('scope', SCOPES.join(' '));
            authUrl.searchParams.set('access_type', 'offline');
            authUrl.searchParams.set('prompt', 'consent');
            authUrl.searchParams.set('include_granted_scopes', 'true');
            authUrl.searchParams.set('state', state);
            response.writeHead(302, { Location: authUrl.toString() });
            response.end();
            return;
        }

        if (url.pathname === '/api/google-calendar/auth/callback' && request.method === 'GET') {
            const state = url.searchParams.get('state') || '';
            const code = url.searchParams.get('code') || '';
            const error = url.searchParams.get('error') || '';
            const knownState = oauthStates.has(state);
            oauthStates.delete(state);

            if (!knownState || error) {
                sendHtml(response, 400, oauthCallbackHtml(false, error || 'Invalid OAuth state.'));
                return;
            }

            const token = await exchangeCodeForToken(code);
            const previous = await readTokenStore();
            const store = {
                access_token: token.access_token,
                refresh_token: token.refresh_token || previous?.refresh_token || '',
                expires_at: Date.now() + (Number(token.expires_in || 0) * 1000),
                scope: token.scope || SCOPES.join(' ')
            };
            await writeTokenStore(store);
            sendHtml(response, 200, oauthCallbackHtml(true, 'You can return to Blip now.'));
            return;
        }

        if (url.pathname === '/api/google-calendar/events' && request.method === 'GET') {
            const params = new URLSearchParams({
                singleEvents: 'true',
                orderBy: 'startTime',
                maxResults: String(Math.max(1, Math.min(250, Number(url.searchParams.get('maxResults')) || 8))),
                timeMin: url.searchParams.get('timeMin') || new Date().toISOString()
            });
            if (url.searchParams.get('timeMax')) params.set('timeMax', url.searchParams.get('timeMax'));

            const googleResponse = await fetchGoogleCalendar(`/calendars/primary/events?${params.toString()}`);
            const data = await googleResponse.json();
            sendJson(request, response, 200, data);
            return;
        }

        if (url.pathname === '/api/google-calendar/events' && request.method === 'POST') {
            const body = await collectJsonBody(request);
            const reminderMinutes = Math.max(0, Number(body.reminderMinutes || 0) || 0);
            const payload = {
                summary: body.summary || 'Event',
                description: body.description || '',
                start: { dateTime: body.start },
                end: { dateTime: body.end }
            };
            if (reminderMinutes > 0) {
                payload.reminders = {
                    useDefault: false,
                    overrides: [{ method: 'popup', minutes: reminderMinutes }]
                };
            }
            const googleResponse = await fetchGoogleCalendar('/calendars/primary/events', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const data = await googleResponse.json();
            sendJson(request, response, 200, data);
            return;
        }

        const eventMatch = url.pathname.match(/^\/api\/google-calendar\/events\/([^/]+)$/);
        if (eventMatch && request.method === 'PATCH') {
            const eventId = decodeURIComponent(eventMatch[1]);
            const body = await collectJsonBody(request);
            const reminderMinutes = Math.max(0, Number(body.reminderMinutes || 0) || 0);
            const payload = {
                summary: body.summary || 'Event',
                description: body.description || '',
                start: { dateTime: body.start },
                end: { dateTime: body.end }
            };
            if (reminderMinutes > 0) {
                payload.reminders = {
                    useDefault: false,
                    overrides: [{ method: 'popup', minutes: reminderMinutes }]
                };
            }
            const googleResponse = await fetchGoogleCalendar(`/calendars/primary/events/${encodeURIComponent(eventId)}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
            const data = await googleResponse.json();
            sendJson(request, response, 200, data);
            return;
        }

        if (eventMatch && request.method === 'DELETE') {
            const eventId = decodeURIComponent(eventMatch[1]);
            const googleResponse = await fetchGoogleCalendar(`/calendars/primary/events/${encodeURIComponent(eventId)}`, {
                method: 'DELETE'
            });
            if (googleResponse.status !== 204 && !googleResponse.ok) {
                const data = await googleResponse.text();
                throw new Error(data || 'Could not delete Google Calendar event.');
            }
            sendJson(request, response, 200, { ok: true });
            return;
        }

        if (url.pathname === '/api/google-calendar/disconnect' && request.method === 'POST') {
            const store = await readTokenStore();
            if (store?.refresh_token || store?.access_token) {
                const token = store.refresh_token || store.access_token;
                try {
                    await fetch('https://oauth2.googleapis.com/revoke', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ token })
                    });
                } catch (_) {
                    // Ignore revoke errors and clear local state anyway.
                }
            }
            await clearTokenStore();
            sendJson(request, response, 200, { ok: true });
            return;
        }

        sendJson(request, response, 404, { error: 'Not found.' });
    } catch (error) {
        const statusCode = Number(error?.statusCode) || 500;
        sendJson(request, response, statusCode, { error: error?.message || 'Server error.' });
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Google Calendar backend listening on http://127.0.0.1:${PORT}`);
    console.log(`Frontend origin: ${FRONTEND_ORIGIN}`);
    console.log(`Configured: ${isConfigured() ? 'yes' : 'no'}`);
});
