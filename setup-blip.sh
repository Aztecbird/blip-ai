#!/bin/bash
# 🚀 Blip AI Unified Setup Script
set -e

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/kokoro_env"

echo -e "${BLUE}🚀 Starting Blip AI Setup...${NC}"

# 1. Install npm dependencies
echo -e "${BLUE}📦 Step 1: Installing frontend dependencies...${NC}"
npm install --prefix "$SCRIPT_DIR"

# 2. Check for Ollama
echo -e "${BLUE}🧠 Step 2: Checking Ollama...${NC}"
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Ollama is running.${NC}"
else
  echo -e "${YELLOW}⚠️  Ollama is NOT running. Please start the Ollama app!${NC}"
  echo -e "   If using the live GitHub version, run Ollama with CORS support:"
  echo -e "   ${BLUE}OLLAMA_ORIGINS=\"*\" ollama serve${NC}"
fi

# 2.5 Gemini Cloud Reminder
echo -e "${BLUE}☁️  Step 2.5: Gemini Cloud Brain Reminder...${NC}"
echo -e "   To use the Gemini 2.5 'Super Brain' (Cloud Engine):"
echo -e "   1. Ensure you have an API key from: ${BLUE}https://aistudio.google.com/${NC}"
echo -e "   2. Enter the key (or the gatekeeper pass '1234') in the Blip settings."

# 3. Set up Kokoro TTS in a virtual environment
echo -e "${BLUE}🎙️  Step 3: Setting up Kokoro TTS...${NC}"

if [ ! -d "$VENV_DIR" ]; then
  echo -e "⚙️  Creating Python virtual environment in $VENV_DIR..."
  python3 -m venv "$VENV_DIR"
fi

# Activate the venv
source "$VENV_DIR/bin/activate"

echo -e "⚙️  Ensuring Python packages are installed..."
pip install kokoro-onnx fastapi uvicorn numpy --quiet

# 4. Start Kokoro server if not already running
if curl -s http://127.0.0.1:8765/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Kokoro TTS server already running on port 8765.${NC}"
else
  echo -e "${BLUE}🎙️  Starting Kokoro TTS server...${NC}"
  # Run in background and redirect output to a log file
  python3 "$SCRIPT_DIR/kokoro_server.py" > "$SCRIPT_DIR/kokoro.log" 2>&1 &
  
  # Wait for it to start
  for i in {1..30}; do
    if curl -s http://127.0.0.1:8765/health > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Kokoro server is ready!${NC}"
      break
    fi
    if [ $i -eq 30 ]; then
      echo -e "${YELLOW}⚠️  Kokoro server taking a while to start (likely downloading model).${NC}"
      echo -e "   You can check progress in: ${BLUE}tail -f kokoro.log${NC}"
    fi
    sleep 2
  done
fi

deactivate

# 5. Start Blip
echo ""
echo -e "${GREEN}✨ Setup complete! Starting Blip Frontend...${NC}"
echo -e "🔗 Opening: ${BLUE}http://localhost:5173${NC}"
echo ""
npm run dev --prefix "$SCRIPT_DIR"
