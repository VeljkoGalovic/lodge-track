import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Calendar, Plus } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { BOOKING_COUNT_FORMS, format, getDictionary, plural } from "@/lib/i18n/dictionaries"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { formatDateRange } from "@/lib/dashboard-metrics"
import { formatAmount } from "@/lib/currency"

export default async function BookingsPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/signin")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: {
        include: {
          subscription: true,
          properties: {
            include: {
              bookings: {
                include: { unit: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  })

  if (!user?.organization) {
    redirect("/onboarding")
  }

  // The locale lives on the member row, so it is only readable once that row is
  // in hand. The dashboard layout resolves the same value for the shell.
  const locale = await currentLocale(user.locale)
  const t = getDictionary(locale)

  const org = user.organization

  // Get all bookings with property info
  const allBookings = org.properties.flatMap(p =>
    p.bookings.map(b => ({
      ...b,
      propertyName: p.name,
      propertyId: p.id,
      propertyCurrency: p.currency || org.currency,
    }))
  ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.operations}
        title={t.pages.bookings.title}
        description={t.pages.bookings.description}
        action={
          <Button variant="outline" href="/dashboard/bookings/new">
            <Plus className="mr-2 h-4 w-4" />
            {t.pages.bookings.newButton}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.pages.bookings.allBookings}</CardTitle>
          <CardDescription>
            {format(t.pages.bookings.totalAcrossProperties, {
              bookings: plural(allBookings.length, BOOKING_COUNT_FORMS[locale], locale),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allBookings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-foreground">{t.pages.bookings.noBookingsYet}</h3>
              <p className="mt-2 text-sm text-subtle-foreground">
                {t.pages.bookings.emptyHelp}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.pages.bookings.guest}</TableHead>
                  <TableHead>{t.forms.property}</TableHead>
                  <TableHead>{t.forms.unit}</TableHead>
                  <TableHead>{t.pages.bookings.dates}</TableHead>
                  <TableHead>{t.forms.status}</TableHead>
                  <TableHead>{t.forms.source}</TableHead>
                  <TableHead className="text-right">{t.pages.bookings.amount}</TableHead>
                  <TableHead className="text-right">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium text-foreground">{booking.guestName}</TableCell>
                    <TableCell>{booking.propertyName}</TableCell>
                    <TableCell className="text-subtle-foreground">
                      {booking.unit?.name ?? t.forms.unitWholeProperty}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-subtle-foreground">
                      {formatDateRange(booking.startDate, booking.endDate, locale)}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell>{booking.source}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(booking.totalAmount, booking.propertyCurrency) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" href={`/dashboard/bookings/${booking.id}`}>
                        {t.common.view}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
