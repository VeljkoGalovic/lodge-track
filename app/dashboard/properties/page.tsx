import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Building2, Plus } from "lucide-react"

export default async function PropertiesPage() {
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

  const now = new Date()
  const properties = [...org.properties].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        description="Manage your property portfolio."
        action={
          <Button href="/dashboard/properties/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>All Properties</CardTitle>
          <CardDescription>
            {properties.length} / {features.maxProperties === Infinity ? "∞" : features.maxProperties} properties used
          </CardDescription>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <Building2 className="h-6 w-6 text-[#36BFAE]" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">No properties yet</h3>
              <p className="mt-2 text-sm text-slate-400">
                Get started by adding your first property
              </p>
              <Button href="/dashboard/properties/new" className="mt-6">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => {
                const occupied = property.bookings.some(
                  (booking) =>
                    booking.status !== "CANCELLED" &&
                    new Date(booking.startDate) <= now &&
                    new Date(booking.endDate) >= now
                )
                const bookingCount = property.bookings.length

                return (
                  <div
                    key={property.id}
                    className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/5 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-white">{property.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                          {property.address}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                        <Building2 className="h-5 w-5 text-[#36BFAE]" />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {occupied ? (
                        <Badge variant="success">Occupied</Badge>
                      ) : (
                        <Badge variant="secondary">Available</Badge>
                      )}
                      <Badge variant="outline">
                        {bookingCount} booking{bookingCount === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    <div className="mt-5 flex gap-2 border-t border-white/[0.06] pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        href={`/dashboard/properties/${property.id}`}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        href={`/dashboard/properties/${property.id}/edit`}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
