#!/usr/bin/env node

import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.MEDIA_ACTIONS_BACKEND_PORT || 8791);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
const DATA_DIR = path.join(process.cwd(), '.blip-data', 'media-actions');

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
        'Access-Control-Allow-Headers': 'Content-Type, X-File-Name',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    response.end(JSON.stringify(payload));
}

async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

function sanitizeFilename(value = '') {
    const cleaned = String(value || '')
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
    return cleaned || `blip-photo-${Date.now()}.png`;
}

function extensionFromContentType(contentType = '') {
    const lower = String(contentType || '').toLowerCase();
    if (lower.includes('jpeg') || lower.includes('jpg')) return '.jpg';
    if (lower.includes('webp')) return '.webp';
    if (lower.includes('gif')) return '.gif';
    return '.png';
}

async function collectBinaryBody(request) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function setMacWallpaper(filePath) {
    const script = `
        tell application "System Events"
            repeat with desktopRef in desktops
                set picture of desktopRef to POSIX file "${filePath}"
            end repeat
        end tell
    `;
    await execFileAsync('osascript', ['-e', script]);
}

const server = http.createServer(async (request, response) => {
    try {
        if (request.method === 'OPTIONS') {
            response.writeHead(204, {
                'Access-Control-Allow-Origin': getAllowedOrigin(request),
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type, X-File-Name',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            });
            response.end();
            return;
        }

        const url = new URL(request.url || '/', `http://${request.headers.host}`);

        if (url.pathname === '/api/media-actions/status' && request.method === 'GET') {
            sendJson(request, response, 200, {
                ok: true,
                platform: os.platform(),
                wallpaperSupported: os.platform() === 'darwin'
            });
            return;
        }

        if (url.pathname === '/api/media-actions/wallpaper' && request.method === 'POST') {
            if (os.platform() !== 'darwin') {
                sendJson(request, response, 400, {
                    ok: false,
                    message: 'Wallpaper is only wired for macOS right now.'
                });
                return;
            }

            const body = await collectBinaryBody(request);
            if (!body.length) {
                sendJson(request, response, 400, { ok: false, message: 'No image received.' });
                return;
            }

            await ensureDataDir();
            const requestedName = sanitizeFilename(request.headers['x-file-name'] || `blip-photo-${Date.now()}`);
            const ext = path.extname(requestedName) || extensionFromContentType(request.headers['content-type']);
            const filename = requestedName.endsWith(ext) ? requestedName : `${requestedName}${ext}`;
            const filePath = path.join(DATA_DIR, filename);

            await fs.writeFile(filePath, body);
            await setMacWallpaper(filePath);

            sendJson(request, response, 200, {
                ok: true,
                message: 'Wallpaper set.',
                filePath
            });
            return;
        }

        sendJson(request, response, 404, { ok: false, message: 'Not found.' });
    } catch (error) {
        console.error('Media actions backend error:', error);
        sendJson(request, response, error?.statusCode || 500, {
            ok: false,
            message: error?.message || 'Media action failed.'
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Media actions backend listening on http://127.0.0.1:${PORT}`);
});
