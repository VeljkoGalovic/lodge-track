import { requireMembership } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { BOOKING_STATUS_STYLES } from "@/lib/booking-status"
import { cn } from "@/lib/utils"
import { BookingStatus } from "@prisma/client"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/** Monday-first, which is how a European property calendar reads. */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** How many booking chips a single day shows before collapsing into "+N more". */
const MAX_CHIPS_PER_DAY = 3

/** A stay as the calendar needs it — no amounts, no rate, nothing private. */
interface CalendarBooking {
  id: string
  guestName: string
  status: BookingStatus
  startDate: Date
  endDate: Date
  property: { name: string }
  unit: { name: string } | null
}

/** A local calendar day as `YYYY-MM-DD`, the key the grid is indexed by. */
function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** `YYYY-MM` as a month link, so navigation is a plain URL and needs no JS. */
function monthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

/**
 * Reads `?month=YYYY-MM`, falling back to the current month.
 *
 * Anything that is not exactly a real month — a wrong shape, or `2026-13` — is
 * rejected rather than coerced, so a hand-edited URL cannot put the page into a
 * state no link produces.
 */
function parseMonth(raw: string | undefined, now: Date): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(raw ?? "")
  if (!match) return new Date(now.getFullYear(), now.getMonth(), 1)

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  if (month < 0 || month > 11) return new Date(now.getFullYear(), now.getMonth(), 1)

  return new Date(year, month, 1)
}

/**
 * The days the grid renders: whole weeks, Monday to Sunday, covering the month.
 *
 * Padded out to complete weeks so every row has seven cells and the weekday
 * headings line up — a ragged final row is what makes a hand-rolled month view
 * look broken.
 */
function gridDays(monthStart: Date): Date[] {
  const first = new Date(monthStart)
  // `getDay()` is Sunday-based; shift so Monday is 0.
  const leading = (first.getDay() + 6) % 7
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - leading)

  const nextMonth = new Date(first.getFullYear(), first.getMonth() + 1, 1)
  const lastOfMonth = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000)
  const trailing = (7 - ((lastOfMonth.getDay() + 6) % 7) - 1) % 7
  const total = leading + lastOfMonth.getDate() + trailing

  return Array.from(
    { length: total },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
  )
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; propertyId?: string }>
}) {
  const { user, organization } = await requireMembership()
  const t = getDictionary(await currentLocale(user.locale))
  const params = await searchParams

  const now = new Date()
  const monthStart = parseMonth(params.month, now)
  const days = gridDays(monthStart)

  const previousMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)

  /**
   * The properties are fetched first and the booking query is then scoped to the
   * ids that came back, so a `propertyId` from the URL that belongs to another
   * tenant narrows the view to nothing rather than being trusted. The filter is
   * a convenience on top of `orgId`, never a substitute for it.
   */
  const properties = await prisma.property.findMany({
    where: { orgId: organization.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const selectedPropertyId = properties.some((property) => property.id === params.propertyId)
    ? params.propertyId
    : undefined

  /*
   * Dates are stored as local midnight (see `dateField`), so the whole calendar
   * is computed in local time and the window boundaries below line up with the
   * days the grid draws.
   *
   * The window is the *grid*, not the month: a stay spilling into the leading or
   * trailing days of a neighbouring month still belongs on the row that shows it.
   */
  const windowStart = days[0]
  const windowEnd = new Date(days[days.length - 1].getTime() + 24 * 60 * 60 * 1000)

  const bookings = await prisma.booking.findMany({
    where: {
      property: {
        orgId: organization.id,
        ...(selectedPropertyId ? { id: selectedPropertyId } : {}),
      },
      // SQL also drops bookings that end before the window opens or start after
      // it closes; the day-by-day pass below only sees what could land in a cell.
      startDate: { lt: windowEnd },
      endDate: { gt: windowStart },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      guestName: true,
      status: true,
      startDate: true,
      endDate: true,
      property: { select: { name: true } },
      unit: { select: { name: true } },
    },
  })

  /**
   * Day → the bookings occupying it.
   *
   * Half-open, matching the availability rule: `endDate` is the check-out day,
   * so a stay ending on the 5th fills cells up to and including the 4th. That is
   * the same interval the conflict check uses, so a night the calendar shows as
   * free is a night the booking form will accept.
   */
  const byDay = new Map<string, CalendarBooking[]>()
  for (const booking of bookings) {
    const lastNight = new Date(booking.endDate.getTime() - 24 * 60 * 60 * 1000)
    for (let day = new Date(booking.startDate); day <= lastNight; day.setDate(day.getDate() + 1)) {
      const key = dayKey(day)
      const existing = byDay.get(key)
      if (existing) existing.push(booking)
      else byDay.set(key, [booking])
    }
  }

  const todayKey = dayKey(now)
  const monthKey = monthParam(monthStart)

  /** Month links carry the property filter through, so the view is not reset. */
  function monthHref(target: Date): string {
    const query = new URLSearchParams({ month: monthParam(target) })
    if (selectedPropertyId) query.set("propertyId", selectedPropertyId)
    return `/dashboard/calendar?${query.toString()}`
  }

  function propertyHref(propertyId?: string): string {
    const query = new URLSearchParams({ month: monthKey })
    if (propertyId) query.set("propertyId", propertyId)
    return `/dashboard/calendar?${query.toString()}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.operations}
        title={t.pages.calendar.title}
        description={t.pages.calendar.description}
        action={
          <>
            <Button variant="ghost" size="sm" href={monthHref(previousMonth)} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" href={monthHref(new Date(now.getFullYear(), now.getMonth(), 1))}>
              Today
            </Button>
            <Button variant="ghost" size="sm" href={monthHref(nextMonth)} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                {MONTH_NAMES[monthStart.getMonth()]} {monthStart.getFullYear()}
              </CardTitle>
              <CardDescription>
                {bookings.length === 0
                  ? "No stays overlap this month."
                  : `${bookings.length} stay${bookings.length === 1 ? "" : "s"} shown. A stay fills every night up to its check-out day.`}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={selectedPropertyId ? "ghost" : "outline"}
                size="sm"
                href={propertyHref()}
              >
                All properties
              </Button>
              {properties.map((property) => (
                <Button
                  key={property.id}
                  variant={selectedPropertyId === property.id ? "outline" : "ghost"}
                  size="sm"
                  href={propertyHref(property.id)}
                >
                  {property.name}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-3 pb-4">
            {Object.values(BookingStatus).map((status) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-subtle-foreground">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border",
                    BOOKING_STATUS_STYLES[status].badge
                  )}
                />
                {BOOKING_STATUS_STYLES[status].label}
              </span>
            ))}
          </div>

          {/*
            Wide content stays inside its own scroller so the page body never
            scrolls sideways on a phone.
          */}
          <div className="overflow-x-auto">
            <div className="min-w-[46rem]">
              <div className="grid grid-cols-7 gap-1 pb-2">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="px-2 text-xs font-medium uppercase tracking-wide text-subtle-foreground"
                  >
                    {weekday}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = dayKey(day)
                  const inMonth = day.getMonth() === monthStart.getMonth()
                  const isToday = key === todayKey
                  const dayBookings = byDay.get(key) ?? []
                  const shown = dayBookings.slice(0, MAX_CHIPS_PER_DAY)
                  const hidden = dayBookings.length - shown.length

                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-[7rem] rounded-xl border p-1.5",
                        inMonth
                          ? "border-border bg-muted"
                          : "border-border/50 bg-transparent",
                        isToday && "border-primary/40 bg-primary/[0.06]"
                      )}
                    >
                      <div
                        className={cn(
                          "mb-1 flex items-center justify-between px-0.5 text-xs",
                          inMonth ? "text-subtle-foreground" : "text-subtle-foreground",
                          isToday && "font-semibold text-primary"
                        )}
                      >
                        <span>{day.getDate()}</span>
                        {dayBookings.length > 0 ? (
                          <span className="text-subtle-foreground">{dayBookings.length}</span>
                        ) : null}
                      </div>

                      <div className="space-y-1">
                        {shown.map((booking) => (
                          <Link
                            key={`${key}-${booking.id}`}
                            href={`/dashboard/bookings/${booking.id}`}
                            title={`${booking.guestName}${booking.unit ? ` — ${booking.unit.name}` : ""} · ${booking.property.name}`}
                            className={cn(
                              "block truncate rounded-md border px-1.5 py-1 text-[11px] leading-tight transition-opacity hover:opacity-80",
                              BOOKING_STATUS_STYLES[booking.status].badge
                            )}
                          >
                            {booking.guestName}
                            {booking.unit ? (
                              <span className="opacity-70"> · {booking.unit.name}</span>
                            ) : null}
                          </Link>
                        ))}
                        {hidden > 0 ? (
                          <p className="px-1.5 text-[11px] text-subtle-foreground">+{hidden} more</p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-subtle-foreground">
              Add a property to start putting stays on the calendar.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
