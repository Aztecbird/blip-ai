/**
 * Timer fire effect: state updates and panel open when a Blip timer fires.
 * Used by main.js setBlipTimer callback and by integration tests.
 */

function getDefaultSidePanel() {
    if (typeof document === 'undefined') return null;
    return document.getElementById('blip-side-panel') || document.getElementById('side-panel');
}

export function executeTimerFire(state, params, callbacks = {}) {
    const { text, timerId, alertId } = params;
    const {
        getSidePanel = getDefaultSidePanel,
        renderActionInSidePanel,
        setTimeout: scheduleRetry = globalThis.setTimeout?.bind(globalThis)
    } = callbacks;
    const retryCount = Number(params.retryCount || 0);

    state.activeAlert = {
        id: alertId,
        timerId,
        text,
        startedAt: Date.now(),
        autoClearTimer: null
    };
    state.currentSidePanelAction = 'timer';

    if (typeof renderActionInSidePanel === 'function') {
        const hasDocument = typeof document !== 'undefined';
        const panel = typeof getSidePanel === 'function' ? getSidePanel() : null;
        if (hasDocument && !panel && retryCount < 3 && typeof scheduleRetry === 'function') {
            console.warn('[TimerFire] Side panel DOM not ready, retrying in 200ms');
            scheduleRetry(() => executeTimerFire(state, { ...params, retryCount: retryCount + 1 }, callbacks), 200);
            return;
        }
        renderActionInSidePanel({ action: 'timer', tool_params: {}, text: '' });
    }
}
