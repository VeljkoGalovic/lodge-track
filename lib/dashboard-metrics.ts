import type { BookingStatus } from "@prisma/client"
import { type ExchangeRates, convertAmount } from "@/lib/exchange-rates"
import type { ChartPoint } from "@/lib/metrics-display"
import type { Locale } from "@/lib/i18n/locales"

// `ChartPoint` and `percentChange` now live in the boundary-safe
// `lib/metrics-display.ts` (importable from client components); they are
// re-exported here so existing server call sites keep resolving.
export type { ChartPoint } from "@/lib/metrics-display"
export { percentChange } from "@/lib/metrics-display"

/**
 * Pure helpers behind the dashboard's headline numbers.
 *
 * Everything here derives from stored rows — no estimates, no randomised
 * placeholders. Where a figure genuinely cannot be computed (no prior period to
 * compare against, no rate recorded on a booking), the helper returns
 * `undefined`/`null` so the UI can show "—" rather than invent a value.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Structural shapes, so callers can pass Prisma rows with any `include`. */
export interface MetricsBooking {
  startDate: Date
  endDate: Date
  status: BookingStatus
  /** Cents; null when no rate was recorded. */
  totalAmount: number | null
}

export interface MetricsProperty {
  currency: string | null
  bookings: MetricsBooking[]
}

export interface MonthWindow {
  /** First instant of the month, inclusive. */
  start: Date
  /**
   * First instant of the *next* month, exclusive. Callers compare with `<` so a
   * booking starting late on the month's final day is not dropped.
   */
  end: Date
  /** Short month name for chart axes, in the requested locale. */
  label: string
}

export interface WindowStats {
  /** Non-cancelled bookings whose stay starts inside the window. */
  bookings: number
  /** How many of those carry a recorded rate. */
  pricedBookings: number
  revenueCents: number
}

/** The calendar month `offset` months away from `reference`. */
export function monthWindow(reference: Date, offset = 0, locale: Locale = "en"): MonthWindow {
  const start = new Date(reference.getFullYear(), reference.getMonth() + offset, 1)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  return {
    start,
    end,
    label: start.toLocaleDateString(locale === "sr" ? "sr-Latn-RS" : "en-US", { month: "short" }),
  }
}

/** Shifts by whole months, clamping the day so 31 Mar → 28/29 Feb. */
export function shiftMonths(date: Date, offset: number): Date {
  const shifted = new Date(date.getFullYear(), date.getMonth() + offset, 1)
  const lastDayOfMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
  shifted.setDate(Math.min(date.getDate(), lastDayOfMonth))
  return shifted
}

export function isCancelled(booking: MetricsBooking): boolean {
  return booking.status === "CANCELLED"
}

function startsWithin(booking: MetricsBooking, window: MonthWindow): boolean {
  const start = new Date(booking.startDate)
  return start >= window.start && start < window.end
}

export function coversInstant(booking: MetricsBooking, instant: Date): boolean {
  return new Date(booking.startDate) <= instant && new Date(booking.endDate) >= instant
}

/**
 * Revenue is recognised in the month the stay begins, so a window's bookings
 * and its revenue always describe the same set of stays.
 */
export function statsForWindow(
  properties: MetricsProperty[],
  window: MonthWindow,
  targetCurrency?: string,
  rates?: ExchangeRates
): WindowStats {
  const inWindow: Array<{ booking: MetricsBooking; currency: string | null }> = []
  for (const property of properties) {
    for (const booking of property.bookings) {
      if (!isCancelled(booking) && startsWithin(booking, window)) {
        inWindow.push({ booking, currency: property.currency })
      }
    }
  }

  const priced = inWindow.filter((b) => b.booking.totalAmount != null)

  const revenueCents = priced.reduce((sum, item) => {
    let amount = item.booking.totalAmount ?? 0
    if (targetCurrency && rates && item.currency && item.currency !== targetCurrency) {
      amount = convertAmount(amount, item.currency, targetCurrency, rates)
    }
    return sum + amount
  }, 0)

  return {
    bookings: inWindow.length,
    pricedBookings: priced.length,
    revenueCents,
  }
}

/** Share of properties with a stay covering `instant`, as a whole percent. */
export function occupancyAt(properties: MetricsProperty[], instant: Date): number {
  if (properties.length === 0) return 0

  const occupied = properties.filter((property) =>
    property.bookings.some((booking) => !isCancelled(booking) && coversInstant(booking, instant))
  ).length

  return Math.round((occupied / properties.length) * 100)
}

/**
 * Property-nights sold over property-nights available in the window, as a whole
 * percent. Overlapping stays on one property are unioned rather than summed, so
 * the result cannot exceed 100 through double-counting.
 */
export function occupancyForWindow(properties: MetricsProperty[], window: MonthWindow): number {
  if (properties.length === 0) return 0

  const days = Math.round((window.end.getTime() - window.start.getTime()) / DAY_MS)
  if (days <= 0) return 0

  let bookedNights = 0

  for (const property of properties) {
    const coveredDays = new Set<number>()

    for (const booking of property.bookings) {
      if (isCancelled(booking)) continue

      const start = Math.max(new Date(booking.startDate).getTime(), window.start.getTime())
      const end = Math.min(new Date(booking.endDate).getTime(), window.end.getTime())
      if (end < start) continue

      /**
       * `endDate` is treated as occupied, matching `coversInstant`, so a stay
       * running 10th–20th covers the 20th too. Offsets are rounded rather than
       * floored so a daylight-saving hour inside the month can't shift a day.
       */
      const dayOffset = (time: number) =>
        Math.round((time - window.start.getTime()) / DAY_MS)

      const firstDay = Math.max(0, dayOffset(start))
      const lastDay = Math.min(days - 1, dayOffset(end))

      for (let day = firstDay; day <= lastDay; day++) coveredDays.add(day)
    }

    bookedNights += coveredDays.size
  }

  return Math.round((bookedNights / (properties.length * days)) * 100)
}

/** Trailing `count` months of revenue (cents) and occupancy (percent). */
export function monthlySeries(
  properties: MetricsProperty[],
  reference: Date,
  count = 6,
  targetCurrency?: string,
  rates?: ExchangeRates,
  locale: Locale = "en"
): { revenue: ChartPoint[]; occupancy: ChartPoint[] } {
  const windows = Array.from({ length: count }, (_, index) =>
    monthWindow(reference, index - (count - 1), locale)
  )

  return {
    revenue: windows.map((window) => ({
      month: window.label,
      value: statsForWindow(properties, window, targetCurrency, rates).revenueCents,
    })),
    occupancy: windows.map((window) => ({
      month: window.label,
      value: occupancyForWindow(properties, window),
    })),
  }
}

/** e.g. "Sep 16 – Sep 20", with years added when the stay crosses one. */
export function formatDateRange(
  start: Date | string,
  end: Date | string,
  locale: Locale = "en"
): string {
  const from = new Date(start)
  const to = new Date(end)

  const tag = locale === "sr" ? "sr-Latn-RS" : "en-US"
  const short = (date: Date) => date.toLocaleDateString(tag, { month: "short", day: "numeric" })
  const withYear = (date: Date) =>
    date.toLocaleDateString(tag, { month: "short", day: "numeric", year: "numeric" })

  const sameYear = from.getFullYear() === to.getFullYear()
  return sameYear ? `${short(from)} – ${short(to)}` : `${withYear(from)} – ${withYear(to)}`
}
