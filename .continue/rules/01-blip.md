---
name: Blip AI (this repo)
alwaysApply: true
description: Context and conventions for the blip-ai codebase; commit this file with the project.
---

# Blip AI — assistant context

You are working on **Blip AI** (`blip-ai`): a **local-first voice assistant**.

## Layout

- **Frontend:** Vite app under `src/` (ES modules). Dev server typically `http://localhost:5173`.
- **Backends:** Node servers under `server/` (Gmail, Google Calendar, Telegram, media actions, Gemini, weather, etc.). They talk to the browser via proxied `/api/...` in local dev.
- **Optional TTS:** `kokoro_server.py` (FastAPI) when that stack is enabled.
- **Local data:** OAuth refresh tokens and runtime files under `.blip-data/`; logs often under `.blip-data/logs/`.

## Security

- Never add API keys, OAuth client secrets, or tokens to frontend code or to git.
- Secrets belong in **`.env.local`** (see `.env.local.example`).
- Prefer backends bound to **`127.0.0.1`** unless the existing code intentionally does otherwise.

## How to change code

- Read neighboring files first; match existing import style, naming, and error handling.
- Prefer **small, focused** changes. Do not add new markdown/docs files unless the user asks.
- Tests: **`npm test`** (Node built-in runner, `tests/*.test.js`). After non-trivial edits, run or suggest tests.

## Dev commands

- Full stack: **`npm run dev`** (see `start-dev.sh` / `package.json` scripts).

## Style

- Be concise. If the request is ambiguous, state assumptions briefly and proceed.
