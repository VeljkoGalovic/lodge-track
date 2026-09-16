import { requireMembership, canManage } from "@/lib/authorization"
import { getOrgFeatures } from "@/lib/subscriptions"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { PropertyForm } from "@/components/properties/PropertyForm"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default async function NewPropertyPage() {
  const { user, organization, subscription } = await requireMembership()

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow="Portfolio" title="Add a property" />
        <Card>
          <CardHeader>
            <CardTitle>Not permitted</CardTitle>
            <CardDescription>
              Your role is view-only. Ask an owner or manager to add properties.
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

  const features = getOrgFeatures(
    subscription?.tier ?? "STARTER",
    subscription?.maxPropertiesOverride,
    subscription?.hasApiAccessOverride
  )

  // The limit is enforced again in the action; this only decides what to show.
  const used = await prisma.property.count({ where: { orgId: organization.id } })
  const atLimit = used >= features.maxProperties

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Portfolio"
        title="Add a property"
        description={`This will be the ${used + 1} of ${features.maxProperties === Infinity ? "unlimited" : features.maxProperties} properties on your plan.`}
        action={
          <Button variant="ghost" href="/dashboard/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      {atLimit ? (
        <Card className="border-amber-400/25 bg-amber-400/[0.04]">
          <CardHeader>
            <CardTitle className="text-amber-300">Property limit reached</CardTitle>
            <CardDescription>
              Your plan allows {features.maxProperties} propert
              {features.maxProperties === 1 ? "y" : "ies"}. Upgrade to add more.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button href="/dashboard/billing">View plans</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Property details</CardTitle>
            <CardDescription>A name and address are all that is needed to start.</CardDescription>
          </CardHeader>
          <CardContent>
            <PropertyForm />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
