# Blip Calendar Voice – Debugging Report

**Focus:** `src/main.js` (and `src/style.css` where relevant).  
**No code rewritten;** this is a factual trace and minimal-fix proposal.

---

## 1. Voice command: "show me day 14"

### 1.1 Command path

- **Entry:** `handleCommand(cmd)` (from voice `result.isFinal` → `handleCommand(result.text)` around **1694–1706**).
- **Cmd used in handlers:** `cmd` is the transcript; if it contains "hey blip", the part after "hey blip" is used (**3912–3914**).
- **Calendar branch:** `getCalendarAgendaVoiceRequest(cmd)` at **4540**; if non-null, **4543–4550**: `showCalendarOverview(calendarAgendaRequest)` then `passiveReply('', 'happy', result?.extraHtml || '')`.

### 1.2 What `getCalendarAgendaVoiceRequest("show me day 14")` returns

- **Location:** **6197–6231**.
- **Input:** `lower = sanitizeVoiceQuery(normalizeVoiceTokens(cmd))` (**6199**). For "show me day 14" this remains effectively "show me day 14".
- **Guards:**
  - `hasCalendarIntent` = `/\b(calendar|schedule|events?|agenda)\b/.test(lower)` → **false** for "show me day 14".
  - `directDateOpenIntent` = `/\b(show|open|display|view|go to|goto)\b/.test(lower) && (/\bday\s+\d{1,2}\b/.test(lower) || ...)` → **true**.
  - First return guard: `if (!hasCalendarIntent && !explicitViewMatch && !directDateOpenIntent) return null` → we **do not** return null (**6203**).
  - Second: `if (!explicitViewMatch && !/\b(show|open|...)\b/.test(lower)) return null` → "show" matches, we **do not** return null (**6204**).
- **Date:** `explicitCommandDate = getCalendarDateFromCommand(lower, ...)` (**6217**).  
  `parseCalendarDayNumberFromText("show me day 14")` matches `\bday\s+(\d{1,2})\b` → **14** (**6672–6676**).  
  `resolveCalendarSelectedDate(14, request)` → date for **day 14 of current month** (**6655–6662**).
- **Branch taken:** **6218**: `if (!explicitViewMatch && explicitCommandDate && /\b(show|open|...)\b/.test(lower) && !(/\bweek\b|\bmonth\b/.test(lower)))` → **true**.
- **Return value (factual shape):**
  - `label`: `anchor.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })` (e.g. `"March 14"`).
  - `view`: **`'day'`**
  - `anchorDate`, `timeMin`, `timeMax`, `maxResults: 24`, **`autoJump: false`**

So for the exact string `"show me day 14"`, the function **should** return a day-view request with `view: 'day'` and `autoJump: false`.  
**Reliability risk:** If STT returns something like "show me the 14th" or "show march 14", `parseCalendarDayNumberFromText` does **not** match `\bday\s+(\d{1,2})\b`, so the direct-date path might not run; other parsers (`parseMonthDayReferenceFromText`, `parseVoiceDateFromText`) may or may not return a date. So variance in **transcription** can make the day-view path not run.

### 1.3 What `showCalendarOverview(...)` receives and what `panelRequest` becomes

- **Called at:** **4544** with `calendarAgendaRequest` (the return value above).
- **Inside `showCalendarOverview` (**7301–7310**):**
  - `panelState = getCalendarPanelState(request)` (**7302**).
  - **getCalendarPanelState (**6562–6615**):**  
    `explicitMode = ['day','week','month'].includes(request.view || request.mode) ? (request.view || request.mode) : ''` → with `request.view === 'day'`, **`explicitMode = 'day'`**.  
    `mode = explicitMode || (...)` → **`mode = 'day'`**. So `panelState.view === 'day'` and day range is one day.
  - **panelRequest:** `panelRequest = { ...request, view: panelState.view, anchorDate: panelState.anchorDate.toISOString(), timeMin, timeMax, maxResults }` (**7303–7310**) → **`panelRequest.view === 'day'`**, and `state.activeCalendarViewRequest = panelRequest` (**7311**).
- So **panelRequest** keeps **view: 'day'** and is stored in state. No later line in this function overwrites `panelRequest.view` for this call.

### 1.4 Does `autoJump` change behavior?

- **Relevant block:** **7366–7375** (and same in catch **7419–7428**):  
  `if (!visibleEvents.length && panelState.view !== 'day' && request.autoJump !== false)` then optionally `return showCalendarOverview({ ...panelRequest, anchorDate: nextEvent.start, autoJump: false })`.  
- For "show me day 14", **panelState.view === 'day'** and **request.autoJump === false**, so this block is **not** entered. So **autoJump does not change behavior** for this command; day view is not replaced by a jump to next event.

### 1.5 Does `renderActionInSidePanel` re-render a different panel after day view opens?

- **Flow:** `showCalendarOverview` does a single **renderActionInSidePanel({ action: 'calendarAgenda', tool_params: { title, html: buildCalendarAgendaHtml(..., panelRequest) }, text })` in the path that runs (**7325** not connected, **7377** connected success, **7430** auth retry success, **7444** auth retry cached).
- **buildCalendarAgendaHtml (**6902–6946**):** Uses `getCalendarPanelState(request)` again with the same `request` (i.e. `panelRequest`), so **panelState.view** is still **'day'** and body is **buildCalendarDayHtml(...)**. So the panel content is day view.
- **Conclusion:** There is no second, conflicting `renderActionInSidePanel` from this voice path that would override day view with another view. The only way the visible view could change after opening is:
  - User clicks Day/Week/Month or prev/next in the panel (**8721–8748**), which call `showCalendarOverview` again with a new `view`/request.
  - Some **other** code path (e.g. another voice command or chat action) calls `showCalendarOverview` or `renderActionInSidePanel` with a different request.

### 1.6 Possible causes for "day view not staying reliably"

- **STT variance:** "show me the 14th" / "show march 14" etc. may not hit the same branch; then either no calendar request or a different request (e.g. default "upcoming" with week).
- **Fallback in getCalendarPanelState:** If for any reason `request.view` were missing or not `'day'`, then **6565–6568** would use `label` or **`normalizeCalendarDisplayMode(state.calendarDisplayMode)`**. So a stale **state.calendarDisplayMode** (e.g. `'week'`) could force week view. That would require `request.view` to be lost before `getCalendarPanelState(request)` (e.g. if a different caller passed an incomplete request). From the voice path above, `request.view` is set.
- **Duplicate final results:** If the recognition engine fires `isFinal` twice for the same utterance, `handleCommand` could run twice; the second run could hit a different branch (e.g. no calendar request, or a generic reply) and not open calendar, or open with a different request.

---

## 2. Voice command: "close everything"

### 2.1 Command path

- **Detection:** **3943** `systemCmd = getSystemVoiceCommand(cmd)`.
- **getSystemVoiceCommand (**7753–7790**):** Uses `trimmed` (lower, optional "hey blip" removed) and `stripped` (further polite-word stripping).  
  **7780:** `/\b(close|hide|exit|dismiss)\s+(everything|all(?:\s+panels?)?|all\s+windows?)\b/.test(trimmed)` → for "close everything" this is **true** → returns **`'closeAll'`** (unless "go to sleep" etc. is also present, then `'closeAllSleep'`).
- **Handler (**3951–3955**):**  
  `dismissActiveAlert({ resumeListening: false });`  
  `closeEverythingPanels();`  
  `await quickReply('Everything closed.', 'happy');`  
  `return;`  
  So **no** calendar or other panel logic runs after this.

### 2.2 What `closeEverythingPanels()` changes

- **Location:** **3372–3419**.
- **State:** Sets `state.currentMode = 'core'`, `state.isMediaStripOpen = false`, `state.videoBigMode = false`, `state.pendingYouTubeAction = null`, **`state.activeCalendarViewRequest = null`** (**3381**).
- **DOM:** Hides hub, cart, map, chart, underTheHood, media, mediaStrip; **side panel:** **3394–3410** – `sidePanel.innerHTML = ''`, **`sidePanel.style.display = 'none'`**, removes classes `blip-video-big`, `blip-side-panel-centered`, **`blip-calendar-orb`**, resets inline styles (size, position, etc.).
- So panels and calendar state are cleared and the side panel is hidden and emptied.

### 2.3 Does anything after `closeEverythingPanels()` reopen UI or restore old state?

- **In this path:** Only **quickReply('Everything closed.', 'happy')** runs (**3954**).  
  **quickReply (**3918–3927**):** Sets `transcriptText.innerHTML = ...`, pushes history, sets emotion/persona, **speakWithGuard(message, emotion)**, then optionally **startListeningLoop()**. It does **not** call `renderActionInSidePanel` or touch the side panel.
- **dismissActiveAlert (**3558–3585**):** Clears `state.activeAlert`, stops alarm, updates timer corner, may call `startListeningLoop()`. It does **not** show or render the side panel.
- So in the **synchronous** flow, nothing after `closeEverythingPanels()` reopens the panel or restores calendar state.

### 2.4 Why something might still "persist" or "reopen"

- **Calendar orb close button (**8716–8718**):** The × button only does `sidePanel.style.display = 'none'`. It does **not** set `state.activeCalendarViewRequest = null`. So if the user closed the calendar with × earlier, state still held the last request; that wouldn’t by itself reopen after "close everything" because `closeEverythingPanels()` does set `state.activeCalendarViewRequest = null`.
- **Other UI:** "Something persists" could be another surface (e.g. transcript area, chart container, map) if a bug left one visible, or if the user refers to a different panel. **closeEverythingPanels** hides the main containers; worth confirming in UI which element looks "still open."
- **Async / re-entry:** If any async callback (e.g. from a previous operation, or from `speakWithGuard`/speech end) called `renderActionInSidePanel` or `showCalendarOverview` **after** "close everything" had run, that would show the panel again. There is no such path in the code we traced for the close handler itself; the only way is another code path (e.g. action handler, connect-calendar success, or a duplicate voice handling) invoking panel/calendar logic later.
- **Mis-recognition:** If "close everything" is not recognized (e.g. STT says "close it all" or "close all" with different spacing), `getSystemVoiceCommand` might not match; then the command falls through to later handlers or the generic AI path, which might open or re-open a panel.

---

## 3. Suggested runtime verification (temporary logs)

Add these temporarily to confirm exact values (remove after debugging).

```javascript
// In getCalendarAgendaVoiceRequest, before return (e.g. after line 6230):
console.log('[DEBUG getCalendarAgendaVoiceRequest] cmd=', cmd, 'returned', { label, view: 'day', anchorDate, autoJump: false });

// At start of showCalendarOverview (after line 7302):
console.log('[DEBUG showCalendarOverview] request=', JSON.stringify(request), 'panelState.view=', panelState.view, 'panelRequest.view=', panelRequest?.view || request?.view);

// At start of closeEverythingPanels (after line 3372):
console.log('[DEBUG closeEverythingPanels] before: activeCalendarViewRequest=', state.activeCalendarViewRequest != null);
// At end of closeEverythingPanels (before return true):
console.log('[DEBUG closeEverythingPanels] after: activeCalendarViewRequest=', state.activeCalendarViewRequest);
```

Also log when `renderActionInSidePanel` is called with `action === 'calendarAgenda'` (e.g. at **8766**) with `parsedResponse.tool_params` (or a shallow copy) to confirm which view is being rendered each time.

---

## 4. Minimal fix proposals

### 4.1 "Show me day 14" – stay in single-day view reliably

- **Harden parsing:** Extend "day N" handling so that phrases like "show me the 14th" or "show the 14th" also produce a day request. For example, in **getCalendarAgendaVoiceRequest**, also parse a pattern like `\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b` in a date-open context and pass that day number into the same resolution (e.g. `resolveCalendarSelectedDate`) so a single-day request with `view: 'day'` and `autoJump: false` is returned.
- **Defensive view in getCalendarPanelState:** When `request` has an explicit date (e.g. `timeMin`/`timeMax` spanning one day) but `request.view` is missing, infer `'day'` instead of falling back to `state.calendarDisplayMode`, so a slightly malformed request still shows day view (optional; only if you see `request.view` missing in logs).

### 4.2 "Close everything" – ensure full close and nothing reopens

- **Calendar orb close button:** In **8716–8718**, when the user clicks × on the calendar panel, also clear calendar state so it matches "close everything" behavior: e.g. set `state.activeCalendarViewRequest = null` (and optionally call a small helper that only clears calendar state + hides panel, to avoid duplication with `closeEverythingPanels`).
- **Verify no re-open:** Add a temporary log after `closeEverythingPanels()` and inside any code that calls `renderActionInSidePanel` or sets `sidePanel.style.display = 'block'`, to confirm nothing runs after "close everything" that could re-show the panel. If you find such a path (e.g. from action handlers or connect-calendar), guard it with "only if panel was intended to be visible" or "don’t reopen if we just closed everything."

---

## 5. File/line reference summary

| Topic | File | Lines |
|-------|------|--------|
| handleCommand entry, calendar branch | main.js | 1694–1706, 3912–3914, 4539–4550 |
| getCalendarAgendaVoiceRequest | main.js | 6197–6314 (day path 6218–6231) |
| getCalendarPanelState (view resolution) | main.js | 6562–6615 |
| showCalendarOverview, panelRequest, autoJump | main.js | 7301–7462 (7366–7375, 7419–7428) |
| renderActionInSidePanel, calendarAgenda | main.js | 8766–8838 |
| buildCalendarAgendaHtml (day vs week) | main.js | 6902–6946 |
| getSystemVoiceCommand, close everything | main.js | 7753–7790 (7780–7781) |
| closeEverythingPanels | main.js | 3372–3419 |
| closeAll handler, quickReply | main.js | 3951–3955, 3918–3927 |
| Calendar orb close button | main.js | 8715–8718 |

No changes in **style.css** are required for the behaviors traced above; CSS only affects how the panel looks, not the command path or state.
