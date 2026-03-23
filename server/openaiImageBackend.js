#!/usr/bin/env node

import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.OPENAI_IMAGE_BACKEND_PORT || 8790);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

function getAllowedOrigin(request) {
  const origin = request.headers.origin || FRONTEND_ORIGIN;
  const allowed = new Set([FRONTEND_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']);
  return allowed.has(origin) ? origin : FRONTEND_ORIGIN;
}

function sendJson(request, response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    request.on('error', reject);
  });
}

async function generateImageOpenAI({ prompt, size = '1024x1024' }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in the environment running the backend.');
  }
  const res = await fetch('https://api.openai.com/v1/images', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt: String(prompt || ''),
      size,
    }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = null; }
  if (!res.ok) {
    const msg = data?.error?.message || text || `HTTP ${res.status}`;
    throw new Error(`OpenAI image generate failed (${res.status}): ${msg}`);
  }

  const item = Array.isArray(data?.data) ? data.data[0] : null;
  const base64 = item?.b64_json || null;
  if (!base64) throw new Error('OpenAI image response missing b64_json.');
  return { base64 };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

    if (req.method === 'OPTIONS') {
      return sendJson(req, res, 200, { ok: true });
    }

    if (req.method === 'GET' && url.pathname === '/api/openai-image/health') {
      return sendJson(req, res, 200, { ok: true, configured: Boolean(OPENAI_API_KEY), model: OPENAI_IMAGE_MODEL });
    }

    if (req.method === 'POST' && url.pathname === '/api/openai-image/generate') {
      const body = await readJsonBody(req);
      const prompt = String(body?.prompt || '').trim();
      if (!prompt) return sendJson(req, res, 400, { error: 'Missing prompt.' });
      const size = String(body?.size || '1024x1024');
      const out = await generateImageOpenAI({ prompt, size });
      return sendJson(req, res, 200, { ok: true, base64: out.base64, mimeType: 'image/png', model: OPENAI_IMAGE_MODEL });
    }

    return sendJson(req, res, 404, { error: 'Not found.' });
  } catch (e) {
    return sendJson(req, res, 500, { error: e?.message || String(e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`OpenAI image backend listening on http://127.0.0.1:${PORT}`);
  console.log(`Frontend origin: ${FRONTEND_ORIGIN}`);
  console.log(`Configured: ${OPENAI_API_KEY ? 'yes' : 'no'}`);
});

