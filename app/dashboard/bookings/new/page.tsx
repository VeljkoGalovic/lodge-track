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

export default async function NewBookingPage() {
  const { user, organization } = await requireMembership()
  const t = getDictionary(await currentLocale(user.locale))

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow={t.pages.eyebrows.operations} title={t.pages.bookings.newTitle} />
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.notPermitted}</CardTitle>
            <CardDescription>
              {t.pages.bookings.viewOnly}
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

  const [properties, units, busy] = await Promise.all([
    prisma.property.findMany({
      where: { orgId: organization.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    unitsForOrganization(organization.id),
    unitBusyIntervals(organization.id),
  ])

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.operations}
        title={t.pages.bookings.newTitle}
        description={t.pages.bookings.newDescription}
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
          <BookingForm
            properties={properties}
            units={units}
            busy={busy}
            currency={organization.currency}
          />
        </CardContent>
      </Card>
    </div>
  )
}
