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
# `next build` copies the repo .env into the bundle; shipping it would
# clobber the server's own /opt/lodgetrack/.env on every rsync (it did, once).
# The runtime reads the env from its working directory, so the copy goes.
rm -f .next/standalone/.env

echo "==> rsync to $TARGET:$DEST"
# NOTE: the repo .env is deliberately NOT copied into the bundle. The server's
# /opt/lodgetrack/.env is the durable record — it holds server-only keys
# (AUTH_URL, RATE_LIMIT_DISABLED) that the repo env must not clobber or lose.
# After the rsync, repo keys absent on the server are merged in below; existing
# server keys always win.
rsync -a --delete .next/standalone/ "$TARGET:$DEST/"

echo "==> merge repo env keys missing on the server"
scp -q .env "$TARGET:/tmp/lodgetrack-repo.env"
ssh "$TARGET" 'bash -s' <<'MERGE'
# The repo .env has no trailing newline than once; a merged line must not start
# on the same line as the last key, so terminate the file first.
[ -n "$(tail -c1 /opt/lodgetrack/.env)" ] && printf '\n' >> /opt/lodgetrack/.env
cp /opt/lodgetrack/.env /opt/lodgetrack-ops/env.bak
grep -oE '^[A-Z_]+' /opt/lodgetrack/.env | sort -u > /tmp/lodgetrack-server-keys
# Repo keys absent from the server get appended; server keys always win.
awk -F= 'NR==FNR { keys[$1] = 1; next } /^[A-Z_]+=/ { if (!($1 in keys)) print }' \
  /tmp/lodgetrack-server-keys /tmp/lodgetrack-repo.env >> /opt/lodgetrack/.env
rm -f /tmp/lodgetrack-repo.env /tmp/lodgetrack-server-keys
MERGE


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
