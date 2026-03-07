# Blip AI: Cloud Edition 🚀🤖

Blip is a tiny, ultra-expressive voice assistant with a modular brain. He can run locally via Ollama or live on the web via Google's Gemini 1.5/2.0 "Super Brain".

## ✨ New in Cloud Edition (v2.5)
- **Glassmorphism UI**: Beautiful, premium design that feels at home on any desktop.
- **Gemini Super Brain**: Vision-ready reasoning via Google's latest models.
- **Cloud Voice**: High-fidelity neural voices (Puck, Kore, etc.) that don't require local servers.
- **GitHub Independent**: Works out of the box when deployed to GitHub Pages!

## 🚀 Setup & Deployment

### 1. Local Development
1. Clone the repo.
2. Run `./setup-blip.sh` to install dependencies and start the local TTS server (Kokoro).
3. Visit `http://localhost:5173`.

### 2. Live GitHub Deployment
Blip is pre-configured for GitHub Pages:
- **Auto-Config**: It detects the live domain and switches to Gemini Brain and Voice automatically.
- **Gatekeeper**: Use the password `1234` in settings to unlock the master API key, or enter your own [Google AI Studio Key](https://aistudio.google.com/).

## 🛠️ Tech Stack
- **AI Brains**: Gemini 2.0 Flash (Cloud), Ollama (Local).
- **Voice Engines**: Gemini TTS (Cloud), Kokoro (Local Neural), Web Speech API (Browser).
- **Core**: Vite, Vanilla ES6+, CSS Glassmorphism.

---
Created with ❤️ for Pablo. 🍱✨🚀🎙️
