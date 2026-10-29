import { describe, expect, it } from "vitest"
import { needsHostedCheckout } from "@/lib/billing"

/**
 * The two forced-checkout gates (dashboard layout guard, post-verification
 * redirect) decide from this one function whether an organization still owes
 * the provider a hosted checkout. The rule: every registered org started on a
 * paid tier by product design and is walked to the provider — except a
 * deliberate lifetime grant, which is recorded without billing identifiers
 * and must reach the dashboard untouched instead of being bounced forever.
 */
describe("needsHostedCheckout", () => {
  it("every paid tier demands checkout when not a lifetime grant", () => {
    for (const tier of ["STARTER", "PRO", "BUSINESS"] as const) {
      expect(needsHostedCheckout({ tier, isLifetimeFree: false })).toBe(true)
    }
  })

  it("a lifetime grant never demands checkout on any tier", () => {
    for (const tier of ["STARTER", "PRO", "BUSINESS"] as const) {
      expect(needsHostedCheckout({ tier, isLifetimeFree: true })).toBe(false)
    }
  })

  it("absent subscriptions have nothing to gate on", () => {
    expect(needsHostedCheckout(null)).toBe(false)
    expect(needsHostedCheckout(undefined)).toBe(false)
  })
})
