#!/usr/bin/env bash
# Local-server deploy: pull main, build standalone, restart the systemd service.
# Refuses to run on a dirty tree so local development experiments are never
# stomped by a server deploy.
set -euo pipefail
cd /home/veljkogalovic/LodgeTracker/lodge-track

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: working tree is dirty — commit or stash your local changes first." >&2
  git status --short >&2
  exit 1
fi

echo "==> git fetch + hard reset to origin/main"
git fetch origin main
git reset --hard origin/main

echo "==> npm ci"
npm ci

echo "==> prisma generate"
npx prisma generate

echo "==> next build"
NODE_ENV=production npx next build

echo "==> assemble standalone (static assets + env)"
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
cp .env .next/standalone/.env      # runtime env for the standalone server

echo "==> restart service"
sudo systemctl restart lodgetrack.service

echo "==> health check (up to 60s)"
for i in $(seq 1 20); do
  if curl -fsS -m 5 http://127.0.0.1:3001/api/auth/session > /dev/null 2>&1; then
    echo "OK: app healthy on 127.0.0.1:3001"
    exit 0
  fi
  sleep 3
done
echo "FAIL: app did not become healthy — check: journalctl -u lodgetrack -f" >&2
exit 1
