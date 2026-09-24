import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client"
import {
  hasValidAccessWithGrace,
  getTrialExpiryWarning,
  GRACE_PERIOD_DAYS,
  handleTierDowngrade,
} from "@/lib/billing"

vi.mock("@/lib/prisma", () => {
  const mockFindMany = vi.fn<() => Promise<Array<{ id: string }>>>()
  const mockPrisma = {
    property: {
      findMany: mockFindMany,
    },
    $transaction: vi.fn(async (fn) => fn({
      booking: { deleteMany: vi.fn() },
      expense: { deleteMany: vi.fn() },
      propertyUnit: { deleteMany: vi.fn() },
      property: { deleteMany: vi.fn() },
    })),
    booking: { deleteMany: vi.fn() },
    expense: { deleteMany: vi.fn() },
    propertyUnit: { deleteMany: vi.fn() },
  }
  return { prisma: mockPrisma }
})

const { prisma } = await import("@/lib/prisma")
const mockFindMany = prisma.property.findMany as ReturnType<typeof vi.fn>

describe("billing lifecycle - grace period", () => {
  const now = new Date("2026-09-24T12:00:00Z")

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns true for ACTIVE status", () => {
    expect(hasValidAccessWithGrace("ACTIVE", null, null)).toBe(true)
  })

  it("returns true for PAUSED status", () => {
    expect(hasValidAccessWithGrace("PAUSED", null, null)).toBe(true)
  })

  it("returns true for TRIALING with no trialEndsAt", () => {
    expect(hasValidAccessWithGrace("TRIALING", null, null)).toBe(true)
  })

  it("returns true for TRIALING before trial expiry", () => {
    const trialEndsAt = new Date("2026-09-30T12:00:00Z") // 6 days from now
    expect(hasValidAccessWithGrace("TRIALING", trialEndsAt, null)).toBe(true)
  })

  it("returns false for TRIALING after trial expiry", () => {
    const trialEndsAt = new Date("2026-09-20T12:00:00Z") // 4 days ago
    expect(hasValidAccessWithGrace("TRIALING", trialEndsAt, null)).toBe(false)
  })

  it("returns false for CANCELED status", () => {
    expect(hasValidAccessWithGrace("CANCELED", null, null)).toBe(false)
  })

  describe("PAST_DUE grace period", () => {
    it("returns true for PAST_DUE within grace period (day 1)", () => {
      const currentPeriodEnd = new Date("2026-09-23T12:00:00Z") // 1 day ago
      // Grace period = 3 days from period end = 2026-09-26
      // Today is 2026-09-24, which is within grace period
      expect(hasValidAccessWithGrace("PAST_DUE", null, currentPeriodEnd)).toBe(true)
    })

    it("returns true for PAST_DUE on last day of grace period (day 3)", () => {
      const currentPeriodEnd = new Date("2026-09-21T12:00:00Z") // 3 days ago
      // Grace period ends 2026-09-24 (today)
      expect(hasValidAccessWithGrace("PAST_DUE", null, currentPeriodEnd)).toBe(true)
    })

    it("returns false for PAST_DUE after grace period (day 4)", () => {
      const currentPeriodEnd = new Date("2026-09-20T12:00:00Z") // 4 days ago
      // Grace period ended 2026-09-23
      expect(hasValidAccessWithGrace("PAST_DUE", null, currentPeriodEnd)).toBe(false)
    })

    it("returns true for PAST_DUE when currentPeriodEnd is null (no data)", () => {
      expect(hasValidAccessWithGrace("PAST_DUE", null, null)).toBe(true)
    })
  })
})

describe("billing lifecycle - trial expiry warnings", () => {
  const now = new Date("2026-09-24T12:00:00Z")

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null when trialEndsAt is null", () => {
    expect(getTrialExpiryWarning(null)).toBeNull()
  })

  it("returns 3 when trial ends in 3 days", () => {
    const trialEndsAt = new Date("2026-09-27T12:00:00Z")
    expect(getTrialExpiryWarning(trialEndsAt)).toBe(3)
  })

  it("returns 2 when trial ends in 2 days", () => {
    const trialEndsAt = new Date("2026-09-26T12:00:00Z")
    expect(getTrialExpiryWarning(trialEndsAt)).toBe(2)
  })

  it("returns 1 when trial ends in 1 day", () => {
    const trialEndsAt = new Date("2026-09-25T12:00:00Z")
    expect(getTrialExpiryWarning(trialEndsAt)).toBe(1)
  })

  it("returns null when trial ends today (0 days)", () => {
    const trialEndsAt = new Date("2026-09-24T12:00:00Z")
    expect(getTrialExpiryWarning(trialEndsAt)).toBeNull()
  })

  it("returns null when trial has already expired", () => {
    const trialEndsAt = new Date("2026-09-20T12:00:00Z")
    expect(getTrialExpiryWarning(trialEndsAt)).toBeNull()
  })

  it("returns null when trial ends in more than 3 days", () => {
    const trialEndsAt = new Date("2026-10-01T12:00:00Z")
    expect(getTrialExpiryWarning(trialEndsAt)).toBeNull()
  })
})

describe("billing lifecycle - handleTierDowngrade", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 0 when new tier has unlimited properties", async () => {
    const result = await handleTierDowngrade("org-123", "ENTERPRISE")
    expect(result).toBe(0)
    expect(prisma.property.findMany).not.toHaveBeenCalled()
  })

  it("returns 0 when current properties <= new tier limit", async () => {
    mockFindMany.mockResolvedValue([
      { id: "prop-1" },
      { id: "prop-2" },
    ])

    // PRO tier allows 15 properties
    const result = await handleTierDowngrade("org-123", "PRO")
    expect(result).toBe(0)
  })

  it("archives excess properties when downgrading from PRO to STARTER", async () => {
    // 5 properties, STARTER limit is 3, so 2 should be archived
    mockFindMany.mockResolvedValue([
      { id: "prop-1" },
      { id: "prop-2" },
      { id: "prop-3" },
      { id: "prop-4" },
      { id: "prop-5" },
    ])

    const result = await handleTierDowngrade("org-123", "STARTER")
    expect(result).toBe(2)

    // Verify transaction was called
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it("archives oldest properties first (by createdAt asc)", async () => {
    // 4 properties, STARTER limit is 3, so 1 should be archived (oldest)
    mockFindMany.mockResolvedValue([
      { id: "prop-1" },
      { id: "prop-2" },
      { id: "prop-3" },
      { id: "prop-4" },
    ])

    await handleTierDowngrade("org-123", "STARTER") // limit 3

    // Verify findMany was called with correct order
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: "org-123" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
    )
  })
})

describe("GRACE_PERIOD_DAYS constant", () => {
  it("is 3 days", () => {
    expect(GRACE_PERIOD_DAYS).toBe(3)
  })
})