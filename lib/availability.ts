import type { BookingStatus } from "@prisma/client"

/**
 * Whether two stays can occupy the same property at once.
 *
 * A property is either booked whole or divided into units:
 *
 *   property with no units  → every booking has `unitId === null` and claims the
 *                             whole property, so any date overlap is a conflict.
 *                             This is exactly the behaviour that existed before
 *                             units did, which is why adding units to a property
 *                             needs no change to the bookings already on it.
 *   property with units     → a booking names one unit (`unitId` set). Two stays
 *                             in different units of the same property are
 *                             independent and do not conflict. That is the whole
 *                             point of splitting a property up.
 *
 * A whole-property booking always conflicts with a unit booking, because it
 * claims every unit at once. The rule below expresses both cases in one line.
 *
 * These are pure functions over rows the caller has already fetched *and scoped
 * by `orgId`*. They decide whether stays collide, never who may see them.
 */

/** Statuses that release the slot. A cancelled stay blocks nothing. */
const RELEASED_STATUSES: BookingStatus[] = ["CANCELLED"]

export function blocksSlot(status: BookingStatus): boolean {
  return !RELEASED_STATUSES.includes(status)
}

export interface SlotClaim {
  id: string
  propertyId: string
  /** Null means the whole property. */
  unitId: string | null
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
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime()
}

/** Whether two stays are competing for the same thing. */
export function claimsSameSlot(a: { unitId: string | null }, b: { unitId: string | null }): boolean {
  // Null claims the whole property, so it overlaps with everything on it.
  if (a.unitId === null || b.unitId === null) return true
  return a.unitId === b.unitId
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
  candidate: Pick<SlotClaim, "propertyId" | "unitId" | "startDate" | "endDate">,
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

/** A stay reduced to what the picker needs: which unit, and when. */
export interface BusyInterval {
  unitId: string | null
  startDate: Date
  endDate: Date
}

/**
 * A candidate stay, reduced to what availability depends on.
 *
 * Deliberately not a `SlotClaim`: deciding what is free is a question about
 * dates and units, and requiring a guest name and a status to answer it would
 * force callers to fetch columns the answer does not use.
 */
export interface RangeQuery {
  unitId: string | null
  startDate: Date
  endDate: Date
}

export interface UnitAvailability<TUnit> {
  unit: TUnit
  /** Whether this unit could take the candidate stay. */
  available: boolean
  /**
   * True when what blocks it is a whole-property stay rather than a booking on
   * the unit itself. The two read very differently to a host — one means "this
   * room is taken", the other means "the whole building is" — so the picker can
   * say which without re-deriving it.
   */
  blockedByWholeProperty: boolean
}

export interface AvailabilitySummary {
  total: number
  free: number
  occupied: number
  /** No unit is free because a stay on the property as a whole covers the range. */
  wholePropertyBlocked: boolean
}

/**
 * Per-unit availability for a candidate date range.
 *
 * This is `claimsSameSlot` asked once per unit instead of once per booking, which
 * is what makes the picker able to say "3 of 5 free" rather than only refusing
 * the stay after it is submitted. The rule itself is unchanged — a unit is free
 * exactly when no blocking interval claims it, and a whole-property stay
 * (`unitId: null`) claims every unit, so it takes them all out at once.
 *
 * A property with no units returns an empty list; its availability is a single
 * question with a single answer, and `findConflicts` is what answers it.
 */
export function unitAvailability<TUnit extends { id: string }>(
  candidate: Pick<RangeQuery, "startDate" | "endDate">,
  units: TUnit[],
  busy: BusyInterval[]
): UnitAvailability<TUnit>[] {
  const blocking = busy.filter((interval) =>
    rangesOverlap(candidate.startDate, candidate.endDate, interval.startDate, interval.endDate)
  )

  return units.map((unit) => {
    const claim = blocking.find((interval) =>
      claimsSameSlot({ unitId: unit.id }, { unitId: interval.unitId })
    )
    return {
      unit,
      available: claim === undefined,
      blockedByWholeProperty: claim !== undefined && claim.unitId === null,
    }
  })
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
    wholePropertyBlocked: hasUnits && free === 0,
  }
}
