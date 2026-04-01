# Blip workspace reference (Antigravity / agent IDEs)

Open the **`blip-ai`** repository root as the project workspace so imports and scripts resolve.

## Repository

- **Remote:** https://github.com/Aztecbird/blip-ai.git
- **Clone path (example):** `/Users/pabloarellano/Desktop/blip-ai`

## Tracked layout (high signal)

| Area | Path |
|------|------|
| Frontend (Vite, voice, UI) | `src/` |
| Local Node backends | `server/` |
| Tests | `tests/` |
| Dev scripts | `start-dev.sh`, `blip-stack.sh`, `package.json`, `vite.config.js` |
| Environment template | `.env.local.example` |
| Optional Kokoro TTS | `kokoro_server.py`, `kokoro_env/` |
| Overview | `README.md` |

## Local-only (not in Git; normal for dev)

| Path | Role |
|------|------|
| `.env.local` | Secrets and feature toggles (from `.env.local.example`) |
| `.blip-data/` | OAuth refresh data, hub files, **`logs/`** |
| `node_modules/` | After `npm install` |

## One-line summary

Blip is a local-first voice assistant: Vite app in `src/`, backends on `127.0.0.1` under `server/` (Calendar, Gmail, Telegram, media, Gemini proxy, etc.); configure with `.env.local`; persistent runtime under `.blip-data/`; local dev: `npm run dev`.
