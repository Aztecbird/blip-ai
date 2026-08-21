#!/bin/bash
set -e

# Configuration — override with env (e.g. GitHub Actions secrets) for CI deploys
REMOTE_USER="${REMOTE_USER:-joyandart_gmail_com}"
REMOTE_HOST="${REMOTE_HOST:-34.72.74.160}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/blip-ai}"
REMOTE_WEB_PATH="${REMOTE_WEB_PATH:-/var/www/blipai-es}"
REMOTE_NGINX_PATH="${REMOTE_NGINX_PATH:-/etc/nginx/sites-available/blipai-es}"
LOCAL_NGINX_CONFIG="${LOCAL_NGINX_CONFIG:-deploy/nginx/blipai-es.conf}"
BLIP_AUTH_FILE="${BLIP_AUTH_FILE:-}"
REMOTE_AUTH_PATH="${REMOTE_AUTH_PATH:-/etc/nginx/.htpasswd-blip}"

if [ -z "$BLIP_AUTH_FILE" ] || [ ! -s "$BLIP_AUTH_FILE" ]; then
    echo "Security stop: BLIP_AUTH_FILE must point to a non-empty htpasswd file."
    exit 1
fi

echo "🚀 Starting Full Deployment for Blip-AI (Frontend + Backend)..."

# 1. Build frontend (skip if already built in CI: DEPLOY_SKIP_BUILD=1)
if [ "${DEPLOY_SKIP_BUILD:-0}" != "1" ]; then
    echo "🧹 Building frontend..."
    npm run build
else
    echo "🧹 Skipping npm run build (DEPLOY_SKIP_BUILD=1)"
fi

# 2. Upload everything to server
# We exclude node_modules, .git, and .blip-data to keep it fast
echo "📦 Uploading project to server ($REMOTE_HOST)..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.blip-data' --exclude 'dist' --exclude '.env.local' \
      ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/

# 3. Upload built frontend into the live web root with sudo on the remote host
echo "📦 Uploading built frontend into live web root..."
tar -C ./dist -czf - index.html assets \
  | ssh ${REMOTE_USER}@${REMOTE_HOST} "sudo mkdir -p ${REMOTE_WEB_PATH}/assets && sudo tar -xzf - -C ${REMOTE_WEB_PATH}"

# 4. Install browser authentication before enabling the protected Nginx config.
echo "Installing private-site authentication..."
scp "$BLIP_AUTH_FILE" ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/.blip-auth.htpasswd
ssh ${REMOTE_USER}@${REMOTE_HOST} "sudo install -o root -g www-data -m 640 ${REMOTE_PATH}/.blip-auth.htpasswd ${REMOTE_AUTH_PATH} && rm -f ${REMOTE_PATH}/.blip-auth.htpasswd"

# 5. Install the tracked Nginx config so proxy fixes do not drift on the VM
echo "🛠️ Installing live Nginx config..."
scp ${LOCAL_NGINX_CONFIG} ${REMOTE_USER}@${REMOTE_HOST}:/tmp/blipai-es.conf
ssh ${REMOTE_USER}@${REMOTE_HOST} "sudo cp /tmp/blipai-es.conf ${REMOTE_NGINX_PATH} && sudo nginx -t && sudo systemctl reload nginx"

# 6. Restart Docker services on server
echo "🔄 Restarting Docker stack on server (Full refresh)..."
# Using down && up instead of just 'up' to avoid 'ContainerConfig' errors on older docker-compose versions
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_PATH} && sudo docker-compose down && sudo docker-compose up -d --build"

echo "✨ Full Deployment successful! Your updates are now live at https://blipai.es"
