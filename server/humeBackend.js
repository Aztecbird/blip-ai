#!/usr/bin/env node

import http from 'node:http';
import { Buffer } from 'node:buffer';

const PORT = Number(process.env.HUME_BACKEND_PORT || 8796);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = new Set(
    [FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173']
        .concat(String(process.env.BLIP_ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean))
);

const HUME_COMPANION_ENABLED = /^(?:1|true|yes|on)$/i.test(String(process.env.HUME_COMPANION_ENABLED || 'false'));
const HUME_API_KEY = String(process.env.HUME_API_KEY || '').trim();
const HUME_SECRET_KEY = String(process.env.HUME_SECRET_KEY || '').trim();
const HUME_CONFIG_ID = String(process.env.HUME_CONFIG_ID || '').trim();
const HUME_WEBSOCKET_URL = String(process.env.HUME_WEBSOCKET_URL || 'wss://api.hume.ai/v0/evi/chat').trim();

function getAllowedOrigin(request) {
    const origin = request.headers.origin || FRONTEND_ORIGIN;
    return ALLOWED_ORIGINS.has(origin) ? origin : FRONTEND_ORIGIN;
}

function writeJson(request, response, statusCode, payload) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': getAllowedOrigin(request),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    response.end(JSON.stringify(payload));
}

async function requestAccessToken() {
    const auth = Buffer.from(`${HUME_API_KEY}:${HUME_SECRET_KEY}`, 'utf8').toString('base64');
    const response = await fetch('https://api.hume.ai/oauth2-cc/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.message || payload?.error_description || `Hume token request failed (${response.status}).`);
    }
    return payload;
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
        if (!url.pathname.startsWith('/api/hume')) {
            writeJson(request, response, 404, { ok: false, message: 'Not found.' });
            return;
        }

        if (url.pathname === '/api/hume/health' && request.method === 'GET') {
            const available = HUME_COMPANION_ENABLED && !!HUME_API_KEY && !!HUME_SECRET_KEY;
            writeJson(request, response, 200, {
                ok: true,
                enabled: available,
                available,
                integrationEnabled: HUME_COMPANION_ENABLED,
                configId: HUME_CONFIG_ID || '',
                hasCredentials: !!HUME_API_KEY && !!HUME_SECRET_KEY
            });
            return;
        }

        if (url.pathname === '/api/hume/token' && request.method === 'POST') {
            if (!HUME_COMPANION_ENABLED) {
                writeJson(request, response, 403, {
                    ok: false,
                    message: 'Hume companion mode is disabled.'
                });
                return;
            }
            if (!HUME_API_KEY || !HUME_SECRET_KEY) {
                writeJson(request, response, 500, {
                    ok: false,
                    message: 'Missing HUME_API_KEY or HUME_SECRET_KEY in .env.local.'
                });
                return;
            }

            const token = await requestAccessToken();
            writeJson(request, response, 200, {
                ok: true,
                accessToken: String(token?.access_token || ''),
                expiresIn: Number(token?.expires_in || 0),
                tokenType: String(token?.token_type || 'Bearer'),
                configId: HUME_CONFIG_ID || '',
                websocketUrl: HUME_WEBSOCKET_URL
            });
            return;
        }

        writeJson(request, response, 404, { ok: false, message: 'Not found.' });
    } catch (error) {
        console.error('Hume backend error:', error);
        writeJson(request, response, 500, {
            ok: false,
            message: error?.message || 'Hume backend failed.'
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Hume backend listening on http://127.0.0.1:${PORT}`);
});
