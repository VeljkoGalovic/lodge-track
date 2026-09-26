import { requireMembership, canManage } from "@/lib/authorization"
import { getOrgFeatures } from "@/lib/subscriptions"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { PropertyForm } from "@/components/properties/PropertyForm"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { format, getDictionary } from "@/lib/i18n/dictionaries"

export default async function NewPropertyPage() {
  const { user, organization, subscription } = await requireMembership()
  const t = getDictionary(await currentLocale(user.locale))

  if (!canManage(user.role)) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader eyebrow={t.pages.eyebrows.portfolio} title={t.pages.properties.newTitle} />
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.notPermitted}</CardTitle>
            <CardDescription>
              {t.pages.properties.viewOnlyAdd}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" href="/dashboard/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.pages.properties.backToProperties}
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
        eyebrow={t.pages.eyebrows.portfolio}
        title={t.pages.properties.newTitle}
        description={format(t.pages.properties.newDescription, {
          position: used + 1,
          total:
            features.maxProperties === Infinity ? t.common.unlimited : features.maxProperties,
        })}
        action={
          <Button variant="ghost" href="/dashboard/properties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.common.back}
          </Button>
        }
      />

      {atLimit ? (
        <Card className="border-warning/25 bg-warning/[0.04]">
          <CardHeader>
            <CardTitle className="text-warning">{t.pages.properties.limitReached}</CardTitle>
            <CardDescription>
              {format(t.pages.properties.limitHelp, { count: features.maxProperties })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button href="/dashboard/billing">{t.settings.viewPlans}</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.properties.details}</CardTitle>
            <CardDescription>{t.pages.properties.detailsHelp}</CardDescription>
          </CardHeader>
          <CardContent>
            <PropertyForm />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
