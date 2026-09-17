import { notFound } from "next/navigation"
import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { unitBusyIntervals, unitsForOrganization } from "@/lib/units"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { BookingForm } from "@/components/bookings/BookingForm"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, organization } = await requireMembership()
  const t = getDictionary(await currentLocale(user.locale))

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow={t.pages.eyebrows.operations} title={t.pages.bookings.editTitle} />
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.notPermitted}</CardTitle>
            <CardDescription>
              {t.pages.bookings.viewOnlyEdit}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" href="/dashboard/bookings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [booking, properties, units, busy] = await Promise.all([
    prisma.booking.findFirst({
      where: { id, property: { orgId: organization.id } },
    }),
    prisma.property.findMany({
      where: { orgId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    unitsForOrganization(organization.id),
    /*
     * The booking being edited is excluded, so the unit it already holds is not
     * reported as unavailable on its own form — the server's conflict check
     * ignores the same booking for the same reason.
     */
    unitBusyIntervals(organization.id, id),
  ])

  if (!booking) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.operations}
        title={t.pages.bookings.editTitle}
        description={booking.guestName}
        action={
          <Button variant="ghost" href={`/dashboard/bookings/${booking.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Stay details</CardTitle>
          <CardDescription>Clearing the rate records the stay as unpriced.</CardDescription>
        </CardHeader>
        <CardContent>
          <BookingForm
            properties={properties}
            units={units}
            busy={busy}
            currency={organization.currency}
            booking={{
              id: booking.id,
              propertyId: booking.propertyId,
              unitId: booking.unitId,
              guestName: booking.guestName,
              startDate: booking.startDate,
              endDate: booking.endDate,
              source: booking.source,
              status: booking.status,
              totalAmount: booking.totalAmount,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
