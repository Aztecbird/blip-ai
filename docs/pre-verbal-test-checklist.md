# Pre–verbal test checklist

Run these **before** you do voice-command smoke tests so you’re not blocked by environment or config.

---

## 1. Automated

- [ ] **Tests**  
  `npm test` — all tests pass (reasoning, web, timer integration, notes integration).

- [ ] **Build**  
  `npm run build` — completes without errors.

---

## 2. Environment

- [ ] **Dev server**  
  `npm run dev` — app loads; no red errors in the browser console on first load.

- [ ] **Mic**  
  Grant microphone when prompted (or ensure it’s already allowed).  
  If you use **Kokoro**: ensure the Kokoro server is running at `http://127.0.0.1:8765` if you want that engine.

- [ ] **HTTPS / localhost**  
  Speech recognition usually needs a secure context (https or localhost).  
  If testing on a non-secure URL, mic may not work.

---

## 3. Optional API keys (graceful without them)

These are **optional** for many flows; Blip should degrade instead of crashing:

- **Gemini API key** (Settings) — needed for “Hello Blip”, search, explanations. Without it, those may fail or show a message.
- **YouTube API key** (Settings) — improves “play X on YouTube” (correct video in panel). Without it, you may get “add key for correct video in panel” and a manual search link.
- **Weather API key** (Settings) — OpenWeather for “weather in Madrid”. Without it, Blip falls back to wttr.in.
- **Google Calendar** — only if you’ll test calendar voice commands; needs client ID and auth.

You can still run most of the smoke checklist without any keys; just expect some commands to return “no key” or fallback behavior.

---

## 4. LocalStorage / state

- [ ] **Corrupt state**  
  If the app behaves oddly (e.g. wrong mode, panels stuck), try:  
  DevTools → Application → Local Storage → clear for this origin, then reload.

- [ ] **Calendar tokens**  
  If you use calendar: ensure `.blip-data/google-calendar-tokens.json` is **not** committed (in `.gitignore`).  
  For verbal tests you don’t need calendar unless you’re testing those commands.

---

## 5. Quick in-browser checks (before saying “Hey Blip”)

- [ ] **UI**  
  Blip face, “Ask Blip” button, transcript area, and mini-actions (notes, calendar, etc.) are visible.

- [ ] **Wake**  
  If Blip is “asleep”, say “Hey Blip” or click the button once so the app is in a listening state before testing other commands.

- [ ] **Console**  
  Leave DevTools console open during verbal tests; note any new errors when a command fails.

---

## 6. Order suggestion for verbal tests

1. **Core / wake** — “Hey Blip”, “Go to sleep”, “Wake up”, “Close everything”.
2. **Speech** — “Hello Blip”, “What time is it?” (confirms mic + reply).
3. **Timers** — “Set a timer for 10 seconds” → wait for fire → confirm side panel opens with “Silence Alarm”.
4. **Notes** — “Take note buy milk”, “Open notes”, “Clear notes”.
5. Then continue with the rest of [voice-command-smoke-checklist.md](./voice-command-smoke-checklist.md).

---

*After this, you’re ready for verbal tests.*
