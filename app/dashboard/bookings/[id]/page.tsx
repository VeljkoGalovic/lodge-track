import { notFound } from "next/navigation"
import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge"
import { BookingActions } from "@/components/bookings/BookingActions"
import { formatAmount } from "@/lib/currency"
import { formatDateRange } from "@/lib/dashboard-metrics"
import { ArrowLeft, CalendarDays, Home, Tag } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { format, getDictionary, NIGHT_FORMS, plural } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/locales"

const DAY_MS = 24 * 60 * 60 * 1000

/** A `Date` as a long day, in the reader's language. */
function formatLongDay(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "sr" ? "sr-Latn-RS" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, organization } = await requireMembership()
  const locale = await currentLocale(user.locale)
  const t = getDictionary(locale)

  const booking = await prisma.booking.findFirst({
    where: { id, property: { orgId: organization.id } },
    include: { property: { select: { id: true, name: true, address: true, currency: true } } },
  })

  if (!booking) notFound()

  const nights = Math.max(
    1,
    Math.round((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / DAY_MS)
  )

  const canEdit = canManage(user.role)
  const currency = booking.property.currency || organization.currency
  const amount = formatAmount(booking.totalAmount, currency)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.operations}
        title={booking.guestName}
        description={`${booking.property.name} · ${formatDateRange(booking.startDate, booking.endDate, locale)}`}
        action={
          <>
            <Button variant="ghost" href="/dashboard/bookings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.back}
            </Button>
            {canEdit ? <BookingActions bookingId={booking.id} guestName={booking.guestName} /> : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-2 text-sm text-subtle-foreground">
              <CalendarDays className="h-4 w-4" />
              {t.pages.bookings.stay}
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {plural(nights, NIGHT_FORMS[locale], locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-2 text-sm text-subtle-foreground">
              <Tag className="h-4 w-4" />
              {t.pages.bookings.rate}
            </p>
            {/* An unpriced stay says so, rather than showing a zero it did not earn. */}
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {amount ?? t.pages.bookings.notRecorded}
            </p>
            {amount ? (
              <p className="mt-1 text-xs text-subtle-foreground">
                {format(t.pages.bookings.perNight, {
                  amount: formatAmount(Math.round(booking.totalAmount! / nights), currency) ?? "",
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-subtle-foreground">{t.forms.status}</p>
            <div className="mt-2">
              <BookingStatusBadge status={booking.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-subtle-foreground">{t.forms.source}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{booking.source}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            {t.forms.property}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{booking.property.name}</p>
            <p className="text-sm text-subtle-foreground">{booking.property.address}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            href={`/dashboard/properties/${booking.property.id}`}
          >
            {t.pages.bookings.viewProperty}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.pages.bookings.record}</CardTitle>
          <CardDescription>{t.pages.bookings.recordHelp}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-subtle-foreground">{t.pages.bookings.created}</p>
            <p className="text-foreground">{formatLongDay(booking.createdAt, locale)}</p>
          </div>
          <div>
            <p className="text-sm text-subtle-foreground">{t.pages.bookings.reference}</p>
            <p className="break-all font-mono text-sm text-muted-foreground">{booking.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
