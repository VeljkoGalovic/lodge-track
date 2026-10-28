# Production on veljkoserver (LAN box) behind Cloudflare Tunnel

**Live since 2026‑10‑27.** `www.lodgetrack.com` terminates at the Cloudflare
edge and reaches this always-on LAN server via a dashboard-managed tunnel.
The Cloudflare Worker keeps running on `workers.dev` as a zero-cost fallback.

```
www.lodgetrack.com (CF edge, TLS) → tunnel → cloudflared (token-managed systemd)
   → http://localhost:3001 (standalone Next, /opt/lodgetrack) → Supabase Postgres
```

## The box

- `veljkoserver` = `192.168.0.32` (LAN), also on the tailnet at
  `100.112.79.18` (Tailscale SSH policy gates the tail IP; the LAN IP is direct).
- Ubuntu 26.04, root login via key (`~/.ssh/id_ed25519`), 2 vCPU / 3.3 GB / 57 GB.
- Docker preinstalled; Node 22 at `/usr/local/node22` (`node-22` on PATH).

## Layout on the server

| Thing | Where |
|---|---|
| App (standalone Next build, self-contained) | `/opt/lodgetrack` |
| Runtime env | `/opt/lodgetrack/.env` (mode 600, copied from the local repo `.env`) |
| Service | `/etc/systemd/system/lodgetrack.service` (`User=lodgetrack`, port 3001) |
| Tunnel connector | `cloudflared service install <token>` → `/etc/cloudflared/config.json`; ingress lives in the **Zero Trust dashboard** (Public Hostname: `www.lodgetrack.com → http://localhost:3001`) |
| Logs | `journalctl -u lodgetrack -f` (app), `journalctl -u cloudflared -f` (tunnel) |

Deploys never `npm ci`/build on the box — the desktop builds the standalone
bundle; only ~65 MB ships over rsync.

## Releasing an update (from this repo, as the normal user)

```bash
./deploy/vps/deploy-remote.sh            # build + ship + restart + health
./deploy/vps/deploy-remote.sh --skip-build   # ship last build as-is
```

Green check afterwards: `curl -sI https://www.lodgetrack.com/api/auth/session | head -1`.

## Tag-driven release pipeline (GitHub → server)

The normal path no longer requires the desktop at all:

1. Push to `main` → CI (typecheck, lint, tests) must pass. Nothing deploys —
   green main is just the gate ("staged" state).
2. Push a tag: `git tag v1.x.y && git push origin v1.x.y` →
   `.github/workflows/release.yml` re-verifies, builds the standalone bundle
   **without secrets**, stages it as a workflow artifact (30 days), and
   publishes it to the matching GitHub Release (`lodgetrack-vps-v1.x.y.tar.gz`).
3. On the server, `lodgetrack-release-monitor.timer` polls the newest release
   every 3 min (`/opt/lodgetrack-ops/release-monitor.sh`): it downloads the
   asset into `/opt/lodgetrack-ops/staging/<tag>/`, verifies the bundle,
   swaps `/opt/lodgetrack` atomically (keeping `/opt/lodgetrack-ops/prev`),
   preserves the server's own `.env`, restarts, and health-checks. A failed
   health check rolls back to `prev` automatically; the failed bundle is kept
   at `/opt/lodgetrack-ops/broken-<tag>/`.
4. The workflow creates the GitHub Release itself; `cat
   /opt/lodgetrack-ops/DEPLOYED` shows what is live (tag, commit, time).

Server-side files (installed from this repo): `deploy/vps/release-monitor.sh`,
`deploy/vps/lodgetrack-release-monitor.service`, and
`deploy/vps/lodgetrack-release-monitor.timer`. Because the repo is private,
the server needs a **fine-grained PAT with read-only Contents access** at
`/etc/lodgetrack/github-deploy-token` (chmod 600) to download release assets.

Re-running the monitor manually re-checks immediately; re-pushing a tag
re-replaces its release asset and redeploys it.

## Rollback to the Worker (~1 minute, if the box dies)

1. Zero Trust → Tunnels → lodge-track → Public Hostnames → **remove** the
   `www` row (deletes the tunnel CNAME).
2. Workers & Pages → lodge-track → Domains & Routes → **add** the
   `www.lodgetrack.com` custom domain back (recreates the record; worker
   serves again; test-mode-era builds are current via CI).

## Ops notes

- OS updates: `unattended-upgrades` is installed; reboots auto-restart both
  services (`WantedBy=multi-user.target`).
- Current app build inlines `NEXT_PUBLIC_APP_URL=https://www.lodgetrack.com/`
  at build time — never delete it from the repo `.env`.
- The `lodgetrack` nologin user owns `/opt/lodgetrack`; the unit runs root-less
  with `NoNewPrivileges`/`PrivateTmp`.
- Tunnel connector uses a dashboard-managed token. Rotate it anytime from the
  dashboard (Settings → rotate token → rerun `cloudflared service install`).
- Worker stays up *and keeps being deployed by CI* — intentional: it is the
  fallback and stays current.
- Backlog (not urgent): rotate Resend/LS-API/CF-token/webhook-secret
  credentials (they briefly appeared in a chat transcript); stale Cloudflare
  Pages project cleanup; double-quoted `CLOUDFLARE_ACCOUNT_ID` lines in `.env`.
