#!/usr/bin/env bash
# Ship the current tree to veljkoserver (prod):
#   build locally -> assemble standalone -> rsync -> restart service -> health.
# Usage:  ./deploy/vps/deploy-remote.sh            (builds, ~2 min)
#         ./deploy/vps/deploy-remote.sh --skip-build   (use last .next/standalone)
# Override the SSH target when the LAN is unreachable (e.g. Tailscale):
#         DEPLOY_HOST=root@100.112.79.18 ./deploy/vps/deploy-remote.sh
set -euo pipefail
cd /home/veljkogalovic/LodgeTracker/lodge-track
TARGET="${DEPLOY_HOST:-root@192.168.0.32}"
DEST=/opt/lodgetrack

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> next build"
  NODE_ENV=production npx next build
else
  echo "==> reusing existing .next/standalone (stale if you changed code!)"
fi

echo "==> assemble standalone"
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
cp .env .next/standalone/.env

echo "==> rsync to $TARGET:$DEST"
rsync -a --delete .next/standalone/ "$TARGET:$DEST/"

echo "==> restart + health"
ssh "$TARGET" 'chown -R lodgetrack:lodgetrack /opt/lodgetrack && systemctl restart lodgetrack
for i in $(seq 1 20); do
  if curl -fsS -m 5 http://127.0.0.1:3001/api/auth/session >/dev/null 2>&1; then
    echo "OK: app healthy"; exit 0
  fi
  sleep 3
done
echo "FAIL: not healthy — journalctl -u lodgetrack -n 40" >&2
journalctl -u lodgetrack -n 20 --no-pager >&2
exit 1'
