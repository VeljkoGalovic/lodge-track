import { notFound } from "next/navigation"
import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge"
import { DeletePropertyButton } from "@/components/properties/DeletePropertyButton"
import { UnitsCard } from "@/components/properties/UnitsCard"
import { formatAmount, formatCurrency } from "@/lib/currency"
import { EXPENSE_CATEGORY_STYLES } from "@/lib/expense-category"
import { cn } from "@/lib/utils"
import { formatDateRange, monthWindow, statsForWindow } from "@/lib/dashboard-metrics"
import { currentLocale } from "@/lib/i18n/server"
import { BOOKING_COUNT_FORMS, EXPENSE_COUNT_FORMS, format, getDictionary, plural } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/locales"
import { ArrowLeft, Building2, Paperclip, Pencil, Plus, Receipt } from "lucide-react"

/** A `Date` as a plain day, matching how the expenses list renders dates. */
function formatExpenseDay(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "sr" ? "sr-Latn-RS" : "en-US", { day: "numeric", month: "short", year: "numeric" })
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, organization } = await requireMembership()
  const locale = await currentLocale(user.locale)
  const t = getDictionary(locale)

  /**
   * Scoped by organization in the query itself. A property id belonging to
   * another tenant then returns nothing, so there is no separate check to
   * forget — `notFound()` is the only outcome.
   */
  const property = await prisma.property.findFirst({
    where: { id, orgId: organization.id },
    include: {
      bookings: {
        orderBy: { startDate: "desc" },
        include: { unit: { select: { name: true } } },
      },
      units: { orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } },
      expenses: { orderBy: { date: "desc" } },
    },
  })

  if (!property) notFound()

  const now = new Date()
  const displayCurrency = property.currency || organization.currency
  const thisMonth = statsForWindow([property], monthWindow(now))
  const bookings = property.bookings

  const priced = bookings.filter((booking) => booking.status !== "CANCELLED" && booking.totalAmount != null)
  const lifetimeRevenue = priced.reduce((sum, booking) => sum + (booking.totalAmount ?? 0), 0)

  const upcoming = bookings
    .filter(
      (booking) =>
        booking.status !== "CANCELLED" &&
        booking.status !== "CHECKED_OUT" &&
        new Date(booking.endDate) >= now
    )
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  const occupied = bookings.some(
    (booking) =>
      booking.status !== "CANCELLED" &&
      new Date(booking.startDate) <= now &&
      new Date(booking.endDate) >= now
  )

  const canEdit = canManage(user.role)

  /**
   * Counted from the bookings already in hand rather than a second query: this
   * page has to load them anyway, and the number that matters — what stops a unit
   * being removed — is exactly "non-cancelled stays pointing at it".
   */
  const units = property.units.map((unit) => ({
    ...unit,
    activeBookings: bookings.filter(
      (booking) => booking.unitId === unit.id && booking.status !== "CANCELLED"
    ).length,
  }))

  const expenses = property.expenses
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.portfolio}
        title={property.name}
        description={property.address}
        action={
          <>
            <Button variant="ghost" href="/dashboard/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.back}
            </Button>
            {canEdit ? (
              <>
                <Button variant="outline" href={`/dashboard/properties/${property.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {t.common.edit}
                </Button>
                <DeletePropertyButton
                  propertyId={property.id}
                  propertyName={property.name}
                  bookingCount={bookings.length}
                />
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t.forms.status, value: occupied ? t.pages.dashboard.recent.occupied : t.pages.dashboard.recent.available },
          { label: t.pages.bookings.title, value: String(bookings.length) },
          { label: t.pages.properties.revenueThisMonth, value: formatCurrency(thisMonth.revenueCents, displayCurrency) },
          { label: t.pages.properties.lifetimeRevenue, value: priced.length === 0 ? "—" : formatCurrency(lifetimeRevenue, displayCurrency) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-subtle-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t.pages.properties.upcomingStays}
          </CardTitle>
          <CardDescription>
            {upcoming.length === 0
              ? t.pages.properties.nothingUpcoming
              : format(t.pages.properties.upcomingSummary, { bookings: plural(upcoming.length, BOOKING_COUNT_FORMS[locale], locale) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle-foreground">
              {t.pages.properties.noUpcoming}
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{booking.guestName}</p>
                    <p className="text-sm text-subtle-foreground">
                      {booking.unit ? `${booking.unit.name} · ` : ""}
                      {formatDateRange(booking.startDate, booking.endDate, locale)} · {booking.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatAmount(booking.totalAmount, displayCurrency) ?? t.pages.properties.noRate}
                    </span>
                    <BookingStatusBadge status={booking.status} />
                    <Button variant="ghost" size="sm" href={`/dashboard/bookings/${booking.id}`}>
                      {t.common.view}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UnitsCard propertyId={property.id} units={units} canEdit={canEdit} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                {t.pages.expenses.title}
              </CardTitle>
              <CardDescription>
                {expenses.length === 0
                  ? t.pages.properties.noExpenses
                  : format(t.pages.properties.expenseSummary, { expenses: plural(expenses.length, EXPENSE_COUNT_FORMS[locale], locale), amount: formatCurrency(expenseTotal, displayCurrency) })}
              </CardDescription>
            </div>
            {canEdit ? (
              <Button variant="outline" size="sm" href="/dashboard/expenses/new">
                <Plus className="mr-2 h-4 w-4" />
                {t.pages.expenses.logExpense}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle-foreground">
              {t.pages.properties.expenseHelp}
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.slice(0, 8).map((expense) => (
                <div
                  key={expense.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-muted-foreground">{expense.description}</p>
                    <p className="text-sm text-subtle-foreground">{formatExpenseDay(expense.date, locale)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        EXPENSE_CATEGORY_STYLES[expense.category].badge
                      )}
                    >
                      {t.pages.expenses.categories[expense.category]}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatCurrency(expense.amount, displayCurrency)}
                    </span>
                    {expense.receiptPath ? (
                      <a
                        href={`/api/receipts/${expense.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                        title={expense.receiptName ?? t.pages.expenses.receipt}
                      >
                        <Paperclip className="h-4 w-4" />
                      </a>
                    ) : null}
                    {canEdit ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        href={`/dashboard/expenses/${expense.id}/edit`}
                      >
                        {t.common.edit}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {expenses.length > 8 ? (
                <p className="text-center text-sm text-subtle-foreground">
                  {format(t.pages.properties.olderExpenses, { expenses: plural(expenses.length - 8, EXPENSE_COUNT_FORMS[locale], locale) })}{" "}
                  <a
                    href={`/dashboard/expenses?propertyId=${property.id}`}
                    className="text-primary hover:underline"
                  >
                    {t.pages.properties.allExpenses}
                  </a>
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {bookings.length > 0 && upcoming.length !== bookings.length ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.properties.pastCancelled}</CardTitle>
            <CardDescription>
              {format(t.pages.properties.pastSummary, { bookings: plural(bookings.length - upcoming.length, BOOKING_COUNT_FORMS[locale], locale) })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookings
              .filter((booking) => !upcoming.some((item) => item.id === booking.id))
              .map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-muted-foreground">{booking.guestName}</p>
                    <p className="text-sm text-subtle-foreground">
                      {booking.unit ? `${booking.unit.name} · ` : ""}
                      {formatDateRange(booking.startDate, booking.endDate, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {booking.totalAmount == null ? (
                      <Badge variant="outline">{t.pages.properties.noRate}</Badge>
                    ) : (
                      <span className="text-sm text-subtle-foreground">
                        {formatAmount(booking.totalAmount, displayCurrency)}
                      </span>
                    )}
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
