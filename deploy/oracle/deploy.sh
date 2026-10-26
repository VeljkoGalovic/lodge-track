#!/usr/bin/env bash
# Deploy the latest main to the local app user. Run as the lodgetrack user on
# the Oracle server (or via `sudo -u lodgetrack -i ./deploy/oracle/deploy.sh`).
set -euo pipefail
cd /opt/lodgetrack

echo "==> git pull"
git fetch --all --prune
# Rebase local main onto origin/main; a dirty tree is an operator error.
git reset --hard origin/main

echo "==> npm ci"
npm ci

echo "==> prisma generate"
npx prisma generate

echo "==> next build"
NODE_ENV=production npx next build

echo "==> restart service"
sudo systemctl restart lodgetrack.service

echo "==> health check (waits up to 30s)"
for i in $(seq 1 10); do
  if curl -fsS -m 5 http://127.0.0.1:3001/api/auth/session > /dev/null; then
    echo "OK: app responding"
    exit 0
  fi
  sleep 3
done
echo "FAIL: app did not become healthy after deploy" >&2
exit 1
