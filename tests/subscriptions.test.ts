import { describe, expect, it } from "vitest"
import {
  TIER_PRICES_CENTS,
  TIER_PRICE_STRINGS,
  getOrgFeatures,
  getTierBadgeColor,
  getTierLabel,
  type Tier,
} from "@/lib/subscriptions"

describe("TIER_PRICES_CENTS", () => {
  it("matches Lemon Squeezy configured prices exactly", () => {
    expect(TIER_PRICES_CENTS.STARTER).toBe(1999) // $19.99
    expect(TIER_PRICES_CENTS.PRO).toBe(4999) // $49.99
    expect(TIER_PRICES_CENTS.ENTERPRISE).toBe(9999) // $99.99
  })

  it("has exactly three tiers", () => {
    expect(Object.keys(TIER_PRICES_CENTS)).toEqual(["STARTER", "PRO", "ENTERPRISE"])
  })

  it("all values are positive integers (cents)", () => {
    for (const price of Object.values(TIER_PRICES_CENTS)) {
      expect(Number.isInteger(price)).toBe(true)
      expect(price).toBeGreaterThan(0)
    }
  })
})

describe("TIER_PRICE_STRINGS", () => {
  it("matches TIER_PRICES_CENTS converted to display strings", () => {
    expect(TIER_PRICE_STRINGS.STARTER).toBe("$19.99")
    expect(TIER_PRICE_STRINGS.PRO).toBe("$49.99")
    expect(TIER_PRICE_STRINGS.ENTERPRISE).toBe("$99.99")
  })

  it("has exactly three tiers", () => {
    expect(Object.keys(TIER_PRICE_STRINGS)).toEqual(["STARTER", "PRO", "ENTERPRISE"])
  })
})

describe("getOrgFeatures", () => {
  const tiers: Tier[] = ["STARTER", "PRO", "ENTERPRISE"]

  it("returns correct maxProperties for each tier", () => {
    expect(getOrgFeatures("STARTER").maxProperties).toBe(3)
    expect(getOrgFeatures("PRO").maxProperties).toBe(15)
    expect(getOrgFeatures("ENTERPRISE").maxProperties).toBe(Infinity)
  })

  it("returns correct maxStorageBytes for each tier (internal quota only)", () => {
    expect(getOrgFeatures("STARTER").maxStorageBytes).toBe(1_000_000_000) // 1 GB
    expect(getOrgFeatures("PRO").maxStorageBytes).toBe(5_000_000_000) // 5 GB
    expect(getOrgFeatures("ENTERPRISE").maxStorageBytes).toBe(Infinity)
  })

  it("returns correct feature flags for STARTER", () => {
    const features = getOrgFeatures("STARTER")
    expect(features.hasAdvancedAnalytics).toBe(false)
    expect(features.hasTeamRoles).toBe(false)
    expect(features.hasApiAccess).toBe(false)
  })

  it("returns correct feature flags for PRO", () => {
    const features = getOrgFeatures("PRO")
    expect(features.hasAdvancedAnalytics).toBe(true)
    expect(features.hasTeamRoles).toBe(true)
    expect(features.hasApiAccess).toBe(true)
  })

  it("returns correct feature flags for ENTERPRISE", () => {
    const features = getOrgFeatures("ENTERPRISE")
    expect(features.hasAdvancedAnalytics).toBe(true)
    expect(features.hasTeamRoles).toBe(true)
    expect(features.hasApiAccess).toBe(true)
  })

  it("applies maxPropertiesOverride when provided", () => {
    expect(getOrgFeatures("STARTER", 10).maxProperties).toBe(10)
    expect(getOrgFeatures("PRO", 5).maxProperties).toBe(5)
    expect(getOrgFeatures("ENTERPRISE", 100).maxProperties).toBe(100)
  })

  it("applies hasApiAccessOverride when explicitly false", () => {
    expect(getOrgFeatures("PRO", undefined, false).hasApiAccess).toBe(false)
    expect(getOrgFeatures("ENTERPRISE", undefined, false).hasApiAccess).toBe(false)
  })

  it("applies hasApiAccessOverride when explicitly true on STARTER", () => {
    expect(getOrgFeatures("STARTER", undefined, true).hasApiAccess).toBe(true)
  })

  it("returns tier in the result", () => {
    for (const tier of tiers) {
      expect(getOrgFeatures(tier).tier).toBe(tier)
    }
  })
})

describe("getTierBadgeColor", () => {
  it("returns badge color classes for each tier", () => {
    expect(getTierBadgeColor("STARTER")).toContain("border-white/10")
    expect(getTierBadgeColor("PRO")).toContain("border-[#36BFAE]/25")
    expect(getTierBadgeColor("ENTERPRISE")).toContain("border-[#BA87FF]/25")
  })
})

describe("getTierLabel", () => {
  it("returns human-readable labels", () => {
    expect(getTierLabel("STARTER")).toBe("Starter")
    expect(getTierLabel("PRO")).toBe("Pro")
    expect(getTierLabel("ENTERPRISE")).toBe("Enterprise")
  })
})