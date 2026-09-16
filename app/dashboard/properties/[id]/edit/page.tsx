import { notFound } from "next/navigation"
import { requireMembership, canManage } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { PropertyForm } from "@/components/properties/PropertyForm"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, organization } = await requireMembership()

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow="Portfolio" title="Edit property" />
        <Card>
          <CardHeader>
            <CardTitle>Not permitted</CardTitle>
            <CardDescription>
              Your role is view-only. Ask an owner or manager to change this property.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" href="/dashboard/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to properties
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const property = await prisma.property.findFirst({
    where: { id, orgId: organization.id },
  })

  if (!property) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Edit property"
        description={property.name}
        action={
          <Button variant="ghost" href={`/dashboard/properties/${property.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Property details</CardTitle>
          <CardDescription>Changes take effect immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyForm
            property={{
              id: property.id,
              name: property.name,
              address: property.address,
              icalUrl: property.icalUrl,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
