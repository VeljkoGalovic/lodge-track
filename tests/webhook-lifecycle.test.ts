import { describe, it, expect, vi, beforeEach } from "vitest"
import { applyEvent } from "@/app/api/billing/webhook/route"
import { Prisma } from "@prisma/client"
import { statusForProviderStatus, tierForVariantId } from "@/lib/billing"

vi.mock("server-only", () => ({}))
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

  it("handles subscription_paused", async () => {
    mockTx.subscription.findUnique.mockResolvedValue({ id: "sub-1" })
    mockTx.subscription.update.mockResolvedValue({})

    const payload = {
      meta: { event_name: "subscription_paused", custom_data: { org_id: "org-1" } },
      data: {
        id: "123",
        type: "subscriptions",
        attributes: {
          status: "paused",
          variant_id: 456,
          subscription_id: 789,
        },
      },
    }

    await applyEvent(mockTx as any, "subscription_paused", payload)

    expect(mockTx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: "PAUSED",
      }),
    })
  })

  it("handles subscription_unpaused", async () => {
    mockTx.subscription.findUnique.mockResolvedValue({ id: "sub-1" })
    mockTx.subscription.update.mockResolvedValue({})

    const payload = {
      meta: { event_name: "subscription_unpaused", custom_data: { org_id: "org-1" } },
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

    await applyEvent(mockTx as any, "subscription_unpaused", payload)

    expect(mockTx.subscription.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        status: "ACTIVE",
        currentPeriodEnd: expect.any(Date),
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

  it("handles unrecognized status gracefully", async () => {
    mockTx.subscription.findUnique.mockResolvedValue({ id: "sub-1" })
    vi.mocked(statusForProviderStatus).mockReturnValueOnce(null)

    const payload = {
      meta: { event_name: "subscription_updated", custom_data: { org_id: "org-1" } },
      data: {
        id: "123",
        type: "subscriptions",
        attributes: {
          status: "unknown_status",
          variant_id: 456,
          subscription_id: 789,
        },
      },
    }

    await applyEvent(mockTx as any, "subscription_updated", payload)

    // Should not update subscription for unrecognized status
    expect(mockTx.subscription.update).not.toHaveBeenCalled()
  })

  it("does nothing for non-subscription events", async () => {
    const payload = {
      meta: { event_name: "order_created", custom_data: { org_id: "org-1" } },
      data: {
        id: "123",
        type: "orders",
        attributes: {},
      },
    }

    await applyEvent(mockTx as any, "order_created", payload)

    expect(mockTx.subscription.update).not.toHaveBeenCalled()
  })

  it("acknowledges payment events without mutating subscription", async () => {
    const paymentEvents = [
      "subscription_payment_success",
      "subscription_payment_failed",
      "subscription_payment_refunded",
      "subscription_invoice_created",
    ]

    for (const eventName of paymentEvents) {
      vi.clearAllMocks()

      const payload = {
        meta: { event_name: eventName, custom_data: { org_id: "org-1" } },
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

      await applyEvent(mockTx as any, eventName, payload)

      // Should acknowledge (return without error) but NOT update subscription
      expect(mockTx.subscription.update).not.toHaveBeenCalled()
      expect(mockTx.subscription.findUnique).not.toHaveBeenCalled()
    }
  })
})