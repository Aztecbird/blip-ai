#!/bin/bash
# ── BLIP-GO: One-command startup ──────────────────────────────────────
# Usage: ./blip-go.sh
# This ensures all Docker backends have fresh env vars and Vite runs clean.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Loading environment from .env.local..."
set -a
source .env.local
set +a

echo "🧹 Cleaning up old containers to prevent port conflicts..."
docker ps -a --filter "name=blip-ai" -q | xargs -r docker rm -f 2>/dev/null || true
docker ps -a --filter "name=scratch" -q | xargs -r docker rm -f 2>/dev/null || true
docker compose down --remove-orphans 2>/dev/null || true

echo "🐳 Rebuilding Docker backends with fresh env vars..."
docker compose up -d --build

echo "⏳ Waiting for backends to boot..."
sleep 5

# Quick health checks
echo "🩺 Health checks:"
for svc in "8787:Calendar" "8788:Gmail" "8789:Telegram" "8791:Media" "8792:Weather"; do
    port="${svc%%:*}"
    name="${svc##*:}"
    if curl -s --max-time 2 "http://localhost:$port" > /dev/null 2>&1; then
        echo "   ✅ $name (port $port)"
    else
        echo "   ⚠️  $name (port $port) — not responding yet, may need a moment"
    fi
done

echo ""
echo "🚀 Starting Vite dev server..."
echo "   Open http://localhost:5173/blip-ai/ in your browser"
echo ""
npm run dev
