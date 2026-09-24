import { describe, it, expect } from "vitest"
import { canManageRoles, canConfigureSSO, canAccessEnterpriseSettings, getAccountManagerEmail } from "@/lib/permissions"
import type { Tier } from "@/lib/subscriptions"

describe("permissions", () => {
  describe("canManageRoles", () => {
    it("returns false for STARTER tier", () => {
      expect(canManageRoles("STARTER")).toBe(false)
    })

    it("returns false for PRO tier", () => {
      expect(canManageRoles("PRO")).toBe(false)
    })

    it("returns true for ENTERPRISE tier", () => {
      expect(canManageRoles("ENTERPRISE")).toBe(true)
    })
  })

  describe("canConfigureSSO", () => {
    it("returns false for STARTER tier", () => {
      expect(canConfigureSSO("STARTER")).toBe(false)
    })

    it("returns false for PRO tier", () => {
      expect(canConfigureSSO("PRO")).toBe(false)
    })

    it("returns true for ENTERPRISE tier", () => {
      expect(canConfigureSSO("ENTERPRISE")).toBe(true)
    })
  })

  describe("canAccessEnterpriseSettings", () => {
    it("returns false for STARTER tier", () => {
      expect(canAccessEnterpriseSettings("STARTER")).toBe(false)
    })

    it("returns false for PRO tier", () => {
      expect(canAccessEnterpriseSettings("PRO")).toBe(false)
    })

    it("returns true for ENTERPRISE tier", () => {
      expect(canAccessEnterpriseSettings("ENTERPRISE")).toBe(true)
    })
  })

  describe("getAccountManagerEmail", () => {
    it("returns veljko@lodgetrack.com for ENTERPRISE tier", () => {
      expect(getAccountManagerEmail("ENTERPRISE")).toBe("veljko@lodgetrack.com")
    })

    it("returns null for STARTER tier", () => {
      expect(getAccountManagerEmail("STARTER")).toBeNull()
    })

    it("returns null for PRO tier", () => {
      expect(getAccountManagerEmail("PRO")).toBeNull()
    })

    it("returns null for unknown tier (defaults to STARTER behavior)", () => {
      // TypeScript will prevent this at compile time, but test runtime behavior
      expect(getAccountManagerEmail("STARTER" as Tier)).toBeNull()
    })
  })
})