#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import readline from 'node:readline';
import { URL } from 'node:url';

const PORT = Number(process.env.EXPENSE_TRACKER_BACKEND_PORT || 8797);
const FRONTEND_ORIGIN = process.env.BLIP_FRONTEND_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = [
  FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...String(process.env.BLIP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
].map((value) => value.replace(/\/$/, ''));

const DATA_DIR = path.join(process.cwd(), '.blip-data');
const LOG_PATH = path.join(DATA_DIR, 'api-expenses-log.jsonl');
const PRICING_PATH = path.join(process.cwd(), 'server', 'pricingConfig.json');

function getAllowedOrigin(request) {
  const origin = String(request.headers.origin || FRONTEND_ORIGIN).replace(/\/$/, '');
  return ALLOWED_ORIGINS.includes(origin) ? origin : '';
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

async function collectJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function ensureDataDir() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

async function readPricingConfig() {
  try {
    const raw = await fsp.readFile(PRICING_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function lookupPrice(pricing, event) {
  const provider = String(event.provider || '').toLowerCase();
  const product = String(event.product || '').toLowerCase();
  const model = String(event.model || '').trim();
  const operation = String(event.operation || '').toLowerCase();

  const providerConfig = pricing?.[provider] || null;
  if (!providerConfig) return null;
  const productConfig = providerConfig?.[product] || null;
  if (!productConfig) return null;

  if (model && productConfig?.[model]?.cost != null) {
    const entry = productConfig[model];
    return { unit: entry.unit || 'unknown', currency: entry.currency || 'USD', cost: Number(entry.cost) || 0 };
  }
  if (operation && productConfig?.[operation]?.cost != null) {
    const entry = productConfig[operation];
    return { unit: entry.unit || 'unknown', currency: entry.currency || 'USD', cost: Number(entry.cost) || 0 };
  }
  if (productConfig?.requests?.cost != null) {
    const entry = productConfig.requests;
    return { unit: entry.unit || 'per_request', currency: entry.currency || 'USD', cost: Number(entry.cost) || 0 };
  }
  return null;
}

function getTokenCostEstimate(event = {}, price = null) {
  const usage = event?.metadata?.usageMetadata || {};
  const inputTokens = Number(
    usage?.promptTokenCount ??
    usage?.inputTokenCount ??
    usage?.cachedContentTokenCount ??
    0
  );
  const outputTokens = Number(
    usage?.candidatesTokenCount ??
    usage?.outputTokenCount ??
    0
  );

  const inCost = Number(price?.inputCost || 0);
  const outCost = Number(price?.outputCost || 0);
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) return null;
  if (!Number.isFinite(inCost) || !Number.isFinite(outCost)) return null;

  const estimatedCost = ((inputTokens / 1000) * inCost) + ((outputTokens / 1000) * outCost);
  return {
    estimatedCost,
    quantity: inputTokens + outputTokens,
    unit: 'tokens',
    metadataPatch: {
      tokenBreakdown: {
        inputTokens,
        outputTokens,
      },
    },
  };
}

async function appendEvent(rawEvent = {}) {
  await ensureDataDir();
  const pricing = await readPricingConfig();
  const price = lookupPrice(pricing, rawEvent);
  const quantity = Number(rawEvent.quantity || 1);
  const estimatedCostDefault = Number.isFinite(quantity) ? (price ? (Number(price.cost) || 0) * quantity : 0) : 0;
  const tokenCost = getTokenCostEstimate(rawEvent, price);
  const estimatedCost = tokenCost ? tokenCost.estimatedCost : estimatedCostDefault;
  const event = {
    timestamp: new Date().toISOString(),
    provider: String(rawEvent.provider || 'unknown'),
    product: String(rawEvent.product || 'unknown'),
    operation: String(rawEvent.operation || ''),
    model: String(rawEvent.model || ''),
    quantity: tokenCost ? tokenCost.quantity : (Number.isFinite(quantity) ? quantity : 1),
    unit: tokenCost ? tokenCost.unit : (rawEvent.unit || price?.unit || 'per_request'),
    currency: rawEvent.currency || price?.currency || 'USD',
    unitCost: rawEvent.unitCost != null ? Number(rawEvent.unitCost) || 0 : (Number(price?.cost) || 0),
    estimatedCost: Number(estimatedCost || 0),
    status: String(rawEvent.status || 'success'),
    metadata: {
      ...(rawEvent.metadata || {}),
      ...(tokenCost?.metadataPatch || {}),
    },
  };
  await fsp.appendFile(LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

async function summarize({ from, to } = {}) {
  const result = {
    totalEvents: 0,
    totalEstimatedCost: 0,
    currency: 'USD',
    byDay: {},
    byProvider: {},
    byModel: {},
  };

  try {
    await fsp.access(LOG_PATH, fs.constants.F_OK);
  } catch {
    return result;
  }

  const fromTime = from ? Date.parse(from) : null;
  const toTime = to ? Date.parse(to) : null;

  const stream = fs.createReadStream(LOG_PATH, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    const timestamp = String(event.timestamp || '');
    const unix = Date.parse(timestamp);
    if (Number.isFinite(fromTime) && Number.isFinite(unix) && unix < fromTime) continue;
    if (Number.isFinite(toTime) && Number.isFinite(unix) && unix > toTime) continue;

    const day = timestamp ? timestamp.slice(0, 10) : 'unknown-day';
    const provider = String(event.provider || 'unknown');
    const model = String(event.model || 'unknown');
    const estimatedCost = Number(event.estimatedCost || 0);

    result.totalEvents += 1;
    result.totalEstimatedCost += estimatedCost;
    result.byDay[day] = (result.byDay[day] || 0) + estimatedCost;
    result.byProvider[provider] = (result.byProvider[provider] || 0) + estimatedCost;
    result.byModel[model] = (result.byModel[model] || 0) + estimatedCost;
  }

  result.totalEstimatedCost = Number(result.totalEstimatedCost.toFixed(6));
  return result;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

    if (request.method === 'OPTIONS') {
      return sendJson(request, response, 200, { ok: true });
    }

    if (request.method === 'GET' && url.pathname === '/api/expense-tracker/health') {
      return sendJson(request, response, 200, { ok: true, logPath: LOG_PATH });
    }

    if (request.method === 'POST' && url.pathname === '/api/expense-tracker/log') {
      const body = await collectJsonBody(request);
      const event = await appendEvent(body);
      return sendJson(request, response, 200, { ok: true, event });
    }

    if (request.method === 'GET' && url.pathname === '/api/expense-tracker/summary') {
      const from = String(url.searchParams.get('from') || '').trim();
      const to = String(url.searchParams.get('to') || '').trim();
      const summary = await summarize({
        from: from || undefined,
        to: to || undefined,
      });
      return sendJson(request, response, 200, { ok: true, summary });
    }

    if (request.method === 'GET' && url.pathname === '/api/expense-tracker/pricing') {
      const pricing = await readPricingConfig();
      return sendJson(request, response, 200, { ok: true, pricing });
    }

    return sendJson(request, response, 404, { error: 'Not found.' });
  } catch (error) {
    console.error('Expense tracker backend error:', error);
    return sendJson(request, response, 500, { error: error?.message || 'Expense tracker backend error.' });
  }
});

server.listen(PORT, process.env.BLIP_BACKEND_HOST || '127.0.0.1', () => {
  console.log(`Expense tracker backend listening on http://127.0.0.1:${PORT}`);
});
