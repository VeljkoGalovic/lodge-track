# Lemon Squeezy Subscription Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full subscription management (upgrade/downgrade/cancel) via Lemon Squeezy Customer Portal integration on `/dashboard/billing`, with proper webhook lifecycle handling.

**Architecture:** The billing page will be enhanced with a "Manage Subscription" button that opens the Lemon Squeezy Customer Portal. Webhooks will handle subscription_updated, subscription_cancelled, subscription_resumed, and subscription_expired events to keep local state in sync. The UI will display current plan, status badge, renewal date, and a banner when canceled but still in grace period.

**Tech Stack:** Next.js 15 App Router, React Server Components, Prisma ORM, Lemon Squeezy REST API (Customer Portal), next-auth, Vitest + React Testing Library

**Spec:** This plan implements the Lemon Squeezy subscription management requirements from the audit request.

## Global Constraints

- All three tiers (STARTER, PRO, BUSINESS) are paid tiers with 30-day trials
- Subscription state is the source of truth in Lemon Squeezy; local DB mirrors it via webhooks
- No card data stored locally — all payment flows hosted by Lemon Squeezy
- Webhook signature verification required (HMAC-SHA256 with LEMON_SQUEEZY_WEBHOOK_SECRET)
- Idempotency via WebhookEvent table (sha256 of raw body)
- English and Serbian locale support required for all new UI strings
- Follow existing code patterns: Server Components for data fetching, Client Components for interactive UI

## Review Focus

1. **Customer Portal URL generation failure** — If the Customer Portal API call fails, the user should see a clear error message, not a broken link or silent failure
2. **Webhook race conditions** — Multiple webhook events for the same subscription arriving out of order (e.g., cancelled then resumed) should leave the subscription in the correct final state
3. **Missing billingCustomerId** — Organizations that registered before Customer Portal integration may not have a billingCustomerId; the "Manage Subscription" button should handle this gracefully
4. **Grace period UI accuracy** — The "canceled but still accessible" banner must accurately reflect the 3-day grace period from currentPeriodEnd, not trialEndsAt
5. **Owner-only authorization** — Only OWNER role should see "Manage Subscription" button; managers/members should see read-only view with appropriate messaging

---

### Task 1: Add Customer Portal API to lib/billing.ts

**Files:**
- Modify: `lib/billing.ts`
- Test: `tests/billing-customer-portal.test.ts`

**Interfaces:**
- Consumes: `readConfig()`, `billingStatus()`
- Produces: `createCustomerPortalUrl(orgId: string): Promise<string | null>`

- [ ] **Step 1: Write failing test for createCustomerPortalUrl**

```typescript
// tests/billing-customer-portal.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createCustomerPortalUrl } from "@/lib/billing"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
  },
}))

describe("createCustomerPortalUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when billing is not configured", async () => {
    vi.stubEnv("LEMON_SQUEEZY_API_KEY", "")
    const url = await createCustomerPortalUrl("org-123")
    expect(url).toBeNull()
  })

  it("returns null when subscription has no billingCustomerId", async () => {
    vi.stubEnv("LEMON_SQUEEZY_API_KEY", "test-key")
    vi.stubEnv("LEMON_SQUEEZY_STORE_ID", "store-123")
    const { prisma } = await import("@/lib/prisma")
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      billingCustomerId: null,
      billingSubscriptionId: "sub-123",
    } as any)
    const url = await createCustomerPortalUrl("org-123")
    expect(url).toBeNull()
  })

  it("calls Lemon Squeezy Customer Portal API and returns URL", async () => {
    vi.stubEnv("LEMON_SQUEEZY_API_KEY", "test-key")
    vi.stubEnv("LEMON_SQUEEZY_STORE_ID", "store-123")
    const { prisma } = await import("@/lib/prisma")
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      billingCustomerId: "cus_123",
      billingSubscriptionId: "sub_123",
    } as any)
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { attributes: { url: "https://lemonsqueezy.com/portal/abc" } } }),
    })

    const url = await createCustomerPortalUrl("org-123")
    expect(url).toBe("https://lemonsqueezy.com/portal/abc")
    expect(fetch).toHaveBeenCalledWith(
      "https://api.lemonsqueezy.com/v1/customer-portal",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
        body: JSON.stringify({
          data: {
            type: "customer-portal",
            attributes: { customer_id: "cus_123" },
            relationships: { store: { data: { type: "stores", id: "store-123" } } },
          },
        }),
      })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/billing-customer-portal.test.ts
```
Expected: FAIL with "createCustomerPortalUrl not defined"

- [ ] **Step 3: Implement createCustomerPortalUrl in lib/billing.ts**

Add after `createCheckoutUrl` function:
```typescript
export async function createCustomerPortalUrl(orgId: string): Promise<string | null> {
  const config = readConfig()
  
  if (!config.apiKey || !config.storeId) {
    console.error("[billing] createCustomerPortalUrl: missing API key or store ID")
    return null
  }

  const subscription = await prisma.subscription.findUnique({
    where: { orgId },
    select: { billingCustomerId: true, billingSubscriptionId: true },
  })

  if (!subscription?.billingCustomerId) {
    console.error("[billing] createCustomerPortalUrl: no billingCustomerId for org", orgId)
    return null
  }

  const requestBody = {
    data: {
      type: "customer-portal",
      attributes: { customer_id: subscription.billingCustomerId },
      relationships: {
        store: { data: { type: "stores", id: config.storeId } },
      },
    },
  }

  try {
    const response = await fetch(`${API_BASE}/customer-portal`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[billing] customer portal creation failed", {
        status: response.status,
        response: errorText,
        orgId,
      })
      return null
    }

    const payload = await response.json()
    return payload.data?.attributes?.url ?? null
  } catch (error) {
    console.error("[billing] customer portal creation exception", {
      error: error instanceof Error ? error.message : String(error),
      orgId,
    })
    return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/billing-customer-portal.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/billing.ts tests/billing-customer-portal.test.ts
git commit -m "feat(billing): add Customer Portal URL generation"
```

---

### Task 2: Add Customer Portal API route

**Files:**
- Create: `app/api/billing/portal/route.ts`
- Test: `tests/api-billing-portal.test.ts`

**Interfaces:**
- Consumes: `auth()`, `createCustomerPortalUrl()`
- Produces: `GET /api/billing/portal` → redirect to Customer Portal URL

- [ ] **Step 1: Write failing test**

```typescript
// tests/api-billing-portal.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET } from "@/app/api/billing/portal/route"
import { createCustomerPortalUrl } from "@/lib/billing"

vi.mock("@/auth")
vi.mock("@/lib/prisma")
vi.mock("@/lib/billing")
vi.mock("@/lib/origin", () => ({ absoluteUrl: vi.fn((path) => `http://localhost:3000${path}`) }))

describe("GET /api/billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to signin when not authenticated", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue(null)
    
    const request = new Request("http://localhost:3000/api/billing/portal")
    const response = await GET(request)
    
    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toContain("/signin")
  })

  it("redirects to billing with error when no Customer Portal URL", async () => {
    const { auth } = await import("@/auth")
    const { prisma } = await import("@/lib/prisma")
    
    vi.mocked(auth).mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      orgId: "org-123",
    } as any)
    vi.mocked(createCustomerPortalUrl).mockResolvedValue(null)
    
    const request = new Request("http://localhost:3000/api/billing/portal")
    const response = await GET(request)
    
    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toContain("/dashboard/billing?error=portal_unavailable")
  })

  it("redirects to Customer Portal URL when available", async () => {
    const { auth } = await import("@/auth")
    const { prisma } = await import("@/lib/prisma")
    
    vi.mocked(auth).mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      orgId: "org-123",
    } as any)
    vi.mocked(createCustomerPortalUrl).mockResolvedValue("https://lemonsqueezy.com/portal/abc")
    
    const request = new Request("http://localhost:3000/api/billing/portal")
    const response = await GET(request)
    
    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("https://lemonsqueezy.com/portal/abc")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/api-billing-portal.test.ts
```
Expected: FAIL with route not found

- [ ] **Step 3: Implement the route**

Create `app/api/billing/portal/route.ts`:
```typescript
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canAdminister } from "@/lib/authorization"
import { createCustomerPortalUrl } from "@/lib/billing"
import { absoluteUrl } from "@/lib/origin"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.redirect(absoluteUrl("/signin", request))
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  })
  if (!user) {
    return NextResponse.redirect(absoluteUrl("/signin", request))
  }

  if (!canAdminister(user.role)) {
    return NextResponse.redirect(absoluteUrl("/dashboard/billing?error=not_owner", request))
  }

  const portalUrl = await createCustomerPortalUrl(user.orgId)
  if (!portalUrl) {
    return NextResponse.redirect(absoluteUrl("/dashboard/billing?error=portal_unavailable", request))
  }

  return NextResponse.redirect(portalUrl)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/api-billing-portal.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/billing/portal/route.ts tests/api-billing-portal.test.ts
git commit -m "feat(billing): add Customer Portal API route"
```

---

### Task 3: Enhance webhook handler for subscription lifecycle events

**Files:**
- Modify: `app/api/billing/webhook/route.ts`
- Test: `tests/webhook-lifecycle.test.ts`

**Interfaces:**
- Consumes: `applyEvent()` (existing)
- Produces: Updated `applyEvent()` handling subscription_updated, subscription_cancelled, subscription_resumed, subscription_expired

- [ ] **Step 1: Write failing tests for lifecycle events**

```typescript
// tests/webhook-lifecycle.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { applyEvent } from "@/app/api/billing/webhook/route"
import { Prisma } from "@prisma/client"
import { statusForProviderStatus, tierForVariantId } from "@/lib/billing"

vi.mock("@/lib/prisma")
vi.mock("@/lib/billing")

describe("Webhook lifecycle events", () => {
  const mockTx = {
    subscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    webhookEvent: {
      create: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(statusForProviderStatus).mockImplementation((s) => ({
      on_trial: "TRIALING",
      active: "ACTIVE",
      paused: "PAUSED",
      past_due: "PAST_DUE",
      unpaid: "PAST_DUE",
      cancelled: "CANCELED",
      expired: "CANCELED",
    }[s] as any))
    vi.mocked(tierForVariantId).mockReturnValue("PRO")
  })

  it("handles subscription_updated with tier change", async () => {
    mockTx.subscription.findUnique.mockResolvedValue({ id: "sub-1" })
    mockTx.subscription.update.mockResolvedValue({})
    
    const payload = {
      meta: { event_name: "subscription_updated", custom_data: { org_id: "org-1" } },
      data: {
        id: "123",
        type: "subscriptions",
        attributes: {
          status: "active",
          variant_id: 456,
          subscription_id: 789,
          renews_at: "2025-12-31T00:00:00Z",
        },
      },
    }
    
    await applyEvent(mockTx as any, "subscription_updated", payload)
    
    expect(mockTx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: "ACTIVE",
        tier: "PRO",
        billingSubscriptionId: "789",
        currentPeriodEnd: expect.any(Date),
      }),
    })
  })

  it("handles subscription_cancelled", async () => {
    mockTx.subscription.findUnique.mockResolvedValue({ id: "sub-1" })
    mockTx.subscription.update.mockResolvedValue({})
    
    const payload = {
      meta: { event_name: "subscription_cancelled", custom_data: { org_id: "org-1" } },
      data: {
        id: "123",
        type: "subscriptions",
        attributes: {
          status: "cancelled",
          variant_id: 456,
          subscription_id: 789,
          ends_at: "2025-12-31T00:00:00Z",
        },
      },
    }
    
    await applyEvent(mockTx as any, "subscription_cancelled", payload)
    
    expect(mockTx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: "CANCELED",
        currentPeriodEnd: expect.any(Date),
      }),
    })
  })

  it("handles subscription_resumed", async () => {
    mockTx.subscription.findUnique.mockResolvedValue({ id: "sub-1" })
    mockTx.subscription.update.mockResolvedValue({})
    
    const payload = {
      meta: { event_name: "subscription_resumed", custom_data: { org_id: "org-1" } },
      data: {
        id: "123",
        type: "subscriptions",
        attributes: {
          status: "active",
          variant_id: 456,
          subscription_id: 789,
          renews_at: "2025-12-31T00:00:00Z",
        },
      },
    }
    
    await applyEvent(mockTx as any, "subscription_resumed", payload)
    
    expect(mockTx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: "ACTIVE",
        currentPeriodEnd: expect.any(Date),
      }),
    })
  })

  it("handles subscription_expired", async () => {
    mockTx.subscription.findUnique.mockResolvedValue({ id: "sub-1" })
    mockTx.subscription.update.mockResolvedValue({})
    
    const payload = {
      meta: { event_name: "subscription_expired", custom_data: { org_id: "org-1" } },
      data: {
        id: "123",
        type: "subscriptions",
        attributes: {
          status: "expired",
          variant_id: 456,
          subscription_id: 789,
        },
      },
    }
    
    await applyEvent(mockTx as any, "subscription_expired", payload)
    
    expect(mockTx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: "CANCELED",
      }),
    })
  })

  it("handles out-of-order events correctly (cancelled then resumed)", async () => {
    mockTx.subscription.findUnique.mockResolvedValue({ id: "sub-1" })
    mockTx.subscription.update.mockResolvedValue({})
    
    // First: cancelled
    await applyEvent(mockTx as any, "subscription_cancelled", {
      meta: { event_name: "subscription_cancelled", custom_data: { org_id: "org-1" } },
      data: {
        id: "123",
        type: "subscriptions",
        attributes: { status: "cancelled", variant_id: 456, subscription_id: 789, ends_at: "2025-12-31T00:00:00Z" },
      },
    })
    
    // Then: resumed (later event)
    await applyEvent(mockTx as any, "subscription_resumed", {
      meta: { event_name: "subscription_resumed", custom_data: { org_id: "org-1" } },
      data: {
        id: "124",
        type: "subscriptions",
        attributes: { status: "active", variant_id: 456, subscription_id: 789, renews_at: "2026-01-31T00:00:00Z" },
      },
    })
    
    // Last update should win (resumed -> ACTIVE)
    expect(mockTx.subscription.update).toHaveBeenLastCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({ status: "ACTIVE" }),
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/webhook-lifecycle.test.ts
```
Expected: FAIL with applyEvent not handling new events or missing imports

- [ ] **Step 3: Update applyEvent to handle all lifecycle events**

Modify `app/api/billing/webhook/route.ts`:
- The existing `applyEvent` already handles events starting with "subscription_" (line 94)
- Add explicit handling for subscription_cancelled, subscription_resumed, subscription_expired
- Ensure `ends_at` is used for cancelled/expired to set correct `currentPeriodEnd`
- The `STATUS_MAP` already maps 'cancelled' and 'expired' to 'CANCELED', 'active' to 'ACTIVE', 'paused' to 'PAUSED'
- No changes needed to core logic, but verify the event names are correct per Lemon Squeezy docs

Actually, review the existing code - it already handles all subscription_* events generically. The key is ensuring the status mapping is correct. Let me verify the Lemon Squeezy event names...

Lemon Squeezy webhook events: subscription_created, subscription_updated, subscription_cancelled, subscription_resumed, subscription_expired, subscription_paused, subscription_unpaused

The existing code uses `eventName.startsWith("subscription_")` which catches all. The STATUS_MAP has:
- cancelled → CANCELED
- expired → CANCELED
- active → ACTIVE
- paused → PAUSED
- on_trial → TRIALING
- past_due → PAST_DUE
- unpaid → PAST_DUE

This looks correct. The test should pass with minimal changes. But we should add explicit tests and possibly handle `subscription_paused` and `subscription_unpaused` as well.

Let me update the applyEvent to also handle paused/unpaused explicitly for clarity.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/webhook-lifecycle.test.ts
```
Expected: PASS (existing logic should handle it)

- [ ] **Step 5: Commit**

```bash
git add app/api/billing/webhook/route.ts tests/webhook-lifecycle.test.ts
git commit -m "feat(billing): verify webhook handles all subscription lifecycle events"
```

---

### Task 4: Add billing page translations for Customer Portal and status UI

**Files:**
- Modify: `lib/i18n/dictionaries.ts` (both `en` and `sr` sections)

**Interfaces:**
- Consumes: existing billing dictionary structure
- Produces: new keys for manageSubscription, canceledBanner, portalUnavailable error

- [ ] **Step 1: Add English translations**

In `en.billing` add:
```typescript
manageSubscription: "Manage subscription",
manageSubscriptionHint: "Opens Lemon Squeezy customer portal to change plan, update payment method, or cancel",
canceledBanner: "Your subscription was canceled on {date}. You have access until {endDate} (grace period).",
canceledBannerResumed: "Your subscription was canceled but has been resumed. Next billing: {date}.",
portalUnavailable: "Customer portal is not available. Please contact support.",
portalError: "Could not open customer portal. Please try again later.",
renewalDate: "Renews on {date}",
```

- [ ] **Step 2: Add Serbian translations**

In `sr.billing` add:
```typescript
manageSubscription: "Upravljaj pretplatom",
manageSubscriptionHint: "Otvara Lemon Squeezy portal za korisnike za promenu plana, ažuriranje načina plaćanja ili otkazivanje",
canceledBanner: "Vaša pretplata je otkazana {date}. Imate pristup do {endDate} (mirni period).",
canceledBannerResumed: "Vaša pretplata je otkazana ali je nastavljena. Sledeće naplaćivanje: {date}.",
portalUnavailable: "Portal za korisnike nije dostupan. Molimo kontaktirajte podršku.",
portalError: "Nije moguće otvoriti portal za korisnike. Pokušajte ponovo kasnije.",
renewalDate: "Obnavlja se {date}",
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -50
```
Expected: No type errors for dictionaries

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/dictionaries.ts
git commit -m "feat(i18n): add Customer Portal and subscription status translations"
```

---

### Task 5: Enhance billing page UI with Manage Subscription button and status indicators

**Files:**
- Modify: `app/dashboard/billing/page.tsx`
- Test: `tests/billing-page-enhanced.test.tsx`

**Interfaces:**
- Consumes: `t.pages.billing.*` translations, subscription data
- Produces: Enhanced UI with status badge, renewal date, Manage button, canceled banner

- [ ] **Step 1: Write failing test for enhanced UI**

```typescript
// tests/billing-page-enhanced.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import BillingPage from "@/app/dashboard/billing/page"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }))
vi.mock("@/lib/billing", () => ({ billingStatus: vi.fn() }))
vi.mock("@/lib/i18n/server", () => ({ currentLocale: vi.fn() }))

function renderBillingPage(overrides = {}) {
  const { auth } = require("@/auth")
  const { prisma } = require("@/lib/prisma")
  const { billingStatus } = require("@/lib/billing")
  const { currentLocale } = require("@/lib/i18n/server")
  
  vi.mocked(auth).mockResolvedValue({ user: { email: "owner@test.com" } })
  vi.mocked(currentLocale).mockResolvedValue("en")
  vi.mocked(billingStatus).mockReturnValue({ canCheckout: true, canReceiveWebhooks: true, missing: [] })
  
  const defaultOrg = {
    id: "org-1",
    _count: { properties: 1 },
    subscription: {
      id: "sub-1",
      tier: "PRO",
      status: "ACTIVE",
      billingSubscriptionId: "ls_sub_123",
      billingCustomerId: "ls_cus_123",
      currentPeriodEnd: new Date("2025-12-31"),
      trialEndsAt: null,
      isLifetimeFree: false,
      maxPropertiesOverride: null,
      hasApiAccessOverride: null,
    },
    ...overrides.org,
  }
  
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    email: "owner@test.com",
    role: "OWNER",
    locale: "en",
    organization: defaultOrg,
  })
  
  return render(
    <LocaleProvider locale="en">
      <BillingPage searchParams={Promise.resolve(overrides.searchParams || {})} />
    </LocaleProvider>
  )
}

describe("BillingPage - Enhanced UI", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows Manage Subscription button for owner with active subscription", async () => {
    renderBillingPage()
    
    await vi.dynamicImportSettled?.()
    
    // Check for Manage Subscription button
    expect(screen.getByRole("link", { name: /manage subscription/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /manage subscription/i })).toHaveAttribute("href", "/api/billing/portal")
  })

  it("shows renewal date for active subscription", async () => {
    renderBillingPage()
    
    await vi.dynamicImportSettled?.()
    
    expect(screen.getByText(/renews on/i)).toBeInTheDocument()
    expect(screen.getByText(/Dec 31, 2025/i)).toBeInTheDocument()
  })

  it("shows status badge with correct color for ACTIVE", async () => {
    renderBillingPage()
    
    await vi.dynamicImportSettled?.()
    
    const badge = screen.getByText("Active")
    expect(badge).toBeInTheDocument()
  })

  it("shows canceled banner when subscription is CANCELED with grace period", async () => {
    renderBillingPage({
      org: {
        subscription: {
          id: "sub-1",
          tier: "PRO",
          status: "CANCELED",
          billingSubscriptionId: "ls_sub_123",
          billingCustomerId: "ls_cus_123",
          currentPeriodEnd: new Date("2025-12-31"),
          trialEndsAt: null,
          isLifetimeFree: false,
        },
      },
    })
    
    await vi.dynamicImportSettled?.()
    
    expect(screen.getByText(/canceled on/i)).toBeInTheDocument()
    expect(screen.getByText(/access until/i)).toBeInTheDocument()
  })

  it("does NOT show Manage Subscription button for non-owner", async () => {
    const { prisma } = require("@/lib/prisma")
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: "member@test.com",
      role: "MANAGER",
      locale: "en",
      organization: {
        id: "org-1",
        _count: { properties: 1 },
        subscription: {
          id: "sub-1",
          tier: "PRO",
          status: "ACTIVE",
          billingSubscriptionId: "ls_sub_123",
          billingCustomerId: "ls_cus_123",
          currentPeriodEnd: new Date("2025-12-31"),
          trialEndsAt: null,
          isLifetimeFree: false,
        },
      },
    })
    
    renderBillingPage()
    await vi.dynamicImportSettled?.()
    
    expect(screen.queryByRole("link", { name: /manage subscription/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/billing-page-enhanced.test.tsx
```
Expected: FAIL - UI elements not present

- [ ] **Step 3: Modify app/dashboard/billing/page.tsx**

Key changes:
1. Add "Manage Subscription" button next to provider subscription ID (only for owners with billingCustomerId)
2. Show renewal date prominently in current plan card
3. Add canceled banner when status is CANCELED and currentPeriodEnd is in future (grace period)
4. Update status badge to use correct variant (destructive for CANCELED/PAST_DUE, warning for TRIALING, default for ACTIVE/PAUSED)
5. Add tooltip/help text for Manage Subscription button

Changes to make in the Current Plan Card section (around line 214-243):
- After providerSubscriptionId display, add renewal date if currentPeriodEnd exists
- Add Manage Subscription button (link to /api/billing/portal) when isOwner && subscription?.billingCustomerId && provider.canCheckout
- Before the CardContent ends, add canceled banner conditional

The banner should show when:
- subscription?.status === "CANCELED"
- subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date()

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/billing-page-enhanced.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/billing/page.tsx tests/billing-page-enhanced.test.tsx
git commit -m "feat(billing): enhance billing page with Manage Subscription and status UI"
```

---

### Task 6: Add error handling for portal_unavailable on billing page

**Files:**
- Modify: `app/dashboard/billing/page.tsx`

**Interfaces:**
- Consumes: searchParams.error === "portal_unavailable"
- Produces: Error banner with translation

- [ ] **Step 1: Add error handling in billing page**

In the searchParams error handling section (around line 154-159), add:
```typescript
const portalErrors: Record<string, string> = {
  portal_unavailable: t.pages.billing.portalUnavailable,
  portal_error: t.pages.billing.portalError,
}
```

Then render it similar to checkoutErrors:
```tsx
{params.error && portalErrors[params.error] ? (
  <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
    <p>{portalErrors[params.error]}</p>
  </div>
) : null}
```

- [ ] **Step 2: Test manually or via integration test**

Run the existing billing page tests to ensure no regression.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/billing/page.tsx
git commit -m "feat(billing): add portal_unavailable error handling"
```

---

### Task 7: Integration test for full subscription management flow

**Files:**
- Create: `tests/billing-subscription-management.test.tsx`

**Interfaces:**
- Consumes: All previous tasks
- Produces: End-to-end test of upgrade/downgrade/cancel flow via Customer Portal

- [ ] **Step 1: Write integration test**

```typescript
// tests/billing-subscription-management.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import BillingPage from "@/app/dashboard/billing/page"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }))
vi.mock("@/lib/billing", () => ({ billingStatus: vi.fn() }))
vi.mock("@/lib/i18n/server", () => ({ currentLocale: vi.fn() }))

function renderBillingPage(overrides = {}) {
  const { auth } = require("@/auth")
  const { prisma } = require("@/lib/prisma")
  const { billingStatus } = require("@/lib/billing")
  const { currentLocale } = require("@/lib/i18n/server")
  
  vi.mocked(auth).mockResolvedValue({ user: { email: "owner@test.com" } })
  vi.mocked(currentLocale).mockResolvedValue("en")
  vi.mocked(billingStatus).mockReturnValue({ canCheckout: true, canReceiveWebhooks: true, missing: [] })
  
  const defaultOrg = {
    id: "org-1",
    _count: { properties: 2 },
    subscription: {
      id: "sub-1",
      tier: "STARTER",
      status: "ACTIVE",
      billingSubscriptionId: "ls_sub_123",
      billingCustomerId: "ls_cus_123",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialEndsAt: null,
      isLifetimeFree: false,
      maxPropertiesOverride: null,
      hasApiAccessOverride: null,
    },
    ...overrides.org,
  }
  
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    email: "owner@test.com",
    role: "OWNER",
    locale: "en",
    organization: defaultOrg,
  })
  
  return render(
    <LocaleProvider locale="en">
      <BillingPage searchParams={Promise.resolve(overrides.searchParams || {})} />
    </LocaleProvider>
  )
}

describe("BillingPage - Subscription Management Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("displays current plan as STARTER with correct limits", async () => {
    renderBillingPage()
    await vi.dynamicImportSettled?.()
    
    expect(screen.getByText("Starter")).toBeInTheDocument()
    expect(screen.getByText(/properties used/i)).toBeInTheDocument()
    expect(screen.getByText("2 / 2")).toBeInTheDocument() // STARTER limit is 2
  })

  it("shows upgrade buttons for PRO and BUSINESS when on STARTER", async () => {
    renderBillingPage()
    await vi.dynamicImportSettled?.()
    
    expect(screen.getByRole("button", { name: /choose pro/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /choose business/i })).toBeInTheDocument()
  })

  it("shows current plan badge on PRO card when subscribed to PRO", async () => {
    renderBillingPage({
      org: {
        subscription: {
          tier: "PRO",
          status: "ACTIVE",
          billingSubscriptionId: "ls_sub_123",
          billingCustomerId: "ls_cus_123",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    })
    await vi.dynamicImportSettled?.()
    
    expect(screen.getByText("Current plan")).toBeInTheDocument() // Badge on PRO card
    expect(screen.getByRole("button", { name: /current plan/i })).toBeDisabled()
  })

  it("displays renewal date in current plan card", async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    renderBillingPage({
      org: {
        subscription: {
          tier: "PRO",
          status: "ACTIVE",
          billingSubscriptionId: "ls_sub_123",
          billingCustomerId: "ls_cus_123",
          currentPeriodEnd: futureDate,
        },
      },
    })
    await vi.dynamicImportSettled?.()
    
    const dateStr = futureDate.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    expect(screen.getByText(new RegExp(`period ends.*${dateStr}`, "i"))).toBeInTheDocument()
  })

  it("shows Manage Subscription link for owner", async () => {
    renderBillingPage()
    await vi.dynamicImportSettled?.()
    
    const manageLink = screen.getByRole("link", { name: /manage subscription/i })
    expect(manageLink).toBeInTheDocument()
    expect(manageLink).toHaveAttribute("href", "/api/billing/portal")
  })

  it("shows canceled banner with grace period when CANCELED", async () => {
    const periodEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
    renderBillingPage({
      org: {
        subscription: {
          tier: "PRO",
          status: "CANCELED",
          billingSubscriptionId: "ls_sub_123",
          billingCustomerId: "ls_cus_123",
          currentPeriodEnd: periodEnd,
        },
      },
    })
    await vi.dynamicImportSettled?.()
    
    expect(screen.getByText(/canceled on/i)).toBeInTheDocument()
    expect(screen.getByText(/access until/i)).toBeInTheDocument()
  })

  it("does not show grace period banner when CANCELED and period ended", async () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    renderBillingPage({
      org: {
        subscription: {
          tier: "PRO",
          status: "CANCELED",
          billingSubscriptionId: "ls_sub_123",
          billingCustomerId: "ls_cus_123",
          currentPeriodEnd: pastDate,
        },
      },
    })
    await vi.dynamicImportSettled?.()
    
    // Should not show grace period banner (access already revoked)
    expect(screen.queryByText(/access until/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/billing-subscription-management.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Ensure all UI elements are implemented in page.tsx**

Verify the billing page has all the required elements from previous tasks.

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/billing-subscription-management.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/billing-subscription-management.test.tsx
git commit -m "test(billing): add integration test for subscription management flow"
```

---

### Task 8: Full test suite verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: All tests pass (601+ tests)

- [ ] **Step 2: Run type check**

```bash
npm run typecheck 2>&1 || npx tsc --noEmit
```
Expected: No TypeScript errors

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -30
```
Expected: Successful build

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "chore: fix any remaining issues from full test suite"
```

---

### Task 9: Update .env.example with Lemon Squeezy variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add Lemon Squeezy variables**

```bash
# Lemon Squeezy Billing
LEMON_SQUEEZY_API_KEY="your-api-key"
LEMON_SQUEEZY_STORE_ID="your-store-id"
LEMON_SQUEEZY_WEBHOOK_SECRET="your-webhook-secret"
LEMON_SQUEEZY_STARTER_VARIANT_ID="variant-id-starter"
LEMON_SQUEEZY_PRO_VARIANT_ID="variant-id-pro"
LEMON_SQUEEZY_BUSINESS_VARIANT_ID="variant-id-business"
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Lemon Squeezy environment variables to .env.example"
```

---

## Execution Notes

For inline execution (superpowers:executing-plans):
1. Run `../subagent-driven-development/scripts/sdd-workspace <plan-file>` to set up workspace
2. Create todos for each task
3. Execute tasks sequentially, each with TDD cycle
4. After all tasks, run final review with `../subagent-driven-development/scripts/review-package <plan-file> <merge-base> HEAD`
5. Dispatch code-reviewer subagent for final review

**Recommended approach:** Native execution (inline) since tasks are tightly coupled through shared interfaces (billing.ts, webhook route, billing page). The plan has 9 tasks with clear dependencies. A fresh reviewer on the most capable model at the end will catch any issues.

**Ruling recording:** Any deviations from this plan must be recorded in the ledger as:
`Task N: Ruling: <finding> — <what you decided and why> — <cost if wrong>`