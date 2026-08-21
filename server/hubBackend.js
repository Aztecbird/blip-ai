#!/usr/bin/env node

import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.HUB_BACKEND_PORT || 8795);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
const DATA_DIR = path.join(process.cwd(), '.blip-data', 'hub');
const STORE_FILE = path.join(DATA_DIR, 'student-desk.json');
const MAX_ITEMS = 50;

let storePromise = null;

function getAllowedOrigin(request) {
    const origin = request.headers.origin || FRONTEND_ORIGIN;
    const allowed = new Set([FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173']);
    return allowed.has(origin) ? origin : '';
}

function writeJson(request, response, statusCode, payload) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': getAllowedOrigin(request),
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
    });
    response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    return raw ? JSON.parse(raw) : {};
}

function nowLabel() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeItem(item = {}, index = 0) {
    const safe = item && typeof item === 'object' ? item : {};
    const content = String(safe.content || '').trim();
    const data = safe.data && typeof safe.data === 'object' && !Array.isArray(safe.data) ? safe.data : {};
    return {
        id: String(safe.id || `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`),
        type: String(safe.type || 'note').trim() || 'note',
        content,
        data,
        timestamp: String(safe.timestamp || nowLabel()).trim() || nowLabel()
    };
}

function normalizeItems(items = []) {
    if (!Array.isArray(items)) return [];
    return items
        .filter((item) => item && typeof item === 'object')
        .map((item, index) => normalizeItem(item, index))
        .filter((item) => item.content || item.data?.url)
        .slice(0, MAX_ITEMS);
}

async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadStore() {
    if (!storePromise) {
        storePromise = (async () => {
            try {
                const raw = await fs.readFile(STORE_FILE, 'utf8');
                const parsed = JSON.parse(raw);
                const items = normalizeItems(parsed?.items || parsed || []);
                return {
                    items,
                    updatedAt: Number(parsed?.updatedAt) || Date.now()
                };
            } catch (_) {
                return { items: [], updatedAt: Date.now() };
            }
        })();
    }
    return storePromise;
}

async function saveStore(store) {
    await ensureDataDir();
    const payload = {
        items: normalizeItems(store.items || []),
        updatedAt: Date.now()
    };
    await fs.writeFile(STORE_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    storePromise = Promise.resolve(payload);
    return payload;
}

async function getStore() {
    return loadStore();
}

async function replaceStore(items = []) {
    return saveStore({ items });
}

const server = http.createServer(async (request, response) => {
    try {
        if (request.method === 'OPTIONS') {
            response.writeHead(204, {
                'Access-Control-Allow-Origin': getAllowedOrigin(request),
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS'
            });
            response.end();
            return;
        }

        const url = new URL(request.url || '/', `http://${request.headers.host}`);
        if (!url.pathname.startsWith('/api/hub')) {
            writeJson(request, response, 404, { ok: false, message: 'Not found.' });
            return;
        }

        if (url.pathname === '/api/hub/health' && request.method === 'GET') {
            const store = await getStore();
            writeJson(request, response, 200, {
                ok: true,
                count: store.items.length,
                updatedAt: store.updatedAt
            });
            return;
        }

        if (url.pathname === '/api/hub/items' && request.method === 'GET') {
            const store = await getStore();
            writeJson(request, response, 200, {
                ok: true,
                items: store.items
            });
            return;
        }

        if (url.pathname === '/api/hub/items' && request.method === 'POST') {
            const body = await readJsonBody(request).catch(() => ({}));
            const item = normalizeItem(body, 0);
            if (!item.content && !item.data?.url) {
                writeJson(request, response, 400, { ok: false, message: 'Missing hub item content.' });
                return;
            }
            const store = await getStore();
            const nextItems = [item, ...store.items].slice(0, MAX_ITEMS);
            await saveStore({ items: nextItems });
            writeJson(request, response, 200, { ok: true, item });
            return;
        }

        if (url.pathname === '/api/hub/import' && request.method === 'POST') {
            const body = await readJsonBody(request).catch(() => ({}));
            const items = Array.isArray(body?.items) ? body.items : [];
            const normalized = normalizeItems(items);
            await replaceStore(normalized);
            writeJson(request, response, 200, {
                ok: true,
                items: normalized,
                count: normalized.length
            });
            return;
        }

        if (url.pathname.startsWith('/api/hub/items/') && request.method === 'DELETE') {
            const id = decodeURIComponent(url.pathname.replace('/api/hub/items/', '').trim());
            if (!id) {
                writeJson(request, response, 400, { ok: false, message: 'Missing item id.' });
                return;
            }
            const store = await getStore();
            const nextItems = store.items.filter((item) => String(item.id) !== String(id));
            if (nextItems.length === store.items.length) {
                writeJson(request, response, 404, { ok: false, message: 'Hub item not found.' });
                return;
            }
            await saveStore({ items: nextItems });
            writeJson(request, response, 200, { ok: true, count: nextItems.length });
            return;
        }

        if (url.pathname === '/api/hub/clear' && request.method === 'POST') {
            await replaceStore([]);
            writeJson(request, response, 200, { ok: true, count: 0 });
            return;
        }

        writeJson(request, response, 404, { ok: false, message: 'Not found.' });
    } catch (error) {
        console.error('Hub backend error:', error);
        writeJson(request, response, 500, {
            ok: false,
            message: error?.message || 'Hub backend failed.'
        });
    }
});

server.listen(PORT, process.env.BLIP_BACKEND_HOST || '127.0.0.1', () => {
    console.log(`Hub backend listening on http://127.0.0.1:${PORT}`);
});
