// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { getDictionary } from "@/lib/i18n/dictionaries"

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/billing", () => ({ billingStatus: vi.fn() }))
vi.mock("@/lib/i18n/server", () => ({ currentLocale: async () => "en" }))
vi.mock("@/components/i18n/LocaleProvider", () => {
  const React = require("react")
  return {
    useI18n: () => ({ locale: "en", t: getDictionary("en") }),
    LocaleProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})
vi.mock("@/lib/subscriptions", () => ({
  getOrgFeatures: vi.fn((tier: string, override?: number | null) => ({
    tier,
    maxProperties: override ?? (tier === "STARTER" ? 3 : tier === "PRO" ? 15 : Infinity),
    maxStorageBytes: tier === "STARTER" ? 1_000_000_000 : tier === "PRO" ? 5_000_000_000 : Infinity,
    hasAdvancedAnalytics: tier !== "STARTER",
    hasTeamRoles: tier === "BUSINESS",
    hasApiAccess: tier === "BUSINESS",
  })),
  getTierBadgeColor: vi.fn((tier: string) => "badge-" + tier.toLowerCase()),
  getAccountManagerEmail: vi.fn((tier: string) => tier === "BUSINESS" ? "veljko@lodgetrack.com" : null),
  TIER_PRICES_CENTS: { STARTER: 1999, PRO: 4999, BUSINESS: 9999 },
  TIER_PRICE_STRINGS: { STARTER: "$19.99", PRO: "$49.99", BUSINESS: "$99.99" },
}))
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT") }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND") }),
}))

import { auth } from "@/auth"
import { billingStatus } from "@/lib/billing"
import BillingPage from "@/app/dashboard/billing/page"

const mockAuth = auth as vi.Mock
const mockBillingStatus = billingStatus as vi.Mock

async function renderBillingPage(overrides: { org?: any; searchParams?: any } = {}) {
  mockAuth.mockResolvedValue({ user: { email: "owner@test.com" } })
  mockBillingStatus.mockReturnValue({ canCheckout: true, canReceiveWebhooks: true, missing: [] })

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

  db.user.findUnique.mockResolvedValue({
    email: "owner@test.com",
    role: "OWNER",
    locale: "en",
    organization: defaultOrg,
  })

  const component = await BillingPage({ searchParams: Promise.resolve(overrides.searchParams || {}) })
  return render(component)
}

describe("BillingPage - Subscription Management Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("displays current plan as STARTER with correct limits", async () => {
    await renderBillingPage()

    // "Starter" appears in multiple places - target the current plan badge
    expect(screen.getByRole("heading", { name: "Starter", level: 3 })).toBeInTheDocument()
    expect(screen.getByText(/properties used/i)).toBeInTheDocument()
    expect(screen.getByText("2 / 3")).toBeInTheDocument() // STARTER limit is 3
  })

  it("shows upgrade links for PRO and BUSINESS when on STARTER", async () => {
    await renderBillingPage()

    // Buttons with href render as <a> tags (links), not <button>
    expect(screen.getByRole("link", { name: /choose pro/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /choose business/i })).toBeInTheDocument()
  })

  it("shows current plan badge on PRO card when subscribed to PRO", async () => {
    await renderBillingPage({
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

    // The "Current plan" badge appears on the PRO card - verify by checking
    // the disabled "Current plan" button which is only shown on the current tier's card
    const currentPlanButton = screen.getByRole("button", { name: /current plan/i })
    expect(currentPlanButton).toBeInTheDocument()
    expect(currentPlanButton).toBeDisabled()
    // Also verify the PRO tier name is shown in the comparison cards
    expect(screen.getByRole("heading", { name: "Pro", level: 3 })).toBeInTheDocument()
  })

  it("displays renewal date in current plan card", async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await renderBillingPage({
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

    const dateStr = futureDate.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    expect(screen.getByText(new RegExp(`renews on.*${dateStr}`, "i"))).toBeInTheDocument()
  })

  it("shows Manage Subscription link for owner", async () => {
    await renderBillingPage()

    const manageLink = screen.getByRole("link", { name: /manage subscription/i })
    expect(manageLink).toBeInTheDocument()
    expect(manageLink).toHaveAttribute("href", "/api/billing/portal")
  })

  it("shows canceled banner with grace period when CANCELED", async () => {
    const periodEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
    await renderBillingPage({
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

    // The banner text uses format() with "canceledBanner" key
    expect(screen.getByText(/canceled on/i)).toBeInTheDocument()
    expect(screen.getByText(/access until/i)).toBeInTheDocument()
  })

  it("does not show grace period banner when CANCELED and period ended", async () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    await renderBillingPage({
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

    // Should not show grace period banner (access already revoked)
    expect(screen.queryByText(/access until/i)).not.toBeInTheDocument()
  })
})