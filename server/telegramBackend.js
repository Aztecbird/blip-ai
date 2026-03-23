#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.TELEGRAM_BACKEND_PORT || 8789);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
const BOT_TOKEN = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const DEFAULT_CHAT_ID = String(process.env.TELEGRAM_CHAT_ID || '').trim();
const CHAT_ALIASES = parseTelegramChatAliases(process.env.TELEGRAM_CHAT_ALIASES || '');

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

function resolveTelegramChatId(value = '') {
    const rawValue = String(value || '').trim();
    if (!rawValue) return DEFAULT_CHAT_ID;
    return CHAT_ALIASES[normalizeTelegramAlias(rawValue)] || rawValue;
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
                aliasNames: Object.keys(CHAT_ALIASES)
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

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Telegram backend listening on http://127.0.0.1:${PORT}`);
    console.log(`Configured: ${isConfigured() ? 'yes' : 'no'}`);
});
