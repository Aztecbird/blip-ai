import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskCommand } from '../src/services/taskParser.js';
import { tryHandleTaskVoiceCommand } from '../src/services/taskVoiceBridge.js';

/** Monday 30 March 2026, 12:00 local */
const FIX_NOW = new Date(2026, 2, 30, 12, 0, 0, 0);

test('remind me tomorrow at 9 to call the shop', () => {
    const p = parseTaskCommand('remind me tomorrow at 9 to call the shop', FIX_NOW);
    assert.equal(p.intent, 'create_task');
    assert.equal(p.action, 'create');
    assert.equal(p.title, 'call the shop');
    assert.ok(p.dueAt);
    const d = new Date(p.dueAt);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 2);
    assert.equal(d.getDate(), 31);
    assert.equal(d.getHours(), 9);
    assert.ok(p.confidence >= 0.5);
});

test('remind me in 20 minutes to check the oven', () => {
    const p = parseTaskCommand('remind me in 20 minutes to check the oven', FIX_NOW);
    assert.equal(p.intent, 'create_task');
    assert.equal(p.title, 'check the oven');
    const due = Date.parse(p.dueAt);
    assert.ok(Math.abs(due - (FIX_NOW.getTime() + 20 * 60 * 1000)) < 1500);
});

test('every Friday remind me to check house listings', () => {
    const p = parseTaskCommand('every Friday remind me to check house listings', FIX_NOW);
    assert.equal(p.intent, 'create_task');
    assert.ok(p.recurrence);
    assert.equal(p.recurrence.type, 'weekly');
    assert.deepEqual(p.recurrence.byWeekday, [5]);
    assert.match(p.title, /house listings/i);
    const d = new Date(p.dueAt);
    assert.equal(d.getDay(), 5);
});

test('set a reminder for April 22 at 9 am to bring the car to the shop', () => {
    const p = parseTaskCommand(
        'set a reminder for April 22 at 9 am to bring the car to the shop',
        FIX_NOW
    );
    assert.equal(p.intent, 'create_task');
    assert.match(p.title, /bring the car to the shop/i);
    const d = new Date(p.dueAt);
    assert.equal(d.getMonth(), 3);
    assert.equal(d.getDate(), 22);
    assert.equal(d.getHours(), 9);
});

test('task for doctor call on April 4', () => {
    const p = parseTaskCommand('task for doctor call on April 4', FIX_NOW);
    assert.equal(p.intent, 'create_task');
    assert.match(p.title, /doctor call/i);
    const d = new Date(p.dueAt);
    assert.equal(d.getMonth(), 3);
    assert.equal(d.getDate(), 4);
});

test('what tasks do I have today', () => {
    const p = parseTaskCommand('what tasks do I have today', FIX_NOW);
    assert.equal(p.intent, 'list_tasks_today');
    assert.equal(p.action, 'list_today');
    assert.equal(p.filters?.today, true);
});

test('show my reminders', () => {
    const p = parseTaskCommand('show my reminders', FIX_NOW);
    assert.equal(p.intent, 'list_tasks');
    assert.equal(p.action, 'list');
});

test('delete my reminder for the doctor', () => {
    const p = parseTaskCommand('delete my reminder for the doctor', FIX_NOW);
    assert.equal(p.intent, 'delete_task');
    assert.match(p.referenceText || '', /doctor/i);
});

test('cancel reminder to call John', () => {
    const p = parseTaskCommand('cancel reminder to call John', FIX_NOW);
    assert.equal(p.intent, 'delete_task');
    assert.match(p.referenceText || '', /call john/i);
});

test('mark that task done', () => {
    const p = parseTaskCommand('mark that task done', FIX_NOW);
    assert.equal(p.intent, 'complete_task');
    assert.ok(!p.referenceText);
});

test('complete the reminder for doctor call', () => {
    const p = parseTaskCommand('complete the reminder for doctor call', FIX_NOW);
    assert.equal(p.intent, 'complete_task');
    assert.match(p.referenceText || '', /doctor call/i);
});

test('tryHandleTaskVoiceCommand schedules create_task', () => {
    let last = null;
    const r = tryHandleTaskVoiceCommand('remind me in 1 hour to stretch', {
        now: FIX_NOW,
        getUpcomingTimersSorted: () => [],
        setBlipTimer: (text, ms, dueAt) => {
            last = { text, ms, dueAt };
        },
        cancelMatchingScheduledTimer: () => null
    });
    assert.equal(r.handled, true);
    assert.ok(last && last.text && last.ms > 0);
});

test('tryHandleTaskVoiceCommand list today', () => {
    const r = tryHandleTaskVoiceCommand('what tasks do I have today', {
        now: FIX_NOW,
        getUpcomingTimersSorted: () => [{ time: FIX_NOW.getTime() + 3600000, text: 'x' }],
        setBlipTimer: () => {},
        cancelMatchingScheduledTimer: () => null
    });
    assert.equal(r.handled, true);
    assert.match(r.text, /1 task/);
});
