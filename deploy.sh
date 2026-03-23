#!/bin/bash
set -e

# Configuration
REMOTE_USER="joyandart_gmail_com"
REMOTE_HOST="34.72.74.160"
REMOTE_PATH="/var/www/blip-ai"

echo "🚀 Starting Deployment for Blip-AI..."

# 1. Clean and Build
echo "🧹 Cleaning and building frontend..."
rm -rf dist
npm run build

# 2. Upload to server
echo "📦 Uploading to server ($REMOTE_HOST)..."
scp -r dist/* ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/

echo "✨ Deployment successful! Your updates are now live at http://blipai.es"
