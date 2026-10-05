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

  it("returns null when API call fails", async () => {
    vi.stubEnv("LEMON_SQUEEZY_API_KEY", "test-key")
    vi.stubEnv("LEMON_SQUEEZY_STORE_ID", "store-123")
    const { prisma } = await import("@/lib/prisma")
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      billingCustomerId: "cus_123",
      billingSubscriptionId: "sub_123",
    } as any)

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    })

    const url = await createCustomerPortalUrl("org-123")
    expect(url).toBeNull()
  })

  it("returns null when subscription not found", async () => {
    vi.stubEnv("LEMON_SQUEEZY_API_KEY", "test-key")
    vi.stubEnv("LEMON_SQUEEZY_STORE_ID", "store-123")
    const { prisma } = await import("@/lib/prisma")
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

    const url = await createCustomerPortalUrl("org-123")
    expect(url).toBeNull()
  })

  it("handles network exception", async () => {
    vi.stubEnv("LEMON_SQUEEZY_API_KEY", "test-key")
    vi.stubEnv("LEMON_SQUEEZY_STORE_ID", "store-123")
    const { prisma } = await import("@/lib/prisma")
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      billingCustomerId: "cus_123",
      billingSubscriptionId: "sub_123",
    } as any)

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    const url = await createCustomerPortalUrl("org-123")
    expect(url).toBeNull()
  })
})