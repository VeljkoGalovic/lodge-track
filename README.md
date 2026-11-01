<p align="center">
  <img src="public/images/logo/LogoWithName.png" alt="LodgeTrack" width="360">
</p>

# LodgeTrack

**Multi-tenant property management SaaS for modern accommodations.** Used by
hosts and property managers to run properties, units, bookings, and expenses
across several businesses from one dashboard.

Product site: [lodgetrack.com](https://lodgetrack.com) ·
Landing page repo: [lodge-track-landing](https://github.com/VeljkoGalovic/lodge-track-landing)

## What it does

- **Organizations & seats** — multi-tenancy with per-organization data, email
  invitations, and verified signup flows
- **Properties & units** — manage portfolios down to individual units
- **Bookings & expenses** — track stays, costs, and documents per property
- **File attachments** — document uploads wired to object storage
- **Subscriptions** — billing lifecycle with webhook-driven state
- **API keys & rate limiting** — first-party API access, protected endpoints
- **Compliance built in** — privacy policy, terms, DPA, and cookie consent pages

## Stack

| Layer     | Tools                                                              |
|-----------|--------------------------------------------------------------------|
| Frontend  | Next.js (App Router), React 19, Tailwind CSS, shadcn/Radix UI, TanStack Query |
| Backend   | Next.js server actions + API routes, NextAuth (Prisma adapter)     |
| Data      | PostgreSQL, Prisma 7, Supabase Storage (attachments)               |
| Tests     | Vitest                                                             |
| Deploy    | Cloudflare Workers via `@opennextjs/cloudflare`, or a VPS behind a Cloudflare Tunnel |

## Getting started

```bash
git clone git@github.com:VeljkoGalovic/lodge-track.git
cd lodge-track
npm install
cp .env.example .env        # set DATABASE_URL and secrets
npx prisma migrate dev      # create/apply schema
npm run dev                 # http://localhost:3000
```

```bash
npm run test    # vitest suite
npm run build   # production build
npm run deploy  # Cloudflare Workers deploy (wrangler config required)
```

Self-hosting: `deploy/oracle/` (VPS + systemd) and `deploy/local/`
(Cloudflare Tunnel) contain environment setup and deployment scripts.

## Repository layout

| Path          | What                                                        |
|---------------|-------------------------------------------------------------|
| `app/`        | App Router pages, server actions, API routes                |
| `prisma/`     | Schema and migrations (orgs, users, properties, bookings…)  |
| `src/`        | Shared libraries, legal content, UI components              |
| `tests/`      | Vitest suites                                               |
| `deploy/`     | Self-hosting and deployment recipes                         |
| `scripts/`    | Utility scripts                                             |

## Status

In active development — pre-launch. See the
[landing page](https://github.com/VeljkoGalovic/lodge-track-landing) for the
public roadmap preview.
