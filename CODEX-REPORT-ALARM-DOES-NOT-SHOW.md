# Codex Report: Alarm Does Not Show

**Project:** Blip AI  
**Issue:** When a timer/alarm fires, the alarm UI does not show (side panel never opens).  
**Scope:** `src/main.js` — timer fire path and side panel display.

---

## 1. Summary

When a countdown timer expires, Blip sets internal alarm state, plays sound, speaks the reminder, and updates the **timer corner** (small “ALARM” badge) and **countdown display**. The **side panel** that contains the full alarm UI (label, “Alarm ringing now”, and **“🔕 Silence Alarm”** button) is **never opened**. So the alarm “doesn’t show” in the sense that the main alarm panel is not visible to the user.

---

## 2. Root Cause

The timer **fire** path (the `setTimeout` callback inside `setBlipTimer`) never opens the side panel or tells the UI to show the timer panel.

- **What the fire path does (lines 10398–10435):**
  - Wakes Blip if inactive.
  - Calls `dismissActiveAlert({ resumeListening: false, clearVisual: true })` (clears any previous alert).
  - Sets `state.activeAlert`, calls `showAlertDisplay(text, 45000)`.
  - Updates talk button to “Alarm”, persona to “warning”, countdown display, timer corner, starts `startAlarmSoundLoop()`, and speaks the reminder text.
- **What it does not do:**
  - It does **not** call `renderActionInSidePanel({ action: 'timer', ... })`.
  - It does **not** set `sidePanel.style.display = 'block'` or `state.currentSidePanelAction = 'timer'`.

The **timer side panel** is only shown when `renderActionInSidePanel` is called with `action: 'timer'` (see **10597–10646**, **10713–10727**). That sets `state.currentSidePanelAction = 'timer'`, shows the panel, and builds the body (including the “Silence Alarm” button when `state.activeAlert` is set) via `startTimerPanelTicker` → `syncTimerSidePanel` → `renderTimerPanelBody`. So when the alarm fires, `state.activeAlert` is set and the **content** for the alarm panel is correct, but the **panel is never shown** because nothing in the fire path opens it.

---

## 3. Code References

| What | File | Lines |
|------|------|--------|
| Timer fire callback (sets activeAlert, sound, speech; no panel open) | main.js | 10398–10435 |
| showAlertDisplay (only countdown display + alertDisplay state) | main.js | 2277–2291 |
| renderCountdownDisplay (corner + countdown display; not side panel) | main.js | 2293–2326 |
| updateTimerCorner (shows “ALARM” in corner) | main.js | 4374–4394 |
| syncTimerSidePanel / renderTimerPanelBody (panel body + “Silence Alarm” button) | main.js | 4331–4330, 4272–4330 |
| syncTimerSidePanel bails if panel hidden or action !== 'timer' | main.js | 4334–4336, 4358 |
| renderActionInSidePanel (opens panel, sets currentSidePanelAction, timer case) | main.js | 10597–10646, 10713–10727 |
| dismissActiveAlert (clears alert, stops sound; does not show panel) | main.js | 4438–4464 |

---

## 4. Expected vs Actual

- **Expected:** When the alarm fires, the side panel opens (or is already open) and shows the timer panel with “Alarm ringing now” and a “Silence Alarm” button.
- **Actual:** Only the timer corner and countdown strip show “ALARM”/“READY”; the side panel stays closed (or shows a different action). The user has no visible alarm panel to dismiss from.

---

## 5. Suggested Fix

In the timer **fire** callback inside `setBlipTimer` (after setting `state.activeAlert` and calling `showAlertDisplay`, and before or after `startAlarmSoundLoop()`), open the timer side panel so the alarm UI is visible:

- Call **`renderActionInSidePanel({ action: 'timer', tool_params: {}, text: '' })`** so that:
  - `state.currentSidePanelAction` becomes `'timer'`,
  - The side panel is shown (`sidePanel.style.display = 'block'`),
  - The panel body is built by `startTimerPanelTicker` → `syncTimerSidePanel` → `renderTimerPanelBody`, which already shows the “Silence Alarm” button when `state.activeAlert` is set.

Optional: pass a short `text` (e.g. the reminder label) for the panel subtitle if desired.

No change is required in `dismissActiveAlert` or in the countdown/timer-corner logic for this specific “alarm doesn’t show” issue; the missing piece is solely opening the panel when the alarm fires.

---

## 6. File / Line Summary

| Topic | File | Lines |
|-------|------|--------|
| setBlipTimer + fire callback | main.js | 10395–10442 |
| showAlertDisplay | main.js | 2277–2291 |
| renderTimerPanelBody (alarm UI in panel) | main.js | 4272–4330 |
| syncTimerSidePanel / startTimerPanelTicker | main.js | 4331–4360 |
| renderActionInSidePanel, timer case | main.js | 10597–10646, 10713–10727 |
| dismissActiveAlert | main.js | 4438–4464 |

---

*Report generated for Codex — alarm does not show (side panel not opened on timer fire).*
