import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { webTestUtils } from '../src/services/web.js';

const realDateNow = Date.now;

beforeEach(() => {
  webTestUtils.clearCache();
  Date.now = realDateNow;
});

afterEach(() => {
  webTestUtils.clearCache();
  Date.now = realDateNow;
});

test('getCacheKey normalizes case and whitespace', () => {
  const key = webTestUtils.getCacheKey('weather', '  Madrid ', ' OpenWeather ');

  assert.equal(key, 'weather::madrid::openweather');
});

test('normalizeProductOptionList strips bullets, deduplicates, and limits results', () => {
  const items = webTestUtils.normalizeProductOptionList(`
    - iPad Air
    1. Kindle Paperwhite
    * iPad Air
    2) Sony WH-1000XM5
    • Extra Item
  `);

  assert.deepEqual(items, [
    'iPad Air',
    'Kindle Paperwhite',
    'Sony WH-1000XM5',
  ]);
});

test('cache helpers return stored values before ttl expiry', () => {
  Date.now = () => 1_000;
  webTestUtils.setCached('weather::madrid', { ok: true });

  Date.now = () => 1_500;
  const result = webTestUtils.getCached('weather::madrid', 1_000);

  assert.deepEqual(result, { ok: true });
});

test('cache helpers expire stale values after ttl', () => {
  Date.now = () => 2_000;
  webTestUtils.setCached('weather::madrid', { ok: true });

  Date.now = () => 3_500;
  const result = webTestUtils.getCached('weather::madrid', 1_000);

  assert.equal(result, null);
});

test('formatOffsetTime returns empty string for invalid offsets', () => {
  assert.equal(webTestUtils.formatOffsetTime('not-a-number'), '');
});

test('formatOffsetTime renders UTC-shifted time deterministically', () => {
  Date.now = () => Date.UTC(2024, 0, 1, 12, 30, 0);

  const result = webTestUtils.formatOffsetTime(2 * 60 * 60);

  assert.equal(result, '14:30');
});
