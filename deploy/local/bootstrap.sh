#!/usr/bin/env bash
# One-shot root bootstrap for the local-server runtime (Fedora).
# Run ONCE with sudo:  sudo bash deploy/local/bootstrap.sh
# It does everything that needs root; the user-side build (deploy.sh §1) and
# the tunnel login/browser step stay manual.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash $0" >&2
  exit 1
fi

REPO=/home/veljkogalovic/LodgeTracker/lodge-track

echo "==> preflight: standalone build present?"
if [[ ! -f "$REPO/.next/standalone/server.js" ]]; then
  echo "ERROR: $REPO/.next/standalone/server.js missing." >&2
  echo "       Run the build as the normal user first, per README §1:" >&2
  echo "         cd $REPO && ./deploy/local/deploy.sh (or manual build)" >&2
  exit 1
fi

echo "==> install cloudflared (skip if present)"
if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fL -o /usr/local/bin/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64
  chmod +x /usr/local/bin/cloudflared
fi
cloudflared --version

echo "==> install lodgetrack systemd service"
install -m 644 "$REPO/deploy/local/lodgetrack.service" /etc/systemd/system/lodgetrack.service
systemctl daemon-reload
systemctl enable --now lodgetrack.service
systemctl --no-pager --lines 3 status lodgetrack || true

echo "==> health check on 127.0.0.1:3001"
for i in $(seq 1 10); do
  if curl -fsS -m 5 http://127.0.0.1:3001/api/auth/session >/dev/null 2>&1; then
    echo "OK: app healthy on 127.0.0.1:3001"
    break
  fi
  sleep 3
  if [[ $i -eq 10 ]]; then
    echo "WARN: app not answering yet — check: journalctl -u lodgetrack -f" >&2
  fi
done

echo "==> keep the box awake (desktop suspend would take prod down)"
# Reversible:  sudo systemctl unmask sleep.target suspend.target hibernate.target hybrid-sleep.target
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

echo "==> stage tunnel config (not claiming DNS yet — cutover is a deliberate step)"
mkdir -p /etc/cloudflared
if [[ ! -f /etc/cloudflared/config.yml ]]; then
  cp "$REPO/deploy/local/cloudflared.yml" /etc/cloudflared/config.yml
  echo "  placed /etc/cloudflared/config.yml — still contains <TUNNEL-UUID> placeholders"
else
  echo "  /etc/cloudflared/config.yml already exists — leaving it untouched"
fi

cat <<'NEXT'

BOOTSTRAP DONE. Remaining manual steps (browser needed):

  sudo cloudflared tunnel login        # click Allow, pick lodgetrack.com
  sudo cloudflared tunnel create lodge-track
  sudo cloudflared tunnel list         # copy the UUID
  sudo nano /etc/cloudflared/config.yml  # replace BOTH <TUNNEL-UUID> placeholders

Cutover (only when app is healthy):
  Workers dashboard → lodge-track → Domains & Routes → Remove www.lodgetrack.com
  sudo cloudflared tunnel route dns lodge-track www.lodgetrack.com
  sudo cloudflared service install && sudo systemctl enable --now cloudflared
NEXT
