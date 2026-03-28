#!/usr/bin/env node

import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.CARE_CAM_BACKEND_PORT || 8794);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';

const sessions = new Map();

function getAllowedOrigin(request) {
    const origin = request.headers.origin || FRONTEND_ORIGIN;
    const allowed = new Set([FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173']);
    return allowed.has(origin) ? origin : FRONTEND_ORIGIN;
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

async function readJsonBody(request) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return {};
    return JSON.parse(raw);
}

function createSession(label = 'Blip Care Cam') {
    const id = typeof randomUUID === 'function'
        ? randomUUID()
        : `carecam-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const session = {
        id,
        label: String(label || 'Blip Care Cam').trim().slice(0, 80) || 'Blip Care Cam',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        latestFrame: null,
        commands: [],
        nextCommandId: 1,
        lastFrameAt: 0,
        lastCommandAt: 0,
        viewerTouches: 0
    };
    sessions.set(id, session);
    return session;
}

function getSession(sessionId) {
    return sessions.get(sessionId) || null;
}

function serializeSession(session) {
    return {
        ok: true,
        sessionId: session.id,
        label: session.label,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        hasFrame: !!session.latestFrame,
        frameUpdatedAt: session.lastFrameAt,
        commandCount: session.commands.length,
        lastCommandAt: session.lastCommandAt,
        viewerTouches: session.viewerTouches
    };
}

function normalizeFramePayload(body = {}) {
    const safe = body && typeof body === 'object' ? body : {};
    const dataUrl = String(safe.imageDataUrl || safe.dataUrl || '').trim();
    const imageBase64 = String(safe.imageBase64 || '').trim();
    const mimeType = String(safe.mimeType || 'image/jpeg').trim() || 'image/jpeg';
    const frameDataUrl = dataUrl || (imageBase64 ? `data:${mimeType};base64,${imageBase64}` : '');
    return {
        imageDataUrl: frameDataUrl,
        emotion: String(safe.emotion || 'serious').trim() || 'serious',
        caption: String(safe.caption || '').trim().slice(0, 160),
        timestamp: Number.isFinite(Number(safe.timestamp)) ? Number(safe.timestamp) : Date.now()
    };
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
        const parts = url.pathname.split('/').filter(Boolean);

        if (parts[0] !== 'api' || parts[1] !== 'care-cam') {
            writeJson(request, response, 404, { ok: false, message: 'Not found.' });
            return;
        }

        if (parts.length === 3 && parts[2] === 'sessions' && request.method === 'POST') {
            const body = await readJsonBody(request).catch(() => ({}));
            const session = createSession(body?.label || 'Blip Care Cam');
            writeJson(request, response, 200, serializeSession(session));
            return;
        }

        if (parts.length < 4 || parts[2] !== 'sessions') {
            writeJson(request, response, 404, { ok: false, message: 'Not found.' });
            return;
        }

        const sessionId = decodeURIComponent(parts[3] || '');
        const session = getSession(sessionId);
        if (!session) {
            writeJson(request, response, 404, { ok: false, message: 'Unknown care cam session.' });
            return;
        }

        session.updatedAt = Date.now();

        if (parts.length === 4 && request.method === 'GET') {
            writeJson(request, response, 200, serializeSession(session));
            return;
        }

        if (parts.length === 5 && parts[4] === 'frame') {
            if (request.method === 'POST') {
                const body = await readJsonBody(request).catch(() => ({}));
                const frame = normalizeFramePayload(body);
                if (!frame.imageDataUrl) {
                    writeJson(request, response, 400, { ok: false, message: 'Missing frame image.' });
                    return;
                }
                session.latestFrame = frame;
                session.lastFrameAt = Date.now();
                session.updatedAt = session.lastFrameAt;
                writeJson(request, response, 200, { ok: true, frameUpdatedAt: session.lastFrameAt });
                return;
            }
            if (request.method === 'GET') {
                session.viewerTouches += 1;
                writeJson(request, response, 200, {
                    ok: true,
                    sessionId: session.id,
                    label: session.label,
                    frame: session.latestFrame,
                    updatedAt: session.lastFrameAt
                });
                return;
            }
        }

        if (parts.length === 5 && parts[4] === 'commands') {
            if (request.method === 'POST') {
                const body = await readJsonBody(request).catch(() => ({}));
                const command = {
                    id: session.nextCommandId++,
                    kind: String(body?.kind || 'talk').trim() || 'talk',
                    text: String(body?.text || '').trim().slice(0, 280),
                    createdAt: Date.now()
                };
                if (!command.text && command.kind !== 'alert') {
                    writeJson(request, response, 400, { ok: false, message: 'Missing command text.' });
                    return;
                }
                session.commands.push(command);
                session.lastCommandAt = command.createdAt;
                session.updatedAt = command.createdAt;
                writeJson(request, response, 200, { ok: true, command });
                return;
            }

            if (request.method === 'GET') {
                const after = Math.max(0, Number(url.searchParams.get('after') || 0) || 0);
                const commands = session.commands.filter((command) => command.id > after);
                writeJson(request, response, 200, {
                    ok: true,
                    sessionId: session.id,
                    commands,
                    latestCommandId: session.commands.length ? session.commands[session.commands.length - 1].id : after
                });
                return;
            }
        }

        writeJson(request, response, 404, { ok: false, message: 'Not found.' });
    } catch (error) {
        console.error('Care Cam backend error:', error);
        writeJson(request, response, 500, {
            ok: false,
            message: error?.message || 'Care Cam backend failed.'
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Care Cam backend listening on http://127.0.0.1:${PORT}`);
});
