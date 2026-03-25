/**
 * Blip Calendar — single owner for the agenda panel DOM.
 * Avoids fighting applyDefaultSidePanelLayout / stale inline styles by applying
 * one cssText blob when opening and one reset when closing.
 */

export const BLIP_SIDE_PANEL_ID = 'blip-side-panel';
export const BLIP_CALENDAR_MIRROR_CLASS = 'blip-calendar-mirror-panel';

function ensureHost() {
    let el = document.getElementById(BLIP_SIDE_PANEL_ID);
    if (!el) {
        el = document.createElement('div');
        el.id = BLIP_SIDE_PANEL_ID;
        document.body.appendChild(el);
    }
    return el;
}

function getCalendarMirrorDimensions() {
    const viewportWidth = Math.max(320, window.innerWidth || document.documentElement?.clientWidth || 1200);
    const viewportHeight = Math.max(420, window.innerHeight || document.documentElement?.clientHeight || 840);
    const isCompactViewport = viewportWidth <= 900;
    const width = isCompactViewport
        ? Math.max(320, viewportWidth - 8)
        : Math.max(920, Math.min(1360, viewportWidth - 12));
    const height = isCompactViewport
        ? Math.max(420, Math.min(viewportHeight - 8, Math.round(viewportHeight * 0.97)))
        : Math.max(700, Math.min(940, viewportHeight - 12));
    return { width, height };
}

/** Full-screen centered layout; replaces all inline styles on the host. */
function applyOpenLayoutCssText(el) {
    const { width, height } = getCalendarMirrorDimensions();
    el.style.cssText = [
        'position:fixed',
        'z-index:1200',
        'left:50%',
        'top:47%',
        'right:auto',
        'bottom:auto',
        'transform:translate(-50%,-50%)',
        `width:${width}px`,
        `height:${height - 14}px`,
        `max-width:${width}px`,
        `max-height:${height}px`,
        'min-width:320px',
        'min-height:420px',
        'padding:0',
        'margin:0',
        'border-radius:32px',
        'overflow:hidden',
        'display:block',
        'box-sizing:border-box',
        'color:#e5eefc',
        'font-family:Inter,system-ui,sans-serif',
        'background:transparent',
        'border:none',
        'box-shadow:none',
        'visibility:visible',
        'opacity:1',
        'pointer-events:auto'
    ].join(';');
}

/** Restore the small default tool panel shape for notes/timer/etc. after calendar closes. */
function applyClosedCompactReset(el) {
    el.style.cssText = [
        'position:fixed',
        'z-index:1200',
        'top:120px',
        'left:auto',
        'right:32px',
        'bottom:auto',
        'transform:none',
        'width:280px',
        'height:340px',
        'padding:12px',
        'border-radius:12px',
        'overflow:auto',
        'display:none',
        'box-sizing:border-box',
        'background:rgba(10,10,30,0.96)',
        'border:1px solid rgba(99,102,241,0.4)',
        'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
        'color:#e5eefc',
        'font-family:Inter,system-ui,sans-serif'
    ].join(';');
}

/**
 * Mount or refresh the calendar agenda in #blip-side-panel.
 * @param {string} bodyHtml - trusted HTML (same contract as previous renderActionInSidePanel)
 * @returns {HTMLElement}
 */
export function mountCalendarAgendaPanel(bodyHtml) {
    const el = ensureHost();
    el.classList.remove(
        'blip-video-big',
        'blip-side-panel-workspace',
        'blip-side-panel-centered',
        'blip-calendar-orb',
        'blip-gmail-dock',
        'blip-telegram-dock'
    );
    el.classList.add(BLIP_CALENDAR_MIRROR_CLASS);
    el.dataset.panelAction = 'calendarAgenda';
    delete el.dataset.youtubeLibraryOnly;
    el.querySelectorAll('.blip-workspace-dock').forEach((node) => node.remove());

    applyOpenLayoutCssText(el);

    const safe = bodyHtml && String(bodyHtml).trim()
        ? bodyHtml
        : '<p style="margin:8px 0 0 0;color:#a0a0a8;">No calendar items ready yet.</p>';

    el.innerHTML = `
        <button type="button" aria-label="Close calendar" class="blip-calendar-mirror-close">×</button>
        <div class="blip-calendar-mirror-frame">
            <div class="blip-calendar-mirror-body">${safe}</div>
        </div>
    `;
    return el;
}

/**
 * @returns {boolean} true if a visible calendar panel was closed
 */
export function closeCalendarAgendaPanelUi() {
    const el = document.getElementById(BLIP_SIDE_PANEL_ID);
    if (!el) return false;
    if (!el.classList.contains(BLIP_CALENDAR_MIRROR_CLASS)) return false;
    if (el.style.display === 'none') return false;

    el.innerHTML = '';
    el.classList.remove(BLIP_CALENDAR_MIRROR_CLASS, 'blip-calendar-orb', 'blip-side-panel-centered');
    applyClosedCompactReset(el);
    return true;
}

/** Used by the 📅 button: calendar open and on-screen with real size. */
export function isCalendarAgendaDomVisible() {
    const el = document.getElementById(BLIP_SIDE_PANEL_ID);
    if (!el || el.style.display === 'none') return false;
    if (!el.classList.contains(BLIP_CALENDAR_MIRROR_CLASS)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
}
