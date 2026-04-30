import test from 'node:test';
import assert from 'node:assert/strict';

import {
    parseCalendarDayNumberReference,
    parseCalendarMonthDayReference,
    parseCalendarVoiceDateReference
} from '../src/services/calendarVoiceDates.js';

test('calendar voice dates parse ordinal day references', () => {
    const referenceDate = new Date(2026, 3, 10);

    assert.equal(parseCalendarDayNumberReference('show me day 14'), 14);
    assert.equal(parseCalendarDayNumberReference('show me the 14th'), 14);
    assert.equal(parseCalendarDayNumberReference('show me 14th'), 14);

    const resolved = parseCalendarVoiceDateReference('show me the 14th', { referenceDate });
    assert.equal(resolved.getFullYear(), 2026);
    assert.equal(resolved.getMonth(), 3);
    assert.equal(resolved.getDate(), 14);
});

test('calendar voice dates parse month-day references', () => {
    const referenceDate = new Date(2026, 0, 5);
    const resolved = parseCalendarMonthDayReference('show me march 14', referenceDate);

    assert.equal(resolved.getFullYear(), 2026);
    assert.equal(resolved.getMonth(), 2);
    assert.equal(resolved.getDate(), 14);
});

test('calendar voice dates parse this Friday as the upcoming Friday', () => {
    const referenceDate = new Date(2026, 3, 22); // Wednesday, April 22, 2026
    const resolved = parseCalendarVoiceDateReference("what's on this Friday", { referenceDate });

    assert.equal(resolved.getFullYear(), 2026);
    assert.equal(resolved.getMonth(), 3);
    assert.equal(resolved.getDate(), 24);
});

test('calendar voice dates avoid unrelated bare numbers', () => {
    assert.equal(parseCalendarVoiceDateReference('show me 14 products', { referenceDate: new Date(2026, 3, 10) }), null);
});
