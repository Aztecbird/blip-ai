#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/.blip-data/logs"
mkdir -p "$LOG_DIR"

if [ -f "$ROOT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.local"
  set +a
fi

BLIP_ENABLE_KOKORO="${BLIP_ENABLE_KOKORO:-1}"
BLIP_ENABLE_CALENDAR_BACKEND="${BLIP_ENABLE_CALENDAR_BACKEND:-1}"
BLIP_ENABLE_GMAIL_BACKEND="${BLIP_ENABLE_GMAIL_BACKEND:-1}"
BLIP_ENABLE_TELEGRAM_BACKEND="${BLIP_ENABLE_TELEGRAM_BACKEND:-}"
BLIP_ENABLE_MEDIA_BACKEND="${BLIP_ENABLE_MEDIA_BACKEND:-1}"
BLIP_ENABLE_CARE_CAM_BACKEND="${BLIP_ENABLE_CARE_CAM_BACKEND:-1}"
BLIP_ENABLE_HUB_BACKEND="${BLIP_ENABLE_HUB_BACKEND:-1}"
BLIP_ENABLE_OPENAI_IMAGE_BACKEND="${BLIP_ENABLE_OPENAI_IMAGE_BACKEND:-0}"
BLIP_ENABLE_WEATHER_BACKEND="${BLIP_ENABLE_WEATHER_BACKEND:-1}"
BLIP_ENABLE_GEMINI_BACKEND="${BLIP_ENABLE_GEMINI_BACKEND:-1}"
BLIP_FORCE_FRONTEND_RESTART="${BLIP_FORCE_FRONTEND_RESTART:-0}"

if [ -z "$BLIP_ENABLE_TELEGRAM_BACKEND" ]; then
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    BLIP_ENABLE_TELEGRAM_BACKEND="1"
  else
    BLIP_ENABLE_TELEGRAM_BACKEND="0"
  fi
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PIDS=()

port_is_open() {
  local port="$1"
  lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
}

listeners_on_port() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

stop_port_listeners() {
  local port="$1"
  local pids
  pids="$(listeners_on_port "$port")"
  if [ -z "$pids" ]; then
    return 0
  fi

  echo -e "${BLUE}■ Restarting frontend on port ${port}...${NC}"
  kill $pids >/dev/null 2>&1 || true

  for _ in $(seq 1 20); do
    if ! port_is_open "$port"; then
      return 0
    fi
    sleep 0.25
  done

  kill -9 $pids >/dev/null 2>&1 || true
}

start_bg() {
  local name="$1"
  local port="$2"
  local logfile="$3"
  shift 3

  if port_is_open "$port"; then
    echo -e "${YELLOW}↺ Reusing ${name} on port ${port}.${NC}"
    return 0
  fi

  echo -e "${BLUE}▶ Starting ${name} on port ${port}...${NC}"
  (
    cd "$ROOT_DIR"
    "$@"
  ) >"$logfile" 2>&1 &
  local pid=$!
  PIDS+=("$pid")
  sleep 0.8
  echo -e "${GREEN}✓ ${name} started. Log: ${logfile}${NC}"
}

cleanup() {
  if [ "${#PIDS[@]}" -gt 0 ]; then
    echo
    echo -e "${BLUE}Stopping local Blip services...${NC}"
    for pid in "${PIDS[@]}"; do
      kill "$pid" >/dev/null 2>&1 || true
    done
  fi
}

trap cleanup EXIT INT TERM

echo -e "${BLUE}Blip AI local dev stack${NC}"
echo -e "${BLUE}Root: ${ROOT_DIR}${NC}"

if [ "$BLIP_ENABLE_CALENDAR_BACKEND" = "1" ]; then
  start_bg "Google Calendar backend" "${GOOGLE_CALENDAR_BACKEND_PORT:-8787}" "$LOG_DIR/google-calendar-backend.log" npm run dev:calendar-backend
fi

if [ "$BLIP_ENABLE_GMAIL_BACKEND" = "1" ]; then
  start_bg "Google Gmail backend" "${GOOGLE_GMAIL_BACKEND_PORT:-8788}" "$LOG_DIR/google-gmail-backend.log" npm run dev:gmail-backend
fi

if [ "$BLIP_ENABLE_TELEGRAM_BACKEND" = "1" ]; then
  start_bg "Telegram backend" "${TELEGRAM_BACKEND_PORT:-8789}" "$LOG_DIR/telegram-backend.log" npm run dev:telegram-backend
fi

if [ "$BLIP_ENABLE_MEDIA_BACKEND" = "1" ]; then
  start_bg "Media actions backend" "${MEDIA_ACTIONS_BACKEND_PORT:-8791}" "$LOG_DIR/media-actions-backend.log" npm run dev:media-backend
fi

if [ "$BLIP_ENABLE_CARE_CAM_BACKEND" = "1" ]; then
  start_bg "Care Cam backend" "${CARE_CAM_BACKEND_PORT:-8794}" "$LOG_DIR/care-cam-backend.log" npm run dev:care-cam-backend
fi

if [ "$BLIP_ENABLE_HUB_BACKEND" = "1" ]; then
  start_bg "Hub backend" "${HUB_BACKEND_PORT:-8795}" "$LOG_DIR/hub-backend.log" npm run dev:hub-backend
fi

if [ "$BLIP_ENABLE_OPENAI_IMAGE_BACKEND" = "1" ]; then
  start_bg "OpenAI image backend" "${OPENAI_IMAGE_BACKEND_PORT:-8790}" "$LOG_DIR/openai-image-backend.log" npm run dev:openai-image-backend
fi

if [ "$BLIP_ENABLE_WEATHER_BACKEND" = "1" ]; then
  start_bg "Weather backend" "${WEATHER_BACKEND_PORT:-8792}" "$LOG_DIR/weather-backend.log" npm run dev:weather-backend
fi

if [ "$BLIP_ENABLE_GEMINI_BACKEND" = "1" ]; then
  start_bg "Gemini backend" "${GEMINI_BACKEND_PORT:-8793}" "$LOG_DIR/gemini-backend.log" npm run dev:gemini-backend
fi

if [ "$BLIP_ENABLE_KOKORO" = "1" ]; then
  if port_is_open "${KOKORO_PORT:-8765}"; then
    echo -e "${YELLOW}↺ Reusing Kokoro on port ${KOKORO_PORT:-8765}.${NC}"
  elif [ -x "$ROOT_DIR/kokoro_env/bin/python" ]; then
    echo -e "${BLUE}▶ Starting Kokoro TTS on port ${KOKORO_PORT:-8765}...${NC}"
    (
      cd "$ROOT_DIR"
      "$ROOT_DIR/kokoro_env/bin/python" "$ROOT_DIR/kokoro_server.py"
    ) >"$LOG_DIR/kokoro.log" 2>&1 &
    PIDS+=("$!")
    sleep 0.8
    echo -e "${GREEN}✓ Kokoro started. Log: $LOG_DIR/kokoro.log${NC}"
  else
    echo -e "${YELLOW}⚠ Kokoro skipped: missing kokoro_env. Run ./setup-blip.sh once or create the venv manually.${NC}"
  fi
fi

echo
echo -e "${GREEN}Frontend:${NC} http://localhost:5173"
echo -e "${GREEN}Logs:${NC} $LOG_DIR"
echo

if port_is_open 5173; then
  if [ "$BLIP_FORCE_FRONTEND_RESTART" = "1" ]; then
    stop_port_listeners 5173
    cd "$ROOT_DIR"
    exec npm run dev:web
  else
    echo -e "${YELLOW}Port 5173 is already in use. Reusing existing frontend.${NC}"
    echo -e "${YELLOW}If your edits don't show, restart Vite: BLIP_FORCE_FRONTEND_RESTART=1 bash ./start-dev.sh${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop the services started by this script.${NC}"
    wait
  fi
else
  cd "$ROOT_DIR"
  exec npm run dev:web
fi
