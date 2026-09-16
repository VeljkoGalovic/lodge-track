# Unify the dashboard with the landing page design system

## Context

LodgeTrack's landing page has a coherent dark aesthetic built on raw Tailwind values: canvas `#07090E`, glass surfaces (`bg-white/5` + `border-white/10` + `backdrop-blur-xl` + `rounded-2xl/3xl`), teal `#36BFAE` / purple `#BA87FF` accents, Inter with `font-bold tracking-tight`, slate text ramp (300/400/500).

The dashboard was built on shadcn semantic tokens that were **never defined**. `app/globals.css` declares only `--font-sans`, `--color-brand-teal`, `--color-brand-purple`, `--color-brand-dark` and keyframes — no `--color-background`, `--color-card`, `--color-muted-foreground`, `--color-sidebar`. In Tailwind v4 an undefined theme token emits **no CSS at all**, so every card, table, badge, input and sidebar surface renders with no background, no border, inherited colour. This is the state the last commit ("Dashboard functionallity fixed, needs redisgn") describes.

`app/signin/page.tsx` and `app/register/page.tsx` were already rebuilt in the landing style; the dashboard is the last surface out of step.

**Outcome:** the dashboard speaks the same visual language as the landing page while every Prisma query, server/client boundary and route keeps working.

## Approved decisions

- Atmosphere: **matched + atmospheric** (exact token match + ambient glows + eyebrow pills)
- Sidebar: **wire up desktop collapse**
- Defects: **fix all**
- Dead routes: **do nothing**, report at the end
- Fabricated data: **add `Booking.totalAmount`** and compute revenue for real

## Defects

- **D1 Undefined tokens** (root cause) — `bg-background`, `bg-card`, `text-muted-foreground`, `bg-sidebar`, `border-input`, `bg-accent`, `ring-ring`, `bg-primary/secondary/popover`, `text-destructive` emit nothing.
- **D2 Invalid v4 syntax** — `w-[--sidebar-width]` (v3-only, `ui/sidebar.tsx:173`), `hsl(var(--sidebar-border))` (`:15`), `--sidebar-width` never declared.
- **D3 Nested `<a>` — 12 sites** — `Button` renders `<a>` when `href` *or* `asChild` set (`Button.tsx:40`): `bookings/page.tsx:115`, `properties/page.tsx:71,93,96`, `settings/page.tsx:154,163`, `team/page.tsx:59,108`, `MetricsCards.tsx:76`, `RecentActivityTable.tsx:70,109`. Same class in `Navbar.tsx:55,93` (`<button>` in `<a>`).
- **D4 Status badges never match** — map keyed `"checked-out"` vs enum `CHECKED_OUT`, so `statusStyles[status.toLowerCase()]` never hits and every booking shows yellow "pending" (`bookings/page.tsx:109,55`); two more invented status sets (`page.tsx:79,92`).
- **D5 Fabricated money** — `Math.random()` amount (`page.tsx:93`), revenue = count × `150` (`:67`), meaningless occupancy divisor (`:70`), hardcoded trends (`:148,156,162`); `Booking` has no price column.
- **D6 Mobile drawer initialised open** (`DashboardShell.tsx:19`).
- **D7 z-index tie** header/sidebar (`DashboardShell.tsx:34,26`, `DashboardHeader.tsx:22`).
- **D8 Dead controls** — logout no handler (`DashboardHeader.tsx:73`), fake count `3` (`:39`), `disabled` ignored on anchor (`billing/page.tsx:216`), `href="#"`, mobile sign-in `/api/auth/signin` vs desktop `/signin` (`Navbar.tsx:87`).
- **D9 Duplicated light-mode tier badge logic** (`lib/subscriptions.ts:45`, `DashboardHeader.tsx:86`).
- **D10 18 unused imports** across 9 files.
- **D11 Minor** — unused `now` (`bookings/page.tsx:53`), unreachable `/onboarding` vs layout's `/register`, missing `cancelled`/`checked-in` status icons, ignored `hasApiAccessOverride`, month-span bug.
- **D12 8 dead routes** — reporting only: `/dashboard/properties/new`, `/dashboard/properties/[id]`, `/dashboard/properties/[id]/edit`, `/dashboard/bookings/new`, `/dashboard/bookings/[id]`, `/dashboard/team/invite`, `/dashboard/settings/password`, `/dashboard/settings/2fa`, `/onboarding`.

## Implementation

1. **`globals.css`** — semantic layer in `@theme` mapping shadcn names onto the landing palette (`--color-background/card/muted-foreground/sidebar*/primary/border/input/ring/...`), `--sidebar-width` in `:root`, plus eyebrow-pill and glow utilities beside `glass-card`.
2. **`components/ui/*`** — `card` → glass; `table` → slate ramp; `badge` → landing pill; `input` → signin/register input; `progress`, `dropdown-menu`, `dialog` likewise; `sidebar` fixes D2. **`Button`** fixes D3 via Radix `Slot` (existing dep, used at `sidebar.tsx:38`), `href` through `next/link`, inert `<span aria-disabled>` for `href`+`disabled`. Reuse `GlassCard` unchanged.
3. **Shell/sidebar/header** — desktop collapse (`w-64` ↔ `w-[4.5rem]`, tooltips) wired to `SidebarRail`; mobile drawer starts closed (D6); layering `z-50/40/30` (D7); ambient teal+purple orbs; glass rail; teal active pill + `aria-current`; header = landing navbar treatment, single `getTierBadgeColor`, working `signOut`, no fake count.
4. **New `components/dashboard/PageHeader.tsx`** — eyebrow pill + `text-3xl md:text-4xl font-bold tracking-tight` heading; replaces 7 ad-hoc headers.
5. **New `lib/booking-status.ts`** — one map keyed by the real `BookingStatus` enum; consumed by all three sites (D4/D11).
6. **Prisma** — `Booking.totalAmount Int?` + migration; real revenue/occupancy/MoM trends, `—` where absent, trends omitted without a prior period; deletes `Math.random()` and `× 150`.
7. **Pages** — restyle all 7 onto primitives + `PageHeader`, folding in D4/D5/D8/D10/D11; billing reuses the landing featured-card treatment; `Navbar.tsx` same anchor fix.

**Untouched:** every Prisma query, all server/client boundaries, `GlassCard`, the landing page's visual design.

## Verification

`prisma migrate dev` (**writes to the dev DB** — confirm `DATABASE_URL`) → `tsc --noEmit` → `lint` → `build` → `dev` walkthrough at 1440px/390px: surfaces render, rail collapses, mobile drawer starts closed, badges match real enum values, revenue shows real/`—` and never changes on refresh, logout works. Console checked for `validateDOMNesting` errors.
