import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Building2, Plus, Search, Filter } from "lucide-react"
import Link from "next/link"

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your property portfolio</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/properties/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Properties</CardTitle>
          <CardDescription>
            {org.properties.length} / {features.maxProperties === Infinity ? "∞" : features.maxProperties} properties used
          </CardDescription>
        </CardHeader>
        <CardContent>
          {org.properties.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No properties yet</h3>
              <p className="mt-2 text-muted-foreground">Get started by adding your first property</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/properties/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {org.properties.map((property) => (
                <div key={property.id} className="border rounded-lg p-4 hover:bg-accent transition-colors">
                  <h3 className="font-semibold">{property.name}</h3>
                  <p className="text-sm text-muted-foreground">{property.address}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                      {property.bookings.filter(b => new Date(b.startDate) <= new Date() && new Date(b.endDate) >= new Date()).length} active
                    </span>
                    <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                      {property.bookings.length} total bookings
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/properties/${property.id}`}>View</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/properties/${property.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}