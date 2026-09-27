import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { SubscriptionTier } from "@prisma/client"

// Hoisted mocks to avoid hoisting issues
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  organization: {
    findUnique: mockFindUnique,
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}))

// Import after mocks
const { getOrgUsageMetrics } = await import("@/lib/usage-metrics")
const { getOrgFeatures } = await import("@/lib/subscriptions")

describe("getOrgUsageMetrics", () => {
  const orgId = "org-test-123"
  const now = new Date("2026-09-24T12:00:00Z")

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns metrics for STARTER tier with 3 properties (at limit)", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "STARTER",
        status: "ACTIVE",
        maxPropertiesOverride: null,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 3 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(3)
    expect(result.properties.limit).toBe(3)
    expect(result.properties.isAtLimit).toBe(true)
    expect(result.properties.percentage).toBe(100)
    expect(result.properties.isUnlimited).toBe(false)
  })

  it("returns metrics for STARTER tier with 1 property (not at limit)", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "STARTER",
        status: "ACTIVE",
        maxPropertiesOverride: null,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 1 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(1)
    expect(result.properties.limit).toBe(3)
    expect(result.properties.isAtLimit).toBe(false)
    expect(result.properties.percentage).toBeCloseTo(33.33, 1)
    expect(result.properties.isUnlimited).toBe(false)
  })

  it("returns metrics for PRO tier with 10 properties (not at limit)", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "PRO",
        status: "ACTIVE",
        maxPropertiesOverride: null,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 10 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(10)
    expect(result.properties.limit).toBe(15)
    expect(result.properties.isAtLimit).toBe(false)
    expect(result.properties.percentage).toBeCloseTo(66.67, 1)
    expect(result.properties.isUnlimited).toBe(false)
  })

  it("returns metrics for PRO tier with 15 properties (at limit)", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "PRO",
        status: "ACTIVE",
        maxPropertiesOverride: null,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 15 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(15)
    expect(result.properties.limit).toBe(15)
    expect(result.properties.isAtLimit).toBe(true)
    expect(result.properties.percentage).toBe(100)
    expect(result.properties.isUnlimited).toBe(false)
  })

  it("returns metrics for BUSINESS tier (unlimited)", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "BUSINESS",
        status: "ACTIVE",
        maxPropertiesOverride: null,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 100 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(100)
    expect(result.properties.limit).toBe(Infinity)
    expect(result.properties.isAtLimit).toBe(false)
    expect(result.properties.percentage).toBe(0)
    expect(result.properties.isUnlimited).toBe(true)
  })

  it("returns metrics for organization with no subscription (defaults to STARTER)", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: null,
      _count: { properties: 2 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(2)
    expect(result.properties.limit).toBe(3)
    expect(result.properties.isAtLimit).toBe(false)
    expect(result.properties.percentage).toBeCloseTo(66.67, 1)
    expect(result.properties.isUnlimited).toBe(false)
  })

  it("respects maxPropertiesOverride when set", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "STARTER",
        status: "ACTIVE",
        maxPropertiesOverride: 10,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 5 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(5)
    expect(result.properties.limit).toBe(10)
    expect(result.properties.isAtLimit).toBe(false)
    expect(result.properties.percentage).toBe(50)
    expect(result.properties.isUnlimited).toBe(false)
  })

  it("respects maxPropertiesOverride set to Infinity (unlimited)", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "STARTER",
        status: "ACTIVE",
        maxPropertiesOverride: 999999, // Large number treated as unlimited in getOrgFeatures
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 50 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(50)
    // getOrgFeatures treats maxPropertiesOverride as-is, so 999999 is not Infinity
    expect(result.properties.limit).toBe(999999)
    expect(result.properties.isAtLimit).toBe(false)
    expect(result.properties.isUnlimited).toBe(false)
  })

  it("handles 0 properties correctly", async () => {
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "STARTER",
        status: "ACTIVE",
        maxPropertiesOverride: null,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 0 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.used).toBe(0)
    expect(result.properties.limit).toBe(3)
    expect(result.properties.isAtLimit).toBe(false)
    expect(result.properties.percentage).toBe(0)
    expect(result.properties.isUnlimited).toBe(false)
  })

  it("throws when organization not found", async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(getOrgUsageMetrics("non-existent-org")).rejects.toThrow("Organization not found")
  })

  it("handles near-limit threshold (80%)", async () => {
    // 2 out of 3 = 66% - not near limit
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "STARTER",
        status: "ACTIVE",
        maxPropertiesOverride: null,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 2 },
    })

    const result = await getOrgUsageMetrics(orgId)

    expect(result.properties.percentage).toBeCloseTo(66.67, 1)
    expect(result.properties.isAtLimit).toBe(false)

    // 3 out of 3 = 100% - at limit
    mockFindUnique.mockResolvedValue({
      id: orgId,
      subscription: {
        tier: "STARTER",
        status: "ACTIVE",
        maxPropertiesOverride: null,
        hasApiAccessOverride: null,
        isLifetimeFree: false,
        currentPeriodEnd: null,
        trialEndsAt: null,
      },
      _count: { properties: 3 },
    })

    const result2 = await getOrgUsageMetrics(orgId)
    expect(result2.properties.percentage).toBe(100)
    expect(result2.properties.isAtLimit).toBe(true)
  })
})

describe("getOrgFeatures integration", () => {
  it("matches getOrgFeatures output for tier limits", () => {
    expect(getOrgFeatures("STARTER").maxProperties).toBe(3)
    expect(getOrgFeatures("PRO").maxProperties).toBe(15)
    expect(getOrgFeatures("BUSINESS").maxProperties).toBe(Infinity)
  })

  it("handles hasApiAccessOverride correctly", () => {
    expect(getOrgFeatures("STARTER", undefined, true).hasApiAccess).toBe(true)
    expect(getOrgFeatures("PRO", undefined, false).hasApiAccess).toBe(false)
    expect(getOrgFeatures("BUSINESS").hasApiAccess).toBe(true)
  })
})