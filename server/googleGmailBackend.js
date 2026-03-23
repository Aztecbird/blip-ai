#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';

const PORT = Number(process.env.GOOGLE_GMAIL_BACKEND_PORT || 8788);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = [
    FRONTEND_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...String(process.env.BLIP_ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
].map((value) => value.replace(/\/$/, ''));
const CLIENT_ID = process.env.GOOGLE_GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_GMAIL_REDIRECT_URI || `http://127.0.0.1:${PORT}/api/gmail/auth/callback`;
const DATA_DIR = path.join(process.cwd(), '.blip-data');
const TOKEN_PATH = path.join(DATA_DIR, 'google-gmail-tokens.json');
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
];
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const oauthStates = new Map();

function isConfigured() {
    return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

function getAllowedOrigin(request) {
    const origin = String(request.headers.origin || FRONTEND_ORIGIN).replace(/\/$/, '');
    const allowed = new Set(ALLOWED_ORIGINS);
    return allowed.has(origin) ? origin : FRONTEND_ORIGIN.replace(/\/$/, '');
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

function base64UrlEncode(value = '') {
    return Buffer.from(String(value), 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function decodeBodyData(value = '') {
    if (!value) return '';
    try {
        return Buffer.from(
            String(value).replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
        ).toString('utf8');
    } catch (_) {
        return '';
    }
}

function extractHeader(headers = [], name = '') {
    const target = String(name || '').toLowerCase();
    const match = Array.isArray(headers)
        ? headers.find((header) => String(header?.name || '').toLowerCase() === target)
        : null;
    return String(match?.value || '');
}

function foldBase64(value = '') {
    return String(value || '').replace(/.{1,76}/g, '$&\r\n').trim();
}

function sanitizeAttachmentFilename(value = '') {
    return String(value || 'attachment')
        .replace(/[\r\n"]/g, ' ')
        .replace(/[^\w.\- ]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim() || 'attachment';
}

function buildRawEmail({ from = '', to = '', cc = '', bcc = '', subject = '', text = '', html = '', attachments = [] } = {}) {
    const sender = String(from || '').trim();
    const senderDomain = sender.includes('@') ? sender.split('@').pop() : 'blip.local';
    const messageId = `<blip-${crypto.randomUUID()}@${senderDomain}>`;
    const dateHeader = new Date().toUTCString();
    const lines = [
        sender ? `From: ${sender}` : '',
        'MIME-Version: 1.0',
        `Date: ${dateHeader}`,
        `Message-ID: ${messageId}`,
        `To: ${String(to || '').trim()}`,
        cc ? `Cc: ${String(cc).trim()}` : '',
        bcc ? `Bcc: ${String(bcc).trim()}` : '',
        `Subject: ${String(subject || '').trim() || 'Blip message'}`,
        'User-Agent: Blip AI Mailer'
    ].filter(Boolean);

    const safeAttachments = Array.isArray(attachments)
        ? attachments.filter((item) => item && item.contentBase64)
        : [];

    const buildBodyPart = () => {
        if (html && text) {
            const boundary = `blip-alt-${crypto.randomBytes(8).toString('hex')}`;
            return `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${text}\r\n--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${html}\r\n--${boundary}--`;
        }
        const contentType = html ? 'text/html' : 'text/plain';
        return `Content-Type: ${contentType}; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${html || text}`;
    }

    if (!safeAttachments.length) {
        return `${lines.join('\r\n')}\r\n${buildBodyPart()}`;
    }

    const mixedBoundary = `blip-mixed-${crypto.randomBytes(8).toString('hex')}`;
    const attachmentParts = safeAttachments.map((item) => {
        const filename = sanitizeAttachmentFilename(item.filename || 'attachment');
        const mimeType = String(item.mimeType || 'application/octet-stream').trim() || 'application/octet-stream';
        const contentBase64 = foldBase64(item.contentBase64 || '');
        return `--${mixedBoundary}\r\nContent-Type: ${mimeType}; name="${filename}"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${filename}"\r\n\r\n${contentBase64}\r\n`;
    }).join('');

    return `${lines.join('\r\n')}\r\nContent-Type: multipart/mixed; boundary="${mixedBoundary}"\r\n\r\n--${mixedBoundary}\r\n${buildBodyPart()}\r\n${attachmentParts}--${mixedBoundary}--`;
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
        throw new Error(`OAuth token exchange failed: ${await response.text()}`);
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
        throw new Error(`OAuth token refresh failed: ${await response.text()}`);
    }

    return response.json();
}

function isRevokedOAuthTokenError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('invalid_grant')
        || message.includes('expired or revoked')
        || message.includes('token expired or unauthorized');
}

async function getValidTokenStore() {
    const store = await readTokenStore();
    if (!store?.refresh_token && !store?.access_token) return null;

    if (store.access_token && Number(store.expires_at || 0) > Date.now() + 60_000) {
        return store;
    }
    if (!store.refresh_token) return null;

    let refreshed;
    try {
        refreshed = await refreshAccessToken(store.refresh_token);
    } catch (error) {
        if (isRevokedOAuthTokenError(error)) {
            await clearTokenStore();
            return null;
        }
        throw error;
    }
    const nextStore = {
        ...store,
        access_token: refreshed.access_token,
        expires_at: Date.now() + (Number(refreshed.expires_in || 0) * 1000),
        scope: refreshed.scope || store.scope || SCOPES.join(' ')
    };
    await writeTokenStore(nextStore);
    return nextStore;
}

async function getGmailConnectionStatus() {
    if (!isConfigured()) {
        return { connected: false, email: '' };
    }
    try {
        const store = await getValidTokenStore();
        const connected = Boolean(store?.access_token);
        if (!connected) {
            return { connected: false, email: '' };
        }
        const email = await resolveStoredGmailEmail();
        return {
            connected: true,
            email: email || ''
        };
    } catch (error) {
        console.error('Google Gmail status check failed:', error);
        return { connected: false, email: '' };
    }
}

async function fetchGmail(pathname, options = {}) {
    const store = await getValidTokenStore();
    if (!store?.access_token) {
        const error = new Error('Google Gmail is not connected.');
        error.statusCode = 401;
        throw error;
    }

    const response = await fetch(`https://gmail.googleapis.com/gmail/v1${pathname}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${store.access_token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    if (response.status === 401 || response.status === 403) {
        const error = new Error('Google Gmail token expired or unauthorized.');
        error.statusCode = response.status;
        throw error;
    }

    return response;
}

async function fetchGmailProfile() {
    const response = await fetchGmail('/users/me/profile');
    if (!response.ok) {
        throw new Error(`Could not load Gmail profile: ${await response.text()}`);
    }
    return response.json();
}

async function resolveStoredGmailEmail() {
    const store = await readTokenStore();
    const existingEmail = String(store?.email || '').trim();
    if (existingEmail) {
        return existingEmail;
    }

    if (!store?.refresh_token && !store?.access_token) {
        return '';
    }

    try {
        const profile = await fetchGmailProfile();
        const email = String(profile?.emailAddress || '').trim();
        if (email) {
            await writeTokenStore({ ...(store || {}), email });
        }
        return email;
    } catch (_) {
        return '';
    }
}

async function fetchMessageDetail(messageId, format = 'full') {
    const response = await fetchGmail(`/users/me/messages/${encodeURIComponent(messageId)}?format=${encodeURIComponent(format)}`);
    if (!response.ok) {
        throw new Error(`Could not load Gmail message: ${await response.text()}`);
    }
    return response.json();
}

function summarizeMessage(message = {}) {
    const headers = Array.isArray(message?.payload?.headers) ? message.payload.headers : [];
    const bodyData = decodeBodyData(message?.payload?.body?.data || '');
    const snippet = String(message?.snippet || bodyData || '').trim();
    return {
        id: message.id,
        threadId: message.threadId,
        labelIds: Array.isArray(message.labelIds) ? message.labelIds : [],
        snippet,
        historyId: message.historyId || '',
        internalDate: message.internalDate || '',
        from: extractHeader(headers, 'From'),
        to: extractHeader(headers, 'To'),
        subject: extractHeader(headers, 'Subject'),
        date: extractHeader(headers, 'Date')
    };
}

function oauthCallbackHtml(success, message) {
    const payload = JSON.stringify({
        type: 'blip-google-gmail-auth',
        success,
        message
    });
    return `<!doctype html>
<html>
<body style="font-family: sans-serif; background:#0f172a; color:#e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0;">
  <div style="max-width:340px; text-align:center;">
    <h2 style="margin:0 0 12px 0;">${success ? 'Google Gmail Connected' : 'Google Gmail Error'}</h2>
    <p style="opacity:0.85; line-height:1.5;">${message}</p>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage(${payload}, ${JSON.stringify(FRONTEND_ORIGIN.replace(/\/$/, ''))});
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

        if (url.pathname === '/api/gmail/status' && request.method === 'GET') {
            const status = await getGmailConnectionStatus();
            sendJson(request, response, 200, {
                backendConfigured: isConfigured(),
                connected: status.connected,
                email: status.email
            });
            return;
        }

        if (!isConfigured()) {
            sendJson(request, response, 500, {
                error: 'Backend Gmail is not configured. Set GOOGLE_GMAIL_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET, and GOOGLE_GMAIL_REDIRECT_URI.'
            });
            return;
        }

        if (url.pathname === '/api/gmail/auth/start' && request.method === 'GET') {
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
            authUrl.searchParams.set('state', state);
            response.writeHead(302, { Location: authUrl.toString() });
            response.end();
            return;
        }

        if (url.pathname === '/api/gmail/auth/callback' && request.method === 'GET') {
            const code = url.searchParams.get('code') || '';
            const state = url.searchParams.get('state') || '';
            const error = url.searchParams.get('error') || '';
            const knownState = oauthStates.has(state);
            oauthStates.delete(state);

            if (!code || !state || !knownState) {
                sendHtml(response, 400, oauthCallbackHtml(false, error || 'Invalid OAuth state.'));
                return;
            }

            const tokenData = await exchangeCodeForToken(code);
            const nextStore = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: Date.now() + (Number(tokenData.expires_in || 0) * 1000),
                scope: tokenData.scope || SCOPES.join(' ')
            };
            await writeTokenStore(nextStore);
            const profile = await fetchGmailProfile().catch(() => null);
            if (profile?.emailAddress) {
                nextStore.email = profile.emailAddress;
                await writeTokenStore(nextStore);
            }
            sendHtml(response, 200, oauthCallbackHtml(true, 'You can return to Blip now.'));
            return;
        }

        if (url.pathname === '/api/gmail/disconnect' && request.method === 'POST') {
            const store = await readTokenStore();
            const tokenToRevoke = store?.refresh_token || store?.access_token || '';
            if (tokenToRevoke) {
                await fetch('https://oauth2.googleapis.com/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ token: tokenToRevoke })
                }).catch(() => null);
            }
            await clearTokenStore();
            sendJson(request, response, 200, { ok: true });
            return;
        }

        if (url.pathname === '/api/gmail/profile' && request.method === 'GET') {
            const profile = await fetchGmailProfile();
            const store = await readTokenStore();
            const nextStore = { ...(store || {}), email: profile.emailAddress || '' };
            await writeTokenStore(nextStore);
            sendJson(request, response, 200, {
                ok: true,
                email: profile.emailAddress || '',
                messagesTotal: Number(profile.messagesTotal || 0),
                threadsTotal: Number(profile.threadsTotal || 0),
                historyId: String(profile.historyId || '')
            });
            return;
        }

        if (url.pathname === '/api/gmail/messages' && request.method === 'GET') {
            const maxResults = Math.max(1, Math.min(50, Number(url.searchParams.get('maxResults') || 20)));
            const q = String(url.searchParams.get('q') || '').trim();
            const labelIds = url.searchParams.getAll('labelIds').filter(Boolean);
            const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
            listUrl.searchParams.set('maxResults', String(maxResults));
            if (q) listUrl.searchParams.set('q', q);
            labelIds.forEach((labelId) => listUrl.searchParams.append('labelIds', labelId));

            const store = await getValidTokenStore();
            if (!store?.access_token) {
                sendJson(request, response, 401, { ok: false, message: 'Google Gmail is not connected.' });
                return;
            }

            const listResponse = await fetch(listUrl, {
                headers: { Authorization: `Bearer ${store.access_token}` }
            });
            if (!listResponse.ok) {
                sendJson(request, response, listResponse.status, {
                    ok: false,
                    message: `Could not load Gmail messages: ${await listResponse.text()}`
                });
                return;
            }
            const listData = await listResponse.json();
            const rawMessages = Array.isArray(listData.messages) ? listData.messages : [];
            const details = await Promise.all(
                rawMessages.map((item) => fetchMessageDetail(item.id, 'metadata').catch(() => null))
            );
            sendJson(request, response, 200, {
                ok: true,
                messages: details.filter(Boolean).map(summarizeMessage),
                nextPageToken: String(listData.nextPageToken || '')
            });
            return;
        }

        if (url.pathname.startsWith('/api/gmail/messages/') && request.method === 'GET') {
            const messageId = decodeURIComponent(url.pathname.replace('/api/gmail/messages/', ''));
            const message = await fetchMessageDetail(messageId, 'full');
            sendJson(request, response, 200, {
                ok: true,
                message: {
                    ...summarizeMessage(message),
                    bodyText: decodeBodyData(message?.payload?.body?.data || ''),
                    payload: message?.payload || null
                }
            });
            return;
        }

        if (url.pathname === '/api/gmail/send' && request.method === 'POST') {
            const body = await collectJsonBody(request);
            const to = String(body?.to || '').trim();
            const subject = String(body?.subject || '').trim();
            const text = String(body?.text || '').trim();
            const html = String(body?.html || '').trim();
            const attachments = Array.isArray(body?.attachments)
                ? body.attachments.map((item) => ({
                    filename: sanitizeAttachmentFilename(item?.filename || 'attachment'),
                    mimeType: String(item?.mimeType || 'application/octet-stream').trim() || 'application/octet-stream',
                    contentBase64: String(item?.contentBase64 || '').replace(/\s+/g, '')
                })).filter((item) => item.contentBase64)
                : [];
            if (!to || (!text && !html)) {
                sendJson(request, response, 400, {
                    ok: false,
                    message: 'Need at least `to` and `text` or `html`.'
                });
                return;
            }

            const raw = buildRawEmail({
                from: await resolveStoredGmailEmail(),
                to,
                cc: body?.cc || '',
                bcc: body?.bcc || '',
                subject,
                text,
                html,
                attachments
            });

            const gmailResponse = await fetchGmail('/users/me/messages/send', {
                method: 'POST',
                body: JSON.stringify({ raw: base64UrlEncode(raw) })
            });

            if (!gmailResponse.ok) {
                sendJson(request, response, gmailResponse.status, {
                    ok: false,
                    message: `Could not send Gmail message: ${await gmailResponse.text()}`
                });
                return;
            }

            const sent = await gmailResponse.json();
            sendJson(request, response, 200, {
                ok: true,
                id: sent.id,
                threadId: sent.threadId,
                labelIds: sent.labelIds || []
            });
            return;
        }

        sendJson(request, response, 404, { error: 'Not found.' });
    } catch (error) {
        console.error('Google Gmail backend error:', error);
        sendJson(request, response, error?.statusCode || 500, {
            error: error?.message || 'Google Gmail backend error.'
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Google Gmail backend listening on http://127.0.0.1:${PORT}`);
    console.log(`Allowed frontend origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
