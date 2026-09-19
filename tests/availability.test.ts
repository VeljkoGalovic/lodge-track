import { describe, expect, it } from "vitest"
import { findConflicts, unitAvailability, summarizeAvailability, type SlotClaim } from "@/lib/availability"

const startDate = new Date("2026-09-01T00:00:00Z")
const endDate = new Date("2026-09-05T00:00:00Z")
const beds = Array.from({ length: 5 }, (_, i) => ({ id: `bed-${i + 1}` }))
const candidate = { propertyId: "motel", unitId: "bed-4", startDate, endDate }
const claims: SlotClaim[] = beds.slice(0, 3).map((bed, i) => ({
  ...candidate, id: `booking-${i}`, unitId: bed.id, status: "CONFIRMED", guestName: "Guest",
}))

describe("independent bed reservations", () => {
  it("does not let another property's whole booking block these beds", () => {
    const other = { ...claims[0], propertyId: "other", unitId: null }
    expect(unitAvailability(candidate, beds, [other]).every(x => x.available)).toBe(true)
  })
  it("distinguishes all individual beds occupied from a whole-property lock", () => {
    const all = beds.map(bed => ({ ...claims[0], unitId: bed.id }))
    expect(summarizeAvailability(unitAvailability(candidate, beds, all)).wholePropertyBlocked).toBe(false)
  })
  it("reports a whole-property lock regardless of interval order", () => {
    const whole = { ...claims[0], unitId: null }
    expect(unitAvailability(candidate, beds, [...claims, whole]).every(x => x.blockedByWholeProperty)).toBe(true)
  })
  it("keeps exactly two of five beds free when three are booked", () => {
    expect(unitAvailability(candidate, beds, claims).filter(x => x.available).map(x => x.unit.id))
      .toEqual(["bed-4", "bed-5"])
    expect(findConflicts(candidate, claims)).toEqual([])
  })
  it("blocks all beds when the property is booked whole", () => {
    const whole = { ...claims[0], unitId: null }
    expect(unitAvailability(candidate, beds, [whole]).every(x => !x.available)).toBe(true)
    expect(findConflicts(candidate, [whole])).toEqual([whole])
    expect(findConflicts({ ...candidate, unitId: null }, claims)).toHaveLength(3)
  })
})
