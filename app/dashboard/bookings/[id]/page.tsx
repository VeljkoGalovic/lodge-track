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

const DAY_MS = 24 * 60 * 60 * 1000

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, organization } = await requireMembership()

  const booking = await prisma.booking.findFirst({
    where: { id, property: { orgId: organization.id } },
    include: { property: { select: { id: true, name: true, address: true } } },
  })

  if (!booking) notFound()

  const nights = Math.max(
    1,
    Math.round((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / DAY_MS)
  )

  const canEdit = canManage(user.role)
  const amount = formatAmount(booking.totalAmount, organization.currency)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title={booking.guestName}
        description={`${booking.property.name} · ${formatDateRange(booking.startDate, booking.endDate)}`}
        action={
          <>
            <Button variant="ghost" href="/dashboard/bookings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {canEdit ? <BookingActions bookingId={booking.id} guestName={booking.guestName} /> : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <CalendarDays className="h-4 w-4" />
              Stay
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {nights} night{nights === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <Tag className="h-4 w-4" />
              Rate
            </p>
            {/* An unpriced stay says so, rather than showing a zero it did not earn. */}
            <p className="mt-1 text-2xl font-semibold text-white">{amount ?? "Not recorded"}</p>
            {amount ? (
              <p className="mt-1 text-xs text-slate-500">
                {formatAmount(Math.round(booking.totalAmount! / nights), organization.currency)} per night
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400">Status</p>
            <div className="mt-2">
              <BookingStatusBadge status={booking.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-400">Source</p>
            <p className="mt-1 text-2xl font-semibold text-white">{booking.source}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-[#36BFAE]" />
            Property
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-white">{booking.property.name}</p>
            <p className="text-sm text-slate-400">{booking.property.address}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            href={`/dashboard/properties/${booking.property.id}`}
          >
            View property
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record</CardTitle>
          <CardDescription>What this booking was created from.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-400">Created</p>
            <p className="text-white">
              {booking.createdAt.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Booking reference</p>
            <p className="break-all font-mono text-sm text-slate-300">{booking.id}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
