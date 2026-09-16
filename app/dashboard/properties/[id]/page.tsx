import { notFound } from "next/navigation"
import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge"
import { DeletePropertyButton } from "@/components/properties/DeletePropertyButton"
import { formatAmount, formatCurrency } from "@/lib/currency"
import { formatDateRange, monthWindow, statsForWindow } from "@/lib/dashboard-metrics"
import { ArrowLeft, Building2, Pencil } from "lucide-react"

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, organization } = await requireMembership()

  /**
   * Scoped by organization in the query itself. A property id belonging to
   * another tenant then returns nothing, so there is no separate check to
   * forget — `notFound()` is the only outcome.
   */
  const property = await prisma.property.findFirst({
    where: { id, orgId: organization.id },
    include: {
      bookings: { orderBy: { startDate: "desc" } },
    },
  })

  if (!property) notFound()

  const now = new Date()
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title={property.name}
        description={property.address}
        action={
          <>
            <Button variant="ghost" href="/dashboard/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {canEdit ? (
              <>
                <Button variant="outline" href={`/dashboard/properties/${property.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
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
          { label: "Status", value: occupied ? "Occupied" : "Available" },
          { label: "Bookings", value: String(bookings.length) },
          { label: "Revenue this month", value: formatCurrency(thisMonth.revenueCents, organization.currency) },
          { label: "Lifetime revenue", value: priced.length === 0 ? "—" : formatCurrency(lifetimeRevenue, organization.currency) },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#36BFAE]" />
            Upcoming stays
          </CardTitle>
          <CardDescription>
            {upcoming.length === 0
              ? "Nothing booked from today onwards."
              : `${upcoming.length} stay${upcoming.length === 1 ? "" : "s"} still to come.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No upcoming stays for this property.
            </p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{booking.guestName}</p>
                    <p className="text-sm text-slate-400">
                      {formatDateRange(booking.startDate, booking.endDate)} · {booking.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-300">
                      {formatAmount(booking.totalAmount, organization.currency) ?? "No rate"}
                    </span>
                    <BookingStatusBadge status={booking.status} />
                    <Button variant="ghost" size="sm" href={`/dashboard/bookings/${booking.id}`}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {bookings.length > 0 && upcoming.length !== bookings.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Past and cancelled</CardTitle>
            <CardDescription>
              {bookings.length - upcoming.length} earlier booking
              {bookings.length - upcoming.length === 1 ? "" : "s"} on this property.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookings
              .filter((booking) => !upcoming.some((item) => item.id === booking.id))
              .map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-300">{booking.guestName}</p>
                    <p className="text-sm text-slate-500">
                      {formatDateRange(booking.startDate, booking.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {booking.totalAmount == null ? (
                      <Badge variant="outline">No rate</Badge>
                    ) : (
                      <span className="text-sm text-slate-400">
                        {formatAmount(booking.totalAmount, organization.currency)}
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
