/**
 * Timer fire effect: state updates and panel open when a Blip timer fires.
 * Used by main.js setBlipTimer callback and by integration tests.
 */

export function executeTimerFire(state, params, callbacks) {
    const { text, timerId, alertId } = params;
    const { renderActionInSidePanel } = callbacks;

    state.activeAlert = {
        id: alertId,
        timerId,
        text,
        startedAt: Date.now(),
        autoClearTimer: null
    };
    state.currentSidePanelAction = 'timer';

    if (typeof renderActionInSidePanel === 'function') {
        renderActionInSidePanel({ action: 'timer', tool_params: {}, text: '' });
    }
}
