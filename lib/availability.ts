import type { BookingStatus, BookingType } from "@prisma/client"

/**
 * Whether two stays can occupy the same property at once.
 *
 * A property is either booked whole or divided into units. On top of that, a
 * property may opt into *shared* bookings (`allowSharedBookings`), which turns
 * its units into bed slots and lets a stay claim specific beds while the rest
 * of the capacity stays sellable:
 *
 *   property with no units      → every booking is WHOLE_UNIT with no beds and
 *                                 claims the whole property, so any date overlap
 *                                 is a conflict. This is exactly the behaviour
 *                                 that existed before units did.
 *   property with units, no     → a WHOLE_UNIT stay names one unit (`unitId`
 *   shared bookings               set). Two stays in different units do not
 *                                 conflict. SHARED_BED stays do not exist here.
 *   property with shared        → a SHARED_BED stay claims exactly the beds in
 *   bookings                      `bedIds`, and a WHOLE_UNIT stay (booked
 *                                 "whole property, exclusive") claims every bed
 *                                 slot at once — which is what keeps an
 *                                 exclusive stay from overlapping a shared one.
 *
 * The rules below express all three cases. They are pure functions over rows
 * the caller has already fetched *and scoped by `orgId`*: they decide whether
 * stays collide, never who may see them.
 */

/** Statuses that release the slot. A cancelled stay blocks nothing. */
const RELEASED_STATUSES: BookingStatus[] = ["CANCELLED"]

export function blocksSlot(status: BookingStatus): boolean {
  return !RELEASED_STATUSES.includes(status)
}

export interface SlotClaim {
  id: string
  propertyId: string
  /** What the stay claims, which decides how `bedIds` is read. */
  type: BookingType
  /** Null means the whole property (the classic whole-property booking). */
  unitId: string | null
  /** The beds a SHARED_BED stay holds; empty for WHOLE_UNIT. */
  bedIds: string[]
  startDate: Date
  endDate: Date
  status: BookingStatus
  guestName: string
}

/**
 * Whether `[aStart, aEnd)` and `[bStart, bEnd)` share a moment.
 *
 * Half-open, deliberately: `endDate` is the check-out date, and a room vacated on
 * the 5th can be occupied on the 5th. Treating the interval as closed would make
 * every back-to-back booking look like a double-booking, which is the single most
 * common pattern in a property calendar.
 */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < aEnd && bStart < bEnd && aStart < bEnd && bStart < aEnd
}

/**
 * The bed slots a claim takes out, for the candidate's dates.
 *
 * - A whole-property claim (exclusive stay) takes every slot at once, which the
 *   `all: true` marker expresses instead of a list the caller would have to
 *   expand — and which could not be written anyway, since the property's bed
 *   list is not part of this rule.
 * - A shared-bed claim takes exactly the beds it names.
 * - A WHOLE_UNIT stay on a specific unit (non-shared properties) claims that
 *   unit as an exclusive room, represented as claiming its own id.
 */
export interface ClaimedSlots {
  /** Every bed slot of the property is taken for the range. */
  all: boolean
  /** Specific slot ids taken; meaningful only when `all` is false. */
  bedIds: string[]
}

export function claimedSlots(claim: Pick<SlotClaim, "type" | "unitId" | "bedIds">): ClaimedSlots {
  if (claim.type === "SHARED_BED") {
    return { all: false, bedIds: claim.bedIds ?? [] }
  }
  // Anything unknown behaves as a whole-unit claim, which is what every row
  // written before the `type` column existed means.
  return { all: claim.unitId === null, bedIds: claim.unitId === null ? [] : [claim.unitId] }
}

/**
 * Whether a candidate stay's beds collide with an existing claim.
 *
 * The date overlap itself is checked by the caller; this is only the slot
 * question. A whole-property claim collides with everything; otherwise the
 * collision is any shared bed id. A claim on a plain unit (non-shared property)
 * carries its unit id in `bedIds`, so the same id comparison covers it.
 */
export function slotsCollide(a: ClaimedSlots, b: ClaimedSlots): boolean {
  if (a.all || b.all) return true
  return a.bedIds.some((bed) => b.bedIds.includes(bed))
}

/** Whether two stays are competing for the same thing, dates aside. */
export function claimsSameSlot(
  a: Pick<SlotClaim, "type" | "unitId" | "bedIds">,
  b: Pick<SlotClaim, "type" | "unitId" | "bedIds">
): boolean {
  return slotsCollide(claimedSlots(a), claimedSlots(b))
}

/**
 * Existing stays that `candidate` cannot share the property with.
 *
 * `existing` is expected to be every non-cancelled booking on the candidate's
 * property whose dates already overlap it — that filtering belongs in the query,
 * where the database can do it, rather than being re-derived here.
 *
 * `ignoreId` is the booking being edited, which must not conflict with itself.
 *
 * Generic over the claim type so a caller that fetched extra columns alongside
 * the ones this rule needs — a unit name, say — gets them back on the conflicts
 * it returns, rather than having to match them up again by id.
 */
export function findConflicts<T extends SlotClaim>(
  candidate: Pick<SlotClaim, "propertyId" | "type" | "unitId" | "bedIds" | "startDate" | "endDate">,
  existing: T[],
  ignoreId?: string
): T[] {
  return existing.filter((other) => {
    if (other.id === ignoreId) return false
    if (other.propertyId !== candidate.propertyId) return false
    if (!blocksSlot(other.status)) return false
    if (!claimsSameSlot(candidate, other)) return false
    return rangesOverlap(candidate.startDate, candidate.endDate, other.startDate, other.endDate)
  })
}

/** A conflict as a sentence, naming what it would collide with. */
export function describeConflict(conflict: SlotClaim, unitName?: string | null): string {
  const where = unitName ? ` in ${unitName}` : ""
  return `${conflict.guestName}${where} already has that slot (${formatDay(conflict.startDate)} to ${formatDay(conflict.endDate)}).`
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

/** A stay reduced to what the picker needs: what it claims, and when. */
export interface BusyInterval {
  propertyId: string
  type: BookingType
  unitId: string | null
  bedIds: string[]
  startDate: Date
  endDate: Date
}

/**
 * A candidate stay, reduced to what availability depends on.
 *
 * Deliberately not a `SlotClaim`: deciding what is free is a question about
 * dates and slots, and requiring a guest name and a status to answer it would
 * force callers to fetch columns the answer does not use.
 */
export interface RangeQuery {
  propertyId: string
  type: BookingType
  unitId: string | null
  bedIds: string[]
  startDate: Date
  endDate: Date
}

export interface UnitAvailability<TUnit> {
  unit: TUnit
  /** Whether this bed slot could take the candidate stay. */
  available: boolean
  /**
   * True when what blocks it is a whole-property stay rather than a booking on
   * the slot itself. The two read very differently to a host — one means "this
   * bed is taken", the other means "the whole building is" — so the picker can
   * say which without re-deriving it.
   */
  blockedByWholeProperty: boolean
}

export interface AvailabilitySummary {
  total: number
  free: number
  occupied: number
  /** No slot is free because a whole-property stay on the property covers the range. */
  wholePropertyBlocked: boolean
}

/** Overlapping busy intervals for one property, whatever the caller fetched. */
function blockingIntervals(
  candidate: Pick<RangeQuery, "propertyId" | "startDate" | "endDate">,
  busy: BusyInterval[]
): BusyInterval[] {
  return busy.filter(
    (interval) =>
      interval.propertyId === candidate.propertyId &&
      rangesOverlap(candidate.startDate, candidate.endDate, interval.startDate, interval.endDate)
  )
}

/**
 * Per-slot availability for a candidate date range.
 *
 * This is `claimsSameSlot` asked once per slot instead of once per booking,
 * which is what makes the picker able to say "3 of 5 free" rather than only
 * refusing the stay after it is submitted. The rule itself is unchanged — a slot
 * is free exactly when no blocking interval claims it, and a whole-property stay
 * claims every slot, so it takes them all out at once.
 *
 * A property with no units returns an empty list; its availability is a single
 * question with a single answer, and `findConflicts` is what answers it.
 */
export function unitAvailability<TUnit extends { id: string }>(
  candidate: Pick<RangeQuery, "propertyId" | "startDate" | "endDate">,
  units: TUnit[],
  busy: BusyInterval[]
): UnitAvailability<TUnit>[] {
  const blocking = blockingIntervals(candidate, busy)

  return units.map((unit) => {
    const claim = blocking.find((interval) =>
      claimsSameSlot(
        { type: "SHARED_BED", unitId: unit.id, bedIds: [unit.id] },
        interval
      )
    )
    return {
      unit,
      available: claim === undefined,
      blockedByWholeProperty: blocking.some((interval) => claimsWholeProperty(interval)),
    }
  })
}

/** Whether an existing stay is a whole-property/exclusive claim. */
function claimsWholeProperty(interval: BusyInterval): boolean {
  return interval.type === "WHOLE_UNIT" && interval.unitId === null
}

export function summarizeAvailability<TUnit>(
  availability: UnitAvailability<TUnit>[]
): AvailabilitySummary {
  const free = availability.filter((entry) => entry.available).length
  const hasUnits = availability.length > 0

  return {
    total: availability.length,
    free,
    occupied: availability.length - free,
    // Only meaningful when the property is divided up at all. With no units the
    // caller is looking at a single whole-property booking, and calling that
    // "blocked by a whole-property stay" would be circular.
    wholePropertyBlocked: hasUnits && availability.every((entry) => entry.blockedByWholeProperty),
  }
}

/**
 * The first slot in `bedIds` that another overlapping stay already holds.
 *
 * Returned as the id itself so the caller can name the offending bed in its
 * error; null when every listed bed is free. `findConflicts` answers the same
 * question as a boolean — this exists because a multi-bed form wants to point
 * at *which* bed is taken, not merely that something is.
 */
export function firstTakenBed(
  candidate: Pick<RangeQuery, "propertyId" | "startDate" | "endDate">,
  bedIds: string[],
  busy: BusyInterval[]
): string | null {
  const blocking = blockingIntervals(candidate, busy)
  for (const bed of bedIds) {
    const claim = blocking.find((interval) =>
      claimsSameSlot({ type: "SHARED_BED", unitId: bed, bedIds: [bed] }, interval)
    )
    if (claim) return bed
  }
  return null
}
