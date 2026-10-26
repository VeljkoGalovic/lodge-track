# Local-server runtime (Fedora box) behind Cloudflare Tunnel — supersedes deploy/oracle

**Status (2026‑10‑26):** Oracle Free Tier A1 capacity is exhausted in this
account, so the always-free ARM VM path is shelved. The same architecture now
runs on the existing local desktop/server: outbound-only Cloudflare Tunnel,
no static IP, no open ports, TLS at the edge. The Cloudflare Worker keeps
serving `www.lodgetrack.com` as-is **until cutover** (§5), and stays reachable
on `workers.dev` as a fallback afterwards.

```
www.lodgetrack.com  (CF edge, TLS)
        │  Cloudflare Tunnel (outbound-only from the box)
        ▼
cloudflared (systemd, this machine)  →  127.0.0.1:3001 standalone node server  →  Supabase Postgres
```

## Already true on this machine

- Fedora 44 (KDE), systemd running, 15 GB RAM, 165 GB free disk.
- Node 22 (`nodejs22` → `/usr/bin/node-22`) ≥ Next 16 requirement.
- Repo at `/home/veljkogalovic/LodgeTracker/lodge-track` with the full `.env`
  (DB, auth, Resend, Lemon Squeezy, `NEXT_PUBLIC_APP_URL`) — **nothing to
  re-enter**.
- `LOCAL_DEVELOPMENT="false"` in `.env` keeps the API guards active.
- Port 3001 free (dev tooling sits on 3000/8787).

## 1) Production build + first smoke (no sudo needed)

```bash
cd /home/veljkogalovic/LodgeTracker/lodge-track
./deploy/local/deploy.sh          # refuses on dirty tree; build + restart + health check
```

First run: the service isn't installed yet, so stop after the build and smoke
manually:

```bash
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
cp .env .next/standalone/.env
cd .next/standalone && PORT=3001 HOSTNAME=127.0.0.1 node-22 server.js &
curl -s http://127.0.0.1:3001/api/auth/session          # expect {"{}" 200}
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/signin
```

`Ctrl-C`/kill the manual server, then continue. Later deploys are just
`./deploy/local/deploy.sh` (it restarts the service).

## 2) Install the systemd service (needs sudo, once)

```bash
sudo install -m 644 \
  /home/veljkogalovic/LodgeTracker/lodge-track/deploy/local/lodgetrack.service \
  /etc/systemd/system/lodgetrack.service
sudo systemctl daemon-reload
sudo systemctl enable --now lodgetrack.service
systemctl status lodgetrack --no-pager    # active (running)
journalctl -u lodgetrack -f               # live logs (or: journalctl -t lodgetrack)
```

## 3) Install cloudflared (needs sudo, once)

```bash
sudo curl -fL -o /usr/local/bin/cloudflared \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64
sudo chmod +x /usr/local/bin/cloudflared
cloudflared --version
```

## 4) Create the tunnel (needs sudo + one browser click)

Run under `sudo` so credentials land in `/root/.cloudflared/`:

```bash
sudo cloudflared tunnel login             # browser opens → pick lodgetrack.com
sudo cloudflared tunnel create lodge-track
sudo cloudflared tunnel list              # note the UUID
```

Write the config (template committed at `deploy/local/cloudflared.yml`):

```bash
sudo cp /home/veljkogalovic/LodgeTracker/lodge-track/deploy/local/cloudflared.yml /etc/cloudflared/config.yml
sudo nano /etc/cloudflared/config.yml     # replace <TUNNEL-UUID> (twice) with the UUID from above
```

Do **not** run `tunnel route dns` yet — the `www` DNS record is still owned by
the Worker's custom domain and the claim only succeeds at cutover (§5).

## 5) Cutover (order matters)

1. **First** verify the backend is green: `curl -s http://127.0.0.1:3001/api/auth/session` → `{}`.
2. **Dashboard → Workers & Pages → lodge-track → Settings → Domains & Routes →
   Remove `www.lodgetrack.com`.** (CF deletes its record; brief moment of 5xx/DNS-miss.)
3. Claim the hostname: `sudo cloudflared tunnel route dns lodge-track www.lodgetrack.com`
   (creates proxied CNAME `<uuid>.cfargotunnel.com`).
4. Start the ingress: `sudo cloudflared service install && sudo systemctl enable --now cloudflared`.
5. Verify from any machine: `curl -sI https://www.lodgetrack.com/api/auth/session` → 200.
6. End-to-end: register → email link → sign-in → billing → checkout
   (LS products are live as of today). The Worker remains available at
   `https://lodge-track.galovicveljko.workers.dev` as a warm fallback.

### Rollback (any time)

Delete the `<uuid>.cfargotunnel.com` CNAME for `www` in the DNS panel, then
re-add `www.lodgetrack.com` as the Worker's custom domain — done, back on the
Worker in ~1 minute.

## 6) Keep the box awake (desktop pitfall)

A KDE desktop suspends when idle → prod goes dark. Make it server-like:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

(Reversible with `unmask`.) Also: the service re-starts automatically after
reboots (`WantedBy=multi-user.target`).

## 7) Ops notes

- **Logs:** `journalctl -u lodgetrack -f` (app), `journalctl -u cloudflared -f` (tunnel).
- **Restart app after a change:** `./deploy/local/deploy.sh`.
- **Dev work continues normally** (`next dev` on 3000) — the standalone build
  in `.next/standalone` is a frozen copy; rebuilding refreshes it via deploy.sh.
- **Prisma:** runs native engines on Node — the wasm/workerd config in
  `next.config.ts` is inherited but inert here.
- **image optimization:** first `/_next/image` miss errors → add `sharp`:
  `npm i sharp` in the repo (docs note it for standalone Node).
- **Home-network flakiness:** the tunnel reconnects itself; short 530 windows
  from the ISP are cosmetic. `workers.dev` stays live meanwhile.
- **Supabase side:** unchanged (direct + pooled URLs as in `.env`).
