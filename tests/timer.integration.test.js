import test from 'node:test';
import assert from 'node:assert/strict';
import { executeTimerFire } from '../src/services/timerFireEffect.js';
import { buildTimerPanelBodyHtml } from '../src/services/panelTimerBody.js';

test('executeTimerFire sets state.activeAlert and currentSidePanelAction to timer', () => {
    const state = { activeAlert: null, currentSidePanelAction: '' };
    const params = { text: 'Pizza ready', timerId: 123, alertId: 'a1' };
    const captured = [];
    const renderActionInSidePanel = (opts) => captured.push(opts);

    executeTimerFire(state, params, { renderActionInSidePanel });

    assert.ok(state.activeAlert !== null);
    assert.equal(state.activeAlert.id, 'a1');
    assert.equal(state.activeAlert.text, 'Pizza ready');
    assert.equal(state.activeAlert.timerId, 123);
    assert.equal(state.currentSidePanelAction, 'timer');
    assert.equal(captured.length, 1);
    assert.equal(captured[0].action, 'timer');
});

test('timer panel body HTML contains "Silence Alarm" when state.activeAlert is set', () => {
    const state = {
        activeAlert: { id: 'a1', text: 'Test reminder', startedAt: Date.now() },
        timers: []
    };
    const now = Date.now();
    const helpers = {
        getUpcomingTimersSorted: () => [],
        getReminderDisplayCard: (entry) => (entry?.isAlert
            ? { heading: entry.text || 'Alarm', time: 'READY', day: 'Now', detail: 'Alarm ringing now', alarm: true }
            : null),
        formatReminderTimeLabel: () => '--',
        formatReminderDayLabel: () => '--',
        escapeHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    };

    const html = buildTimerPanelBodyHtml(state, helpers);

    assert.ok(html.includes('Silence Alarm'), 'timer panel body should contain "Silence Alarm" when activeAlert is set');
});

test('timer panel body HTML does not contain "Silence Alarm" when state.activeAlert is null', () => {
    const state = { activeAlert: null, timers: [] };
    const helpers = {
        getUpcomingTimersSorted: () => [],
        getReminderDisplayCard: () => null,
        formatReminderTimeLabel: () => '--',
        formatReminderDayLabel: () => '--',
        escapeHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    };

    const html = buildTimerPanelBodyHtml(state, helpers);

    assert.ok(!html.includes('Silence Alarm'), 'timer panel body should not contain "Silence Alarm" when no activeAlert');
});
