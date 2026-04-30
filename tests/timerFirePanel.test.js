import test from 'node:test';
import assert from 'node:assert/strict';

import { executeTimerFire } from '../src/services/timerFireEffect.js';

test('executeTimerFire renders immediately when the side panel is ready', () => {
    const state = { activeAlert: null, currentSidePanelAction: '' };
    const rendered = [];

    executeTimerFire(
        state,
        { text: 'Tea', timerId: 1, alertId: 'alert-1' },
        {
            getSidePanel: () => ({}),
            renderActionInSidePanel: (payload) => rendered.push(payload)
        }
    );

    assert.equal(state.currentSidePanelAction, 'timer');
    assert.equal(rendered.length, 1);
    assert.equal(rendered[0].action, 'timer');
});

test('executeTimerFire retries when the side panel DOM is not ready', () => {
    const originalDocument = globalThis.document;
    let panelReady = false;
    const retries = [];
    const rendered = [];
    const state = { activeAlert: null, currentSidePanelAction: '' };

    globalThis.document = {
        getElementById: () => (panelReady ? {} : null)
    };

    try {
        executeTimerFire(
            state,
            { text: 'Tea', timerId: 1, alertId: 'alert-1' },
            {
                renderActionInSidePanel: (payload) => rendered.push(payload),
                setTimeout: (fn, ms) => retries.push({ fn, ms })
            }
        );

        assert.equal(rendered.length, 0);
        assert.equal(retries.length, 1);
        assert.equal(retries[0].ms, 200);

        panelReady = true;
        retries[0].fn();

        assert.equal(rendered.length, 1);
        assert.equal(rendered[0].action, 'timer');
    } finally {
        if (originalDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = originalDocument;
        }
    }
});
