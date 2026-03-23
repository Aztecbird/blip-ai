/**
 * Build timer panel body HTML (hero, list, actions including "Silence Alarm").
 * Used by main.js renderTimerPanelBody and by integration tests.
 */

export function buildTimerPanelBodyHtml(state, helpers) {
    const {
        getUpcomingTimersSorted,
        getReminderDisplayCard,
        formatReminderTimeLabel,
        formatReminderDayLabel,
        escapeHtml
    } = helpers;

    const activeAlert = state.activeAlert;
    const timers = getUpcomingTimersSorted(state);
    const focusedTimer = timers[0] || null;
    const heroCard = getReminderDisplayCard(activeAlert
        ? { text: activeAlert.text, time: Date.now(), isAlert: true }
        : focusedTimer
            ? { ...focusedTimer, isAlert: false }
            : null);
    const heroLabel = heroCard?.heading || 'No reminders';
    const heroTime = heroCard?.time || '--';
    const heroMeta = heroCard?.alarm
        ? 'Alarm ringing now'
        : heroCard
            ? `${heroCard.day} · ${heroCard.detail}`
            : 'No scheduled reminders';

    return `
        <div class="blip-timer-hero ${activeAlert ? 'alarm' : ''}">
            <div class="blip-timer-hero-label">${escapeHtml(heroLabel)}</div>
            <div class="blip-timer-hero-time">${heroTime}</div>
            <div class="blip-timer-hero-meta">${escapeHtml(heroMeta)}</div>
        </div>
        <div class="blip-timer-list">
            ${timers.length
        ? timers.map((timer) => `
                    <button type="button" class="blip-timer-row" data-timer-focus="${timer.id}">
                        <span class="blip-timer-row-label">${escapeHtml(String(timer.text || 'Timer'))}</span>
                        <span class="blip-timer-row-time">${escapeHtml(formatReminderTimeLabel(timer.time))}</span>
                        <span class="blip-timer-row-meta">${escapeHtml(formatReminderDayLabel(timer.time))}</span>
                    </button>
                `).join('')
        : '<div class="blip-timer-empty">No scheduled reminders right now.</div>'}
        </div>
        <div class="blip-timer-actions">
            ${activeAlert ? '<button type="button" class="action-link outline" id="blip-timer-dismiss-alert">🔕 Silence Alarm</button>' : ''}
            ${timers.length > 0 ? '<button type="button" class="action-link outline" id="blip-timer-hide-panel">Hide Reminder</button>' : ''}
        </div>
    `;
}
