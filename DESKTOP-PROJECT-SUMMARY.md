# Blip Desktop: Polyphony Project Summary

This project has been upgraded to the **Polyphony Architecture (v2/v3)**. Here is where you can find everything and how to maintain it.

## 📍 Key Code Locations
- **The Brain**: `/src/blip-polyphony/`
  - Core Logic: `/src/blip-polyphony/core/`
  - Specialized Agents: `/src/blip-polyphony/agents/`
- **Main Loop**: `/src/main.js` (Integration happens in `handleCommand`)
- **Visuals (The Tower)**: `index.html` and `/src/blip-polyphony/ui/tower.css`

## 🛠️ How to Run Diagnostics
To verify that all components are correctly installed and connected:
1. Open terminal in `Desktop/blip-ai`
2. Run: `node diagnostic_desktop.js`

## 📚 Persistence (The Library)
Data is stored in the browser's `localStorage`:
- **Library Memory**: `blip_library_memory` (Facts, Habits, Preferences)
- **Conversation History**: `blip_conversation_history`

## 📡 Backend Requirements
Make sure the Gemini Proxy is running on **port 8793** for the agents to function.
Log location: `/.blip-data/logs/gemini-backend.log`
