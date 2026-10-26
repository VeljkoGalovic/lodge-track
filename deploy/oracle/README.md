# Oracle Cloud Free Tier — runbook for lodge-track

Target shape: a single **always-free ARM VM** running `next start -H 127.0.0.1`,
public traffic arriving through a **Cloudflare Tunnel** (no open ports, no
static IP needed, TLS terminated at Cloudflare edge). Postgres stays at
Supabase. The Cloudflare Worker stays deployed as a warm standby until the
operator confirms the cutover.

```
www.lodgetrack.com  (CF edge, TLS)
        │  Cloudflare Tunnel
        ▼
cloudflared (systemd) on VM  →  localhost:3001 next server → Supabase Postgres
```

---

## 1) Oracle console (you, one-time)

1. **Region**: pick the closest with capacity (Frankfurt/Paris for Serbia).
   A1 capacity is scarce — "Out of capacity" at launch is normal; retry between
   02:00–07:00 local time, when US demand is idle.
2. **Networking** → create a VCN with the "VCN with Internet Connectivity"
   wizard. Default security list keeps only SSH 22 — with the tunnel we need
   **zero** other open ports. Limit 22 to your IP or leave it and rely on key auth.
   *(Even more hardened: skip rule 22 entirely and SSH over the tunnel.)*
3. **Compute** → create instance:
   - Shape: `VM.Standard.A1.Flex`, **4 OCPU / 24 GB** (the entire free ARM quota).
   - Image: Ubuntu 24.04 (or 22.04) aarch64.
   - Boot volume: 100 GB (the free 200 GB tier allows 2 × 100 GB).
   - SSH key: paste your public key (or use Oracle's generated one + your own).
4. After creation: **VNIC → IPv4 addresses → *Reserved public IP*** (free, keeps
   the IPv4 stable across stop/start so SSH keeps working when you need it).

## 2) Server bootstrap (after SSHing as `ubuntu`)

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install git curl ca-certificates
# Node 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs
node --version   # must be >= 22.14 for Next 16

# app user + directory (systemd service runs NOT as root)
sudo useradd -m -s /bin/bash lodgetrack
sudo mkdir -p /opt/lodgetrack && sudo chown lodgetrack:lodgetrack /opt/lodgetrack

# as lodgetrack: clone + secrets
sudo -iu lodgetrack
git clone git@github.com:VeljkoGalovic/lodge-track.git /opt/lodgetrack   # or https + PAT
cd /opt/lodgetrack
nano .env                      # paste the values from CF dashboard -> Workers ->
                               #   lodge-track -> Variables & Secrets:
                               #   DATABASE_URL(+DIRECT_URL), AUTH_SECRET,
                               #   RESEND_API_KEY, LEMON_SQUEEZY_* (4 ids), NEXTJS_ENV
chmod 600 .env                 # postgres creds; never commit

./deploy/oracle/deploy.sh      # npm ci + prisma generate + build + service
# smoke test locally through SSH:
#   ssh -L 3001:127.0.0.1:3001 ubuntu@<ip>  → http://localhost:3001
```

> Prisma note: after migration the same client runs its **Node** engines — no
> wasm/WebAssembly workerd shenanigans to configure; `serverExternalPackages`
> and the pg-cloudflare tracing include in `next.config.ts` are harmless to
> keep but no longer needed.

## 3) Systemd

```bash
sudo install -m 644 \
  /opt/lodgetrack/deploy/oracle/lodgetrack.service \
  /etc/systemd/system/lodgetrack.service
sudo systemctl daemon-reload
sudo systemctl enable --now lodgetrack.service
systemctl status lodgetrack --no-pager   # active (running)
journalctl -u lodgetrack -f              # logs live here
```

Later deploys: `ssh server` → `sudo -iu lodgetrack /opt/lodgetrack/deploy/oracle/deploy.sh`.

## 4) Cloudflare Tunnel (public ingress)

```bash
sudo apt -y install cloudflared
cloudflared tunnel login                 # prints a URL; open it in any browser, pick your zone
cloudflared tunnel create lodge-track
cloudflared tunnel route dns lodge-track www.lodgetrack.com
sudo cloudflared service install         # installs cloudflared.service (systemd)
```

Config `/etc/cloudflared/config.yml`:

```yaml
tunnel: <tunnel-uuid>
credentials-file: /root/.cloudflared/<tunnel-uuid>.json
ingress:
  - hostname: www.lodgetrack.com
    service: http://127.0.0.1:3001
  - service: http_status:404
```

```bash
sudo systemctl restart cloudflared
sudo systemctl enable cloudflared
```

## 5) Cutover order (do exactly this sequence)

1. **Detach `www.lodgetrack.com` from the Worker** first:
   *Workers & Pages → lodge-track → Settings → Domains & Routes → Remove
   `www.lodgetrack.com`* — otherwise CF owns the DNS record and the tunnel
   route cannot claim it.
2. Run the tunnel `route dns` command above (creates/updates the CNAME to
   `<tunnel>.cfargotunnel.com`).
3. Verify `https://www.lodgetrack.com` serves from the VM:
   `curl -sI https://www.lodgetrack.com/api/auth/session` → 200.
4. End-to-end: register → email link → sign-in → billing page. Once LS
   products are published, a real checkout should reach Lemon Squeezy 200.
5. Keep `wrangler.jsonc` / OpenNext configs for now; when confident, silence
   the old worker by deleting the `lodge-track` Worker (or just let it sit
   unused; it only bills if traffic hits it).

## 6) CI/CD after migration (optional hardening)

Today's pipeline stays green as-is. To deploy on push from the VM itself:

```bash
# On the VM, as a regular user with docker-less actions runner:
#   actions/runner register as a *self-hosted* runner on repo VeljkoGalovic/lodge-track,
#   then add a job "runs-on: [self-hosted, oracle]" that runs deploy/oracle/deploy.sh
```

Alternative simplest deploy: a cron loop (`*/2 * * * * … git fetch -C
/opt/lodgetrack && [[ main..origin/main ]] && deploy.sh`) — see README above.

## 7) Ops reminders

- **Patching**: `unattended-upgrades` installed by default on Ubuntu images.
- **Backups**: Supabase handles DB backups; the VM is disposable (recreate from
  this runbook + a fresh clone restores state in ~10 min).
- **Image optimization**: `next/image` will now run on Node — `sharp` ships as
  a bundled dependency of Next 16's standalone output; if first render of
  `/_next/image` errors, `npm i sharp` in the app dir and restart.
- **Never** commit `.env`; rotate any credential that was ever pasted into a
  chat window.
