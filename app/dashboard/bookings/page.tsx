import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Calendar, Plus } from "lucide-react"
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
              bookings: true
            }
          }
        }
      }
    }
  })

  if (!user?.organization) {
    redirect("/onboarding")
  }

  const org = user.organization

  // Get all bookings with property info
  const allBookings = org.properties.flatMap(p =>
    p.bookings.map(b => ({ ...b, propertyName: p.name, propertyId: p.id }))
  ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Bookings"
        description="Every stay across your properties, most recent first."
        action={
          <Button variant="outline" href="/dashboard/bookings/new">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>{allBookings.length} total bookings across your properties</CardDescription>
        </CardHeader>
        <CardContent>
          {allBookings.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <Calendar className="h-6 w-6 text-[#36BFAE]" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">No bookings yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                Bookings will appear here when guests reserve your properties
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium text-white">{booking.guestName}</TableCell>
                    <TableCell>{booking.propertyName}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-400">
                      {formatDateRange(booking.startDate, booking.endDate)}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell>{booking.source}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(booking.totalAmount, org.currency) ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" href={`/dashboard/bookings/${booking.id}`}>
                        View
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
