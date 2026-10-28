#!/usr/bin/env bash
# LodgeTrack release monitor.
#
# Watches the newest published GitHub Release for a VPS bundle asset, stages
# it on disk, swaps it into /opt/lodgetrack (preserving the server's own
# .env), restarts the service, and rolls back automatically if the health
# check fails. Runs unattended from lodgetrack-release-monitor.timer; all
# output lands in the journal (journalctl -u lodgetrack-release-monitor).
#
# Flat-file layout under /opt/lodgetrack-ops:
#   release-monitor.sh  this script
#   DEPLOYED            JSON stamp of the last deployed release
#   staging/<tag>/      unpacked download of the release being deployed
#   prev/               the previous live bundle (kept for rollback)
#   broken-<tag>/       bundles that failed their health check, for diagnosis
#
# Private repo: a fine-grained PAT with read-only "Contents" access for this
# one repository must be saved at /etc/lodgetrack/github-deploy-token (single
# line, chmod 600). Without it the script fails loudly with the exact fix
# instead of guessing.
#
# Manual run:       /opt/lodgetrack-ops/release-monitor.sh
# Check state:      cat /opt/lodgetrack-ops/DEPLOYED
# Roll back NOW:    systemctl stop lodgetrack && rm -rf /opt/lodgetrack && \
#                   mv /opt/lodgetrack-ops/prev /opt/lodgetrack && \
#                   chown -R lodgetrack:lodgetrack /opt/lodgetrack && \
#                   systemctl start lodgetrack
set -euo pipefail

REPO="VeljkoGalovic/lodge-track"
OPS=/opt/lodgetrack-ops
STAGING="$OPS/staging"
PREV="$OPS/prev"
STAMP="$OPS/DEPLOYED"
TOKEN_FILE=/etc/lodgetrack/github-deploy-token
ASSET_PREFIX="lodgetrack-vps-"
SERVICE=lodgetrack
HEALTH_URL="http://127.0.0.1:3001/api/auth/session"

log() { printf '[release-monitor] %s\n' "$*"; }
die() { log "ERROR: $*"; exit 1; }

declare -a AUTH=()
if [[ -r "$TOKEN_FILE" ]]; then
  TOKEN="$(tr -d ' \n' < "$TOKEN_FILE")"
  AUTH=(-H "Authorization: Bearer $TOKEN")
else
  log "no token at $TOKEN_FILE — trying unauthenticated (public repos only)"
fi

latest="$(curl -fsS -H "Accept: application/vnd.github+json" "${AUTH[@]}" \
  "https://api.github.com/repos/$REPO/releases/latest")" \
  || die "cannot read $REPO/releases/latest — for a private repo save a fine-grained PAT (Contents: read) to $TOKEN_FILE"

tag="$(jq -r .tag_name <<<"$latest")"
[[ -n "$tag" && "$tag" != "null" ]] || die "latest release lookup returned no tag"

if [[ -f "$STAMP" ]] && [[ "$tag" == "$(jq -r .tag "$STAMP")" ]]; then
  # Already deployed; nothing to do.
  exit 0
fi

sha="$(jq -r .target_commitish <<<"$latest")"
log "new release detected: $tag (commit $sha)"

asset_url="$(jq -r --arg want "${ASSET_PREFIX}${tag}.tar.gz" \
  '.assets[] | select(.name == $want) | .browser_download_url' <<<"$latest" | head -n1)"
[[ -n "$asset_url" && "$asset_url" != "null" ]] || die "release $tag has no ${ASSET_PREFIX}${tag}.tar.gz asset — push the tag through the Release workflow first"

mkdir -p "$STAGING/$tag"
log "downloading $asset_url"
curl -fsSL "${AUTH[@]}" "$asset_url" | tar -xz -C "$STAGING/$tag" \
  || die "download/unpack of $tag failed"

[[ -f "$STAGING/$tag/server.js" && -d "$STAGING/$tag/.next/static" ]] \
  || die "$tag bundle incomplete (missing server.js or static assets)"

log "$tag staged and intact — swapping into /opt/lodgetrack"

systemctl stop "$SERVICE"
rm -rf "$PREV"
mv /opt/lodgetrack "$PREV"
mv "$STAGING/$tag" /opt/lodgetrack
if [[ ! -f "$PREV/.env" ]]; then
  mv "$PREV" /opt/lodgetrack
  systemctl start "$SERVICE"
  die "previous bundle had no .env — deployment aborted, original restored"
fi
cp -a "$PREV/.env" /opt/lodgetrack/.env
chown -R lodgetrack:lodgetrack /opt/lodgetrack
systemctl start "$SERVICE"

healthy=0
for _ in $(seq 1 20); do
  if curl -fsS -m 5 "$HEALTH_URL" > /dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 3
done

if [[ "$healthy" == 1 ]]; then
  jq -n --arg tag "$tag" --arg sha "$sha" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{tag: $tag, sha: $sha, deployedAt: $ts}' > "$STAMP"
  rm -rf "$STAGING"/*
  log "deployed $tag — stamp written to $STAMP"
  exit 0
fi

log "health check failed for $tag — rolling back to the previous bundle"
systemctl stop "$SERVICE"
rm -rf "$OPS/broken-$tag"
mv /opt/lodgetrack "$OPS/broken-$tag"
mv "$PREV" /opt/lodgetrack
chown -R lodgetrack:lodgetrack /opt/lodgetrack
systemctl start "$SERVICE"
for _ in $(seq 1 20); do
  curl -fsS -m 5 "$HEALTH_URL" > /dev/null 2>&1 && break
  sleep 3
done
die "rolled back to the previous bundle — $tag preserved at $OPS/broken-$tag for inspection"
