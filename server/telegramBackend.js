#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.TELEGRAM_BACKEND_PORT || 8789);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
let BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
let DEFAULT_CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '').trim();
let CHAT_ALIASES = (() => {
    const aliases = parseTelegramChatAliases(process.env.TELEGRAM_CHAT_ALIASES || '');
    expandBlipJoyTelegramAliases(aliases);
    return aliases;
})();

function normalizeTelegramAlias(value = '') {
    return String(value || '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseTelegramChatAliases(rawValue = '') {
    const aliases = {};
    for (const entry of String(rawValue || '').split(',')) {
        const trimmedEntry = String(entry || '').trim();
        if (!trimmedEntry) continue;
        const separatorIndex = trimmedEntry.indexOf(':');
        if (separatorIndex <= 0) continue;
        const alias = normalizeTelegramAlias(trimmedEntry.slice(0, separatorIndex));
        const chatId = String(trimmedEntry.slice(separatorIndex + 1) || '').trim();
        if (!alias || !chatId) continue;
        aliases[alias] = chatId;
    }
    return aliases;
}

/** If you define alias `joy`, also accept spoken/display names like "Blip Joy". */
function expandBlipJoyTelegramAliases(aliases) {
    const joyId = aliases.joy;
    if (!joyId) return;
    for (const label of ['blip joy', 'blipjoy', 'blip-joy']) {
        const key = normalizeTelegramAlias(label);
        if (key && !aliases[key]) aliases[key] = joyId;
    }
}

function resolveTelegramChatId(value = '') {
    const rawValue = String(value || '').trim();
    const lower = rawValue.toLowerCase();
    
    // If empty or a self-reference, use default
    if (!rawValue || /^(?:my|me|self|myself|default|none|null|undefined|my\s+telegram|me\s+on\s+telegram)$/.test(lower)) {
        const defaultAlias = String(process.env.TELEGRAM_DEFAULT_ALIAS || '').trim();
        if (defaultAlias) {
            const viaAlias = CHAT_ALIASES[normalizeTelegramAlias(defaultAlias)];
            if (viaAlias) return viaAlias;
        }
        return DEFAULT_CHAT_ID;
    }
    // Be tolerant with voice/polycentric phrasing noise:
    // "my telegram please", "send to me on telegram", etc -> default chat.
    if (
        /\b(?:my|me|self|myself)\b(?:\s+(?:on|in|via|to))?\s+\btelegram\b/.test(lower)
        || /^\btelegram\b(?:\s+(?:for|to|on))?\s+\b(?:my|me|self|myself)\b/.test(lower)
    ) {
        const defaultAlias = String(process.env.TELEGRAM_DEFAULT_ALIAS || '').trim();
        if (defaultAlias) {
            const viaAlias = CHAT_ALIASES[normalizeTelegramAlias(defaultAlias)];
            if (viaAlias) return viaAlias;
        }
        return DEFAULT_CHAT_ID;
    }
    
    const aliasKey = normalizeTelegramAlias(rawValue);
    return CHAT_ALIASES[aliasKey] || rawValue;
}

function isConfigured() {
    return Boolean(BOT_TOKEN && DEFAULT_CHAT_ID);
}

function getAllowedOrigin(request) {
    const origin = String(request.headers.origin || FRONTEND_ORIGIN).replace(/\/$/, '');
    const allowed = new Set([
        FRONTEND_ORIGIN.replace(/\/$/, ''),
        'http://localhost:5173',
        'http://127.0.0.1:5173'
    ]);
    return allowed.has(origin) ? origin : '';
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

async function collectJsonBody(request) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sanitizeTelegramHtml(value = '') {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function telegramRequest(method, body) {
    if (!BOT_TOKEN) {
        const error = new Error('Missing Telegram bot token.');
        error.statusCode = 500;
        throw error;
    }
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
        method: 'POST',
        body
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
        const description = String(data?.description || `Telegram ${method} failed.`);
        const error = new Error(description);
        error.statusCode = response.status || 500;
        throw error;
    }
    return data.result || null;
}

function applyRuntimeTelegramConfig(payload = {}) {
    const nextBotToken = String(payload?.botToken || '').trim();
    const nextChatId = String(payload?.chatId || '').trim();
    const nextAliases = parseTelegramChatAliases(String(payload?.chatAliases || ''));
    expandBlipJoyTelegramAliases(nextAliases);

    BOT_TOKEN = nextBotToken;
    DEFAULT_CHAT_ID = nextChatId;
    CHAT_ALIASES = nextAliases;
}

async function sendTelegramMessage({ chatId = '', text = '' } = {}) {
    const resolvedChatId = resolveTelegramChatId(chatId);
    const resolvedText = String(text || '').trim();
    if (!resolvedChatId) throw new Error('Missing Telegram chat id.');
    if (!resolvedText) throw new Error('Missing Telegram message text.');

    const body = new URLSearchParams({
        chat_id: resolvedChatId,
        text: resolvedText
    });

    return telegramRequest('sendMessage', body);
}

async function sendTelegramPhoto({ chatId = '', caption = '', photoUrl = '', photoBase64 = '', filename = 'blip-image.png' } = {}) {
    const resolvedChatId = resolveTelegramChatId(chatId);
    if (!resolvedChatId) throw new Error('Missing Telegram chat id.');

    const trimmedPhotoUrl = String(photoUrl || '').trim();
    const trimmedCaption = String(caption || '').trim();
    const trimmedBase64 = String(photoBase64 || '').trim();

    if (trimmedPhotoUrl) {
        const body = new URLSearchParams({
            chat_id: resolvedChatId,
            photo: trimmedPhotoUrl
        });
        if (trimmedCaption) body.set('caption', trimmedCaption);
        return telegramRequest('sendPhoto', body);
    }

    if (!trimmedBase64) {
        throw new Error('Need either Telegram photoUrl or photoBase64.');
    }

    const mimeMatch = trimmedBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    const mimeType = mimeMatch?.[1] || 'image/png';
    const rawBase64 = mimeMatch?.[2] || trimmedBase64;
    const bytes = Buffer.from(rawBase64, 'base64');
    const body = new FormData();
    body.set('chat_id', resolvedChatId);
    if (trimmedCaption) body.set('caption', trimmedCaption);
    body.set('photo', new Blob([bytes], { type: mimeType }), String(filename || 'blip-image.png'));

    return telegramRequest('sendPhoto', body);
}

async function sendTelegramVideo({ chatId = '', caption = '', videoUrl = '', videoBase64 = '', filename = 'blip-video.webm' } = {}) {
    const resolvedChatId = resolveTelegramChatId(chatId);
    if (!resolvedChatId) throw new Error('Missing Telegram chat id.');

    const trimmedVideoUrl = String(videoUrl || '').trim();
    const trimmedCaption = String(caption || '').trim();
    const trimmedBase64 = String(videoBase64 || '').trim();

    if (trimmedVideoUrl) {
        const body = new URLSearchParams({
            chat_id: resolvedChatId,
            video: trimmedVideoUrl
        });
        if (trimmedCaption) body.set('caption', trimmedCaption);
        return telegramRequest('sendVideo', body);
    }

    if (!trimmedBase64) {
        throw new Error('Need either Telegram videoUrl or videoBase64.');
    }

    const mimeMatch = trimmedBase64.match(/^data:(video\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    const mimeType = mimeMatch?.[1] || 'video/webm';
    const rawBase64 = mimeMatch?.[2] || trimmedBase64;
    const bytes = Buffer.from(rawBase64, 'base64');
    const body = new FormData();
    body.set('chat_id', resolvedChatId);
    if (trimmedCaption) body.set('caption', trimmedCaption);
    body.set('video', new Blob([bytes], { type: mimeType }), String(filename || 'blip-video.webm'));

    return telegramRequest('sendVideo', body);
}

const server = http.createServer(async (request, response) => {
    try {
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

        const url = new URL(request.url || '/', `http://${request.headers.host}`);

        if (url.pathname === '/api/telegram/status' && request.method === 'GET') {
            sendJson(request, response, 200, {
                backendConfigured: isConfigured(),
                hasBotToken: Boolean(BOT_TOKEN),
                hasChatId: Boolean(DEFAULT_CHAT_ID),
                chatIdPreview: DEFAULT_CHAT_ID ? `${DEFAULT_CHAT_ID.slice(0, 4)}...` : '',
                aliasNames: Object.keys(CHAT_ALIASES),
                backendPort: PORT
            });
            return;
        }

        if (url.pathname === '/api/telegram/configure' && request.method === 'POST') {
            const body = await collectJsonBody(request);
            applyRuntimeTelegramConfig(body);
            sendJson(request, response, 200, {
                ok: true,
                backendConfigured: isConfigured(),
                hasBotToken: Boolean(BOT_TOKEN),
                hasChatId: Boolean(DEFAULT_CHAT_ID),
                chatIdPreview: DEFAULT_CHAT_ID ? `${DEFAULT_CHAT_ID.slice(0, 4)}...` : '',
                aliasNames: Object.keys(CHAT_ALIASES),
                backendPort: PORT
            });
            return;
        }

        if (!isConfigured()) {
            sendJson(request, response, 500, {
                ok: false,
                error: 'Telegram backend is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.'
            });
            return;
        }

        if (url.pathname === '/api/telegram/send-message' && request.method === 'POST') {
            const body = await collectJsonBody(request);
            const result = await sendTelegramMessage({
                chatId: body?.chatId,
                text: body?.text
            });
            sendJson(request, response, 200, {
                ok: true,
                messageId: result?.message_id || 0,
                chatId: String(result?.chat?.id || DEFAULT_CHAT_ID || '')
            });
            return;
        }

        if (url.pathname === '/api/telegram/send-photo' && request.method === 'POST') {
            const body = await collectJsonBody(request);
            const result = await sendTelegramPhoto({
                chatId: body?.chatId,
                caption: body?.caption,
                photoUrl: body?.photoUrl,
                photoBase64: body?.photoBase64,
                filename: body?.filename
            });
            sendJson(request, response, 200, {
                ok: true,
                messageId: result?.message_id || 0,
                chatId: String(result?.chat?.id || DEFAULT_CHAT_ID || '')
            });
            return;
        }

        if (url.pathname === '/api/telegram/send-video' && request.method === 'POST') {
            const body = await collectJsonBody(request);
            const result = await sendTelegramVideo({
                chatId: body?.chatId,
                caption: body?.caption,
                videoUrl: body?.videoUrl,
                videoBase64: body?.videoBase64,
                filename: body?.filename
            });
            sendJson(request, response, 200, {
                ok: true,
                messageId: result?.message_id || 0,
                chatId: String(result?.chat?.id || DEFAULT_CHAT_ID || '')
            });
            return;
        }

        if (url.pathname === '/api/telegram/send-test' && request.method === 'POST') {
            const result = await sendTelegramMessage({
                text: `Blip Telegram test\n\n${sanitizeTelegramHtml(new Date().toLocaleString('en-US'))}`
            });
            sendJson(request, response, 200, {
                ok: true,
                messageId: result?.message_id || 0,
                chatId: String(result?.chat?.id || DEFAULT_CHAT_ID || '')
            });
            return;
        }

        sendJson(request, response, 404, { ok: false, error: 'Not found.' });
    } catch (error) {
        console.error('Telegram backend error:', error);
        sendJson(request, response, Number(error?.statusCode) || 500, {
            ok: false,
            error: error?.message || 'Telegram backend error.'
        });
    }
});

server.listen(PORT, process.env.BLIP_BACKEND_HOST || '127.0.0.1', () => {
    console.log(`Telegram backend listening on http://127.0.0.1:${PORT}`);
    console.log(`Configured: ${isConfigured() ? 'yes' : 'no'}`);
});
