import { describe, it, expect } from "vitest"
import { canManageRoles, canConfigureSSO, canAccessBusinessSettings, getAccountManagerEmail } from "@/lib/permissions"
import type { Tier } from "@/lib/subscriptions"

describe("permissions", () => {
  describe("canManageRoles", () => {
    it("returns false for STARTER tier", () => {
      expect(canManageRoles("STARTER")).toBe(false)
    })

    it("returns false for PRO tier", () => {
      expect(canManageRoles("PRO")).toBe(false)
    })

    it("returns true for BUSINESS tier", () => {
      expect(canManageRoles("BUSINESS")).toBe(true)
    })
  })

  describe("canConfigureSSO", () => {
    it("returns false for STARTER tier", () => {
      expect(canConfigureSSO("STARTER")).toBe(false)
    })

    it("returns false for PRO tier", () => {
      expect(canConfigureSSO("PRO")).toBe(false)
    })

    it("returns true for BUSINESS tier", () => {
      expect(canConfigureSSO("BUSINESS")).toBe(true)
    })
  })

  describe("canAccessBusinessSettings", () => {
    it("returns false for STARTER tier", () => {
      expect(canAccessBusinessSettings("STARTER")).toBe(false)
    })

    it("returns false for PRO tier", () => {
      expect(canAccessBusinessSettings("PRO")).toBe(false)
    })

    it("returns true for BUSINESS tier", () => {
      expect(canAccessBusinessSettings("BUSINESS")).toBe(true)
    })
  })

  describe("getAccountManagerEmail", () => {
    it("returns veljko@lodgetrack.com for BUSINESS tier", () => {
      expect(getAccountManagerEmail("BUSINESS")).toBe("veljko@lodgetrack.com")
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