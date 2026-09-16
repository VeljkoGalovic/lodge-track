import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Calendar, Plus, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { clsx } from "clsx"

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
  const subscription = org.subscription

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined
  )

  // Get all bookings with property info
  const allBookings = org.properties.flatMap(p =>
    p.bookings.map(b => ({ ...b, propertyName: p.name, propertyId: p.id }))
  ).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  const now = new Date()

  const statusStyles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
    "checked-out": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage all your bookings</p>
        </div>
        <Button variant="outline" asChild href="/dashboard/bookings/new">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>{allBookings.length} total bookings across your properties</CardDescription>
        </CardHeader>
        <CardContent>
          {allBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No bookings yet</h3>
              <p className="mt-2 text-muted-foreground">Bookings will appear here when guests reserve your properties</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.guestName}</TableCell>
                      <TableCell>{booking.propertyName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[booking.status.toLowerCase()] || statusStyles.pending}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{booking.source}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/bookings/${booking.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}