import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { BookingForm } from "@/components/bookings/BookingForm"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default async function NewBookingPage() {
  const { user, organization } = await requireMembership()

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow="Operations" title="New booking" />
        <Card>
          <CardHeader>
            <CardTitle>Not permitted</CardTitle>
            <CardDescription>
              Your role is view-only. Ask an owner or manager to add bookings.
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

  const properties = await prisma.property.findMany({
    where: { orgId: organization.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="New booking"
        description={`Dates and a rate go on the record you own — nothing is estimated.`}
        action={
          <Button variant="ghost" href="/dashboard/bookings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Stay details</CardTitle>
          <CardDescription>
            {properties.length === 0
              ? "You need a property first."
              : "Only the property, guest and dates are required."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingForm properties={properties} currency={organization.currency} />
        </CardContent>
      </Card>
    </div>
  )
}
