import type { BookingStatus } from "@prisma/client"

/**
 * The activity feed.
 *
 * Derived from the organization's own bookings on every request rather than
 * stored as notification rows: there is nothing to go stale, nothing to mark as
 * read, and no cron job to keep alive. An item exists exactly as long as the
 * thing it describes is true.
 *
 * Each kind is gated by the member's own preference, so switching one off
 * removes those items for that member alone.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** How far ahead an arrival or departure counts as "coming up". */
const UPCOMING_DAYS = 2

/**
 * How far back an unrecorded rate still counts as actionable — long enough to
 * catch last month's stragglers, short enough that the list is not an archive.
 */
const MISSING_RATE_LOOKBACK_DAYS = 30

export type ActivityKind = "CHECK_IN_DUE" | "STAY_ENDING" | "MISSING_RATE"

export interface ActivityItem {
  id: string
  kind: ActivityKind
  title: string
  description: string
  /** The moment the item is about; drives ordering and the relative label. */
  date: Date
  href: string
}

export interface ActivityBooking {
  id: string
  guestName: string
  startDate: Date
  endDate: Date
  status: BookingStatus
  totalAmount: number | null
  property: { id: string; name: string }
}

export interface NotificationPreferences {
  notifyCheckInsDue: boolean
  notifyStaysEnding: boolean
  notifyMissingRate: boolean
}

/**
 * The same three keys, counting items rather than switching them on. A distinct
 * type rather than a reuse of `NotificationPreferences`, because a count and a
 * toggle are different things and conflating them is how `true + 1` slips in.
 */
export type NotificationCounts = Record<keyof NotificationPreferences, number>

/** Statuses that mean the stay is still expected to happen. */
const ACTIVE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN"]

function withinDays(date: Date, from: Date, days: number): boolean {
  const delta = date.getTime() - from.getTime()
  return delta >= -DAY_MS && delta <= days * DAY_MS
}

function nights(booking: ActivityBooking): number {
  return Math.max(
    1,
    Math.round((booking.endDate.getTime() - booking.startDate.getTime()) / DAY_MS)
  )
}

/** Whole days from `now`, so "today" and "tomorrow" read naturally. */
function relativeDay(date: Date, now: Date): string {
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS)

  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  if (days === -1) return "yesterday"
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`
}

export function buildActivity(
  bookings: ActivityBooking[],
  preferences: NotificationPreferences,
  now: Date
): ActivityItem[] {
  const items: ActivityItem[] = []
  const bookingHref = (id: string) => `/dashboard/bookings/${id}`

  if (preferences.notifyCheckInsDue) {
    for (const booking of bookings) {
      if (booking.status === "CANCELLED" || booking.status === "CHECKED_OUT") continue
      if (!withinDays(booking.startDate, now, UPCOMING_DAYS)) continue

      items.push({
        id: `check-in-${booking.id}`,
        kind: "CHECK_IN_DUE",
        title: `${booking.guestName} arrives ${relativeDay(booking.startDate, now)}`,
        description: `${booking.property.name} · ${nights(booking)} night${nights(booking) === 1 ? "" : "s"} · ${booking.status.replace("_", " ").toLowerCase()}`,
        date: booking.startDate,
        href: bookingHref(booking.id),
      })
    }
  }

  if (preferences.notifyStaysEnding) {
    for (const booking of bookings) {
      if (booking.status === "CANCELLED") continue
      if (booking.status === "CHECKED_OUT") continue
      if (!withinDays(booking.endDate, now, UPCOMING_DAYS)) continue

      items.push({
        id: `stay-ending-${booking.id}`,
        kind: "STAY_ENDING",
        title: `${booking.guestName} checks out ${relativeDay(booking.endDate, now)}`,
        description: `${booking.property.name} · stay began ${relativeDay(booking.startDate, now)}`,
        date: booking.endDate,
        href: bookingHref(booking.id),
      })
    }
  }

  if (preferences.notifyMissingRate) {
    const oldest = new Date(now.getTime() - MISSING_RATE_LOOKBACK_DAYS * DAY_MS)

    for (const booking of bookings) {
      if (booking.status === "CANCELLED" || booking.totalAmount != null) continue
      // Already-finished stays have no future departure to schedule from, so use
      // the end date to decide whether the gap is still worth chasing.
      if (booking.endDate < oldest) continue

      items.push({
        id: `missing-rate-${booking.id}`,
        kind: "MISSING_RATE",
        title: `No rate recorded for ${booking.guestName}`,
        description: `${booking.property.name} · ${ACTIVE_STATUSES.includes(booking.status) ? "stay not yet complete" : "completed stay"}`,
        date: booking.startDate,
        href: bookingHref(booking.id),
      })
    }
  }

  // Soonest first, but a missing rate is usually a past start date, so those
  // would sink to the bottom of a plain ascending sort. Sort by kind priority
  // first, then chronologically inside each kind.
  const priority: Record<ActivityKind, number> = {
    CHECK_IN_DUE: 0,
    STAY_ENDING: 1,
    MISSING_RATE: 2,
  }

  return items.sort((a, b) => {
    if (priority[a.kind] !== priority[b.kind]) return priority[a.kind] - priority[b.kind]
    return a.date.getTime() - b.date.getTime()
  })
}

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  CHECK_IN_DUE: "Check-in due",
  STAY_ENDING: "Stay ending",
  MISSING_RATE: "Missing rate",
}

/** The preference that gates each kind, so callers can look one up by kind. */
export const ACTIVITY_PREFERENCE: Record<ActivityKind, keyof NotificationPreferences> = {
  CHECK_IN_DUE: "notifyCheckInsDue",
  STAY_ENDING: "notifyStaysEnding",
  MISSING_RATE: "notifyMissingRate",
}

/**
 * How many items each toggle currently contributes.
 *
 * Settings shows these next to the checkboxes so the effect of switching one off
 * is visible before it is switched. Counted with every preference forced on —
 * deliberately, since a count that dropped to zero the moment you unchecked a box
 * would tell you nothing about what you were giving up.
 *
 * Derived by running the same builder the feed uses, so a count can never
 * disagree with the list it is describing.
 */
export function buildActivityCounts(
  bookings: ActivityBooking[],
  now: Date
): NotificationCounts {
  const allOn: NotificationPreferences = {
    notifyCheckInsDue: true,
    notifyStaysEnding: true,
    notifyMissingRate: true,
  }

  const byKind: Record<ActivityKind, number> = {
    CHECK_IN_DUE: 0,
    STAY_ENDING: 0,
    MISSING_RATE: 0,
  }

  for (const item of buildActivity(bookings, allOn, now)) {
    byKind[item.kind] += 1
  }

  return {
    notifyCheckInsDue: byKind.CHECK_IN_DUE,
    notifyStaysEnding: byKind.STAY_ENDING,
    notifyMissingRate: byKind.MISSING_RATE,
  }
}
