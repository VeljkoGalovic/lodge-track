import { notFound } from "next/navigation"
import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { BookingForm } from "@/components/bookings/BookingForm"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, organization } = await requireMembership()

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow="Operations" title="Edit booking" />
        <Card>
          <CardHeader>
            <CardTitle>Not permitted</CardTitle>
            <CardDescription>
              Your role is view-only. Ask an owner or manager to change this booking.
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

  const [booking, properties] = await Promise.all([
    prisma.booking.findFirst({
      where: { id, property: { orgId: organization.id } },
    }),
    prisma.property.findMany({
      where: { orgId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  if (!booking) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Edit booking"
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
            currency={organization.currency}
            booking={{
              id: booking.id,
              propertyId: booking.propertyId,
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
