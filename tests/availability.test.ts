import { describe, expect, it } from "vitest"
import { findConflicts, unitAvailability, summarizeAvailability, type SlotClaim } from "@/lib/availability"

const startDate = new Date("2026-09-01T00:00:00Z")
const endDate = new Date("2026-09-05T00:00:00Z")
const beds = Array.from({ length: 5 }, (_, i) => ({ id: `bed-${i + 1}` }))
const candidate = { propertyId: "motel", type: "WHOLE_UNIT" as const, unitId: "bed-4", bedIds: [], startDate, endDate }
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

describe("shared bed bookings", () => {
  const shared = (bedIds: string[], overrides: Partial<SlotClaim> = {}): SlotClaim => ({
    id: "shared-1",
    propertyId: "motel",
    type: "SHARED_BED",
    unitId: bedIds[0] ?? null,
    bedIds,
    startDate,
    endDate,
    status: "CONFIRMED",
    guestName: "Shared Guest",
    ...overrides,
  })

  it("lets a shared stay coexist with another shared stay on different beds", () => {
    expect(findConflicts(candidate, [shared(["bed-1", "bed-2"])])).toEqual([])
    expect(findConflicts({ ...candidate, type: "SHARED_BED", bedIds: ["bed-4"] }, [shared(["bed-1"])]))
      .toEqual([])
  })

  it("flags a conflict when two shared stays claim the same bed", () => {
    const rival = { ...candidate, type: "SHARED_BED" as const, bedIds: ["bed-4", "bed-5"] }
    expect(findConflicts(rival, [shared(["bed-4"])])).toHaveLength(1)
    expect(findConflicts(rival, [shared(["bed-1", "bed-2"])])).toEqual([])
  })

  it("an exclusive whole-property claim collides with any shared stay", () => {
    const whole = { ...candidate, unitId: null }
    expect(findConflicts(whole, [shared(["bed-2"])])).toHaveLength(1)
    expect(findConflicts({ ...candidate, type: "SHARED_BED" as const, bedIds: ["bed-5"] }, [shared(["bed-1"])]))
      .toEqual([])
  })

  it("a shared stay sees individually held beds as unavailable", () => {
    const busy = [shared(["bed-1"]), shared(["bed-3"], { id: "shared-2" })]
    const availability = unitAvailability(
      { propertyId: "motel", startDate, endDate },
      beds,
      busy
    )
    expect(availability.filter(x => !x.available).map(x => x.unit.id)).toEqual(["bed-1", "bed-3"])
    expect(summarizeAvailability(availability)).toEqual({
      total: 5,
      free: 3,
      occupied: 2,
      wholePropertyBlocked: false,
    })
  })

  it("cancelling a shared stay releases its beds", () => {
    const cancelled = shared(["bed-2"], { status: "CANCELLED" })
    expect(findConflicts({ ...candidate, type: "SHARED_BED" as const, bedIds: ["bed-2"] }, [cancelled]))
      .toEqual([])
  })
})
