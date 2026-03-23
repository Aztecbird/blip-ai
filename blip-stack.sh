#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$ROOT_DIR/.blip-data"
LOG_DIR="$DATA_DIR/logs"
RUN_DIR="$DATA_DIR/run"

mkdir -p "$LOG_DIR" "$RUN_DIR"

if [ -f "$ROOT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.local"
  set +a
fi

BLIP_ENABLE_KOKORO="${BLIP_ENABLE_KOKORO:-1}"
BLIP_ENABLE_CALENDAR_BACKEND="${BLIP_ENABLE_CALENDAR_BACKEND:-1}"
BLIP_ENABLE_GMAIL_BACKEND="${BLIP_ENABLE_GMAIL_BACKEND:-1}"
BLIP_ENABLE_MEDIA_BACKEND="${BLIP_ENABLE_MEDIA_BACKEND:-1}"
BLIP_ENABLE_OPENAI_IMAGE_BACKEND="${BLIP_ENABLE_OPENAI_IMAGE_BACKEND:-0}"
BLIP_ENABLE_WEATHER_BACKEND="${BLIP_ENABLE_WEATHER_BACKEND:-1}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
  cat <<'EOF'
Usage: bash ./blip-stack.sh <command> [service]

Commands:
  start      Start the detached Blip stack
  stop       Stop services started by this script
  restart    Restart services started by this script
  status     Show service status
  logs       Tail logs for all services or one service

Services:
  frontend
  calendar
  gmail
  media
  openai-image
  weather
  gemini
  kokoro
EOF
}

pid_file_for() {
  echo "$RUN_DIR/$1.pid"
}

log_file_for() {
  case "$1" in
    frontend) echo "$LOG_DIR/frontend.log" ;;
    calendar) echo "$LOG_DIR/google-calendar-backend.log" ;;
    gmail) echo "$LOG_DIR/google-gmail-backend.log" ;;
    media) echo "$LOG_DIR/media-actions-backend.log" ;;
    openai-image) echo "$LOG_DIR/openai-image-backend.log" ;;
    weather) echo "$LOG_DIR/weather-backend.log" ;;
    gemini) echo "$LOG_DIR/gemini-backend.log" ;;
    kokoro) echo "$LOG_DIR/kokoro.log" ;;
    *) echo "$LOG_DIR/$1.log" ;;
  esac
}

service_port() {
  case "$1" in
    frontend) echo "${BLIP_FRONTEND_PORT:-5173}" ;;
    calendar) echo "${GOOGLE_CALENDAR_BACKEND_PORT:-8787}" ;;
    gmail) echo "${GOOGLE_GMAIL_BACKEND_PORT:-8788}" ;;
    media) echo "${MEDIA_ACTIONS_BACKEND_PORT:-8791}" ;;
    openai-image) echo "${OPENAI_IMAGE_BACKEND_PORT:-8790}" ;;
    weather) echo "${WEATHER_BACKEND_PORT:-8792}" ;;
    gemini) echo "${GEMINI_BACKEND_PORT:-8793}" ;;
    kokoro) echo "${KOKORO_PORT:-8765}" ;;
    *) echo "" ;;
  esac
}

service_enabled() {
  case "$1" in
    frontend) return 0 ;;
    calendar) [ "$BLIP_ENABLE_CALENDAR_BACKEND" = "1" ] ;;
    gmail) [ "$BLIP_ENABLE_GMAIL_BACKEND" = "1" ] ;;
    media) [ "$BLIP_ENABLE_MEDIA_BACKEND" = "1" ] ;;
    openai-image) [ "$BLIP_ENABLE_OPENAI_IMAGE_BACKEND" = "1" ] ;;
    weather) [ "$BLIP_ENABLE_WEATHER_BACKEND" = "1" ] ;;
    gemini) [ "${BLIP_ENABLE_GEMINI_BACKEND:-1}" = "1" ] ;;
    kokoro) [ "$BLIP_ENABLE_KOKORO" = "1" ] ;;
    *) return 1 ;;
  esac
}

service_label() {
  case "$1" in
    frontend) echo "Frontend" ;;
    calendar) echo "Google Calendar backend" ;;
    gmail) echo "Google Gmail backend" ;;
    media) echo "Media actions backend" ;;
    openai-image) echo "OpenAI image backend" ;;
    weather) echo "Weather backend" ;;
    gemini) echo "Gemini backend" ;;
    kokoro) echo "Kokoro TTS" ;;
    *) echo "$1" ;;
  esac
}

port_is_open() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
}

pid_is_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

cleanup_stale_pidfile() {
  local service="$1"
  local pidfile
  pidfile="$(pid_file_for "$service")"

  if [ -f "$pidfile" ]; then
    local pid
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -z "$pid" ] || ! pid_is_running "$pid"; then
      rm -f "$pidfile"
    fi
  fi
}

start_service() {
  local service="$1"
  shift
  local port pidfile logfile
  port="$(service_port "$service")"
  pidfile="$(pid_file_for "$service")"
  logfile="$(log_file_for "$service")"
  touch "$logfile"

  if ! service_enabled "$service"; then
    echo -e "${YELLOW}↺ $(service_label "$service") disabled by env toggle.${NC}"
    return 0
  fi

  cleanup_stale_pidfile "$service"

  if [ -f "$pidfile" ]; then
    local pid
    pid="$(cat "$pidfile")"
    if pid_is_running "$pid"; then
      echo -e "${YELLOW}↺ $(service_label "$service") already running with PID ${pid}.${NC}"
      return 0
    fi
    rm -f "$pidfile"
  fi

  if [ -n "$port" ] && port_is_open "$port"; then
    echo -e "${YELLOW}↺ $(service_label "$service") already listening on port ${port}.${NC}"
    return 0
  fi

  echo -e "${BLUE}▶ Starting $(service_label "$service")...${NC}"
  (
    cd "$ROOT_DIR"
    nohup "$@" >>"$logfile" 2>&1 &
    echo $! >"$pidfile"
  )

  sleep 1

  if [ -f "$pidfile" ] && pid_is_running "$(cat "$pidfile")"; then
    echo -e "${GREEN}✓ $(service_label "$service") started. Log: ${logfile}${NC}"
    return 0
  fi

  echo -e "${RED}✗ $(service_label "$service") failed to start. Check ${logfile}.${NC}"
  return 1
}

stop_service() {
  local service="$1"
  local pidfile
  pidfile="$(pid_file_for "$service")"

  cleanup_stale_pidfile "$service"

  if [ ! -f "$pidfile" ]; then
    echo -e "${YELLOW}↺ $(service_label "$service") is not managed by this script.${NC}"
    return 0
  fi

  local pid
  pid="$(cat "$pidfile")"
  echo -e "${BLUE}■ Stopping $(service_label "$service") (PID ${pid})...${NC}"
  kill "$pid" >/dev/null 2>&1 || true

  for _ in $(seq 1 20); do
    if ! pid_is_running "$pid"; then
      rm -f "$pidfile"
      echo -e "${GREEN}✓ $(service_label "$service") stopped.${NC}"
      return 0
    fi
    sleep 0.25
  done

  kill -9 "$pid" >/dev/null 2>&1 || true
  rm -f "$pidfile"
  echo -e "${YELLOW}↺ $(service_label "$service") needed a force stop.${NC}"
}

status_service() {
  local service="$1"
  local port pidfile
  port="$(service_port "$service")"
  pidfile="$(pid_file_for "$service")"
  cleanup_stale_pidfile "$service"

  if [ -f "$pidfile" ]; then
    local pid
    pid="$(cat "$pidfile")"
    echo -e "${GREEN}running${NC}  $(service_label "$service") (PID ${pid}, port ${port:-n/a})"
    return 0
  fi

  if [ -n "$port" ] && port_is_open "$port"; then
    echo -e "${YELLOW}external${NC} $(service_label "$service") (port ${port} in use, not managed here)"
    return 0
  fi

  if service_enabled "$service"; then
    echo -e "${RED}stopped${NC}  $(service_label "$service")"
  else
    echo -e "${YELLOW}disabled${NC} $(service_label "$service")"
  fi
}

start_stack() {
  echo -e "${BLUE}Blip AI detached stack${NC}"
  echo -e "${BLUE}Root: ${ROOT_DIR}${NC}"

  start_service calendar npm run dev:calendar-backend
  start_service gmail npm run dev:gmail-backend
  start_service media npm run dev:media-backend
  start_service openai-image npm run dev:openai-image-backend
  start_service weather npm run dev:weather-backend
  start_service gemini npm run dev:gemini-backend

  if service_enabled kokoro && [ ! -x "$ROOT_DIR/kokoro_env/bin/python" ]; then
    echo -e "${YELLOW}⚠ Kokoro skipped: missing kokoro_env. Run ./setup-blip.sh once or create the venv manually.${NC}"
  else
    start_service kokoro "$ROOT_DIR/kokoro_env/bin/python" "$ROOT_DIR/kokoro_server.py"
  fi

  start_service frontend npm run dev:web -- --host 127.0.0.1 --port "${BLIP_FRONTEND_PORT:-5173}" --strictPort

  echo
  echo -e "${GREEN}Frontend:${NC} http://127.0.0.1:${BLIP_FRONTEND_PORT:-5173}/blip-ai/"
  echo -e "${GREEN}Logs:${NC} ${LOG_DIR}"
  echo -e "${GREEN}Status:${NC} bash ./blip-stack.sh status"
}

stop_stack() {
  stop_service frontend
  stop_service openai-image
  stop_service gemini
  stop_service weather
  stop_service media
  stop_service gmail
  stop_service calendar
  stop_service kokoro
}

status_stack() {
  status_service frontend
  status_service calendar
  status_service gmail
  status_service media
  status_service openai-image
  status_service weather
  status_service gemini
  status_service kokoro
}

logs_stack() {
  local service="${1:-all}"

  if [ "$service" = "all" ]; then
    touch \
      "$(log_file_for frontend)" \
      "$(log_file_for calendar)" \
      "$(log_file_for gmail)" \
      "$(log_file_for media)" \
      "$(log_file_for openai-image)" \
      "$(log_file_for weather)" \
      "$(log_file_for kokoro)"
    tail -n 40 -f \
      "$(log_file_for frontend)" \
      "$(log_file_for calendar)" \
      "$(log_file_for gmail)" \
      "$(log_file_for media)" \
      "$(log_file_for openai-image)" \
      "$(log_file_for weather)" \
      "$(log_file_for kokoro)"
    return 0
  fi

  touch "$(log_file_for "$service")"
  tail -n 80 -f "$(log_file_for "$service")"
}

COMMAND="${1:-status}"
ARG="${2:-}"

case "$COMMAND" in
  start)
    start_stack
    ;;
  stop)
    stop_stack
    ;;
  restart)
    stop_stack
    start_stack
    ;;
  status)
    status_stack
    ;;
  logs)
    logs_stack "$ARG"
    ;;
  *)
    usage
    exit 1
    ;;
esac
