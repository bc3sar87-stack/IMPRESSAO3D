#!/bin/bash
# Chamado por /opt/deploy-impressao3d.sh na VPS depois de atualizar o clone
# em /opt/impressao3d. Este arquivo é versionado e se autoatualiza a cada
# deploy (ao contrário do bootstrap fixo na VPS).
set -euo pipefail

# Site institucional estático (domínio raiz 3dprintcontrol.com.br)
cd /opt/mjprime/nginx/static/3dprintcontrol
git pull origin main

# App Next.js (login / sistema) - subdomínio app.3dprintcontrol.com.br
cd /opt/impressao3d
docker build -t impressao3d-app:latest .
docker rm -f impressao3d-app 2>/dev/null || true
docker run -d \
  --name impressao3d-app \
  --network supabase_default \
  --restart unless-stopped \
  --env-file /opt/secrets/impressao3d.env \
  impressao3d-app:latest

cp /opt/impressao3d/deploy/nginx/app.3dprintcontrol.conf /opt/mjprime/nginx/conf.d/app.3dprintcontrol.conf
docker exec mjprime-nginx nginx -s reload
echo DEPLOY_OK
