import { requireMembership, isOwner } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { formatBytes, getOrgFeatures } from "@/lib/subscriptions"
import { buildActivityCounts } from "@/lib/activity"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { ProfileForm } from "@/components/settings/ProfileForm"
import { OrganizationForm } from "@/components/settings/OrganizationForm"
import { NotificationPreferencesForm } from "@/components/settings/NotificationPreferencesForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { getTierBadgeColor, getTierLabel } from "@/lib/subscriptions"
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"
import { receiptBytesUsed } from "@/lib/receipt-quota"
import { currentLocale } from "@/lib/i18n/server"
import { format, getDictionary } from "@/lib/i18n/dictionaries"
import { User, Building2, Bell, Palette, Shield, KeyRound, Mail, ArrowUpRight, Lock } from "lucide-react"
import { canManageRoles, canConfigureSSO, canAccessEnterpriseSettings } from "@/lib/permissions"
import { UsageMeter } from "@/components/dashboard/UsageMeter"

export default async function SettingsPage() {
  const { user, organization, subscription } = await requireMembership()
  // Read directly rather than through the client context: this is a server
  // component, and the card below labels the two controls in the member's own
  // language on the first paint rather than after hydration.
  const t = getDictionary(await currentLocale(user.locale))

  const features = getOrgFeatures(
    subscription?.tier ?? "STARTER",
    subscription?.maxPropertiesOverride,
    subscription?.hasApiAccessOverride
  )

  // Get property count for usage meter
  const properties = await prisma.property.findMany({
    where: { orgId: organization.id },
    select: { id: true },
  })

  // Only what the counts need, and only for this organization.
  const bookings = await prisma.booking.findMany({
    where: { property: { orgId: organization.id } },
    select: {
      id: true,
      guestName: true,
      startDate: true,
      endDate: true,
      status: true,
      totalAmount: true,
      property: { select: { id: true, name: true } },
    },
  })

  const now = new Date()
  const counts = buildActivityCounts(bookings, now)

  // What this plan grants with no override applied, so the note below can say
  // whether an override actually changed anything.
  const planDefaultApiAccess = getOrgFeatures(features.tier).hasApiAccess

  // Scoped by orgId, like every other figure on this page.
  const receiptBytes = await receiptBytesUsed(organization.id)

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.account}
        title={t.pages.settings.title}
        description={t.pages.settings.description}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {t.pages.settings.profile}
          </CardTitle>
          <CardDescription>{t.pages.settings.profileHelp}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            {t.pages.settings.appearance}
          </CardTitle>
          <CardDescription>
            {format(t.pages.settings.appearanceHelp, { org: organization.name })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t.theme.label}</p>
            <ThemeSwitcher />
            <p className="text-xs text-subtle-foreground">{t.theme.description}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t.language.label}</p>
            <LanguageSwitcher />
            <p className="text-xs text-subtle-foreground">{t.language.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {t.pages.settings.organization}
          </CardTitle>
          <CardDescription>{t.pages.settings.organizationHelp}</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationForm
            name={organization.name}
            currency={organization.currency}
            canEdit={isOwner(user.role)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t.pages.notifications.title}
          </CardTitle>
          <CardDescription>{t.pages.settings.notificationsHelp}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <NotificationPreferencesForm
            preferences={{
              notifyCheckInsDue: user.notifyCheckInsDue,
              notifyStaysEnding: user.notifyStaysEnding,
              notifyMissingRate: user.notifyMissingRate,
            }}
            counts={counts}
          />

          <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-subtle-foreground">
            <span className="flex items-center gap-2 font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              {t.pages.settings.delivery}
            </span>
            <p className="mt-1">
              {t.pages.settings.deliveryHelp}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t.pages.settings.security}
          </CardTitle>
          <CardDescription>{t.pages.settings.securityHelp}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div>
              <p className="font-medium text-foreground">{t.pages.settings.changePassword}</p>
              <p className="text-sm text-subtle-foreground">{t.pages.settings.passwordHelp}</p>
            </div>
            <Button variant="outline" size="sm" href="/dashboard/settings/password">
              {t.pages.settings.change}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div>
              <p className="font-medium text-foreground">{t.pages.settings.twoFactor}</p>
              <p className="text-sm text-subtle-foreground">
                {user.twoFactorEnabled
                  ? t.pages.settings.factorEnabled
                  : t.pages.settings.factorHelp}
              </p>
            </div>
            <Button variant="outline" size="sm" href="/dashboard/settings/2fa">
              {user.twoFactorEnabled ? t.pages.settings.manage : t.pages.settings.enable}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {t.pages.settings.planAccess}
          </CardTitle>
          <CardDescription>{t.pages.settings.planHelp}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Usage Meter - Property Usage */}
          <UsageMeter
            used={properties.length}
            max={features.maxProperties}
            label={t.pages.dashboard.metrics.totalProperties}
            showPercentage={true}
            action={{ label: t.pages.dashboard.metrics.upgradePlan, href: "/dashboard/billing" }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className={getTierBadgeColor(features.tier)}>
              {getTierLabel(features.tier)}
            </Badge>
            {subscription?.isLifetimeFree ? <Badge variant="success">{t.pages.settings.lifetimeFree}</Badge> : null}
            {subscription?.maxPropertiesOverride != null ? (
              <Badge variant="outline">
                {format(t.pages.settings.propertyOverride, { count: subscription.maxPropertiesOverride })}
              </Badge>
            ) : null}
          </div>

          <ul className="space-y-2 text-sm">
            {[
              [
                t.pages.settings.propertyLimit,
                features.maxProperties === Infinity ? t.common.unlimited : String(features.maxProperties),
              ],
              [t.pages.settings.analytics, features.hasAdvancedAnalytics ? t.pages.settings.included : t.pages.settings.notIncluded],
              [t.pages.settings.teamRoles, features.hasTeamRoles ? t.pages.settings.included : t.pages.settings.notIncluded],
              [t.pages.settings.apiAccess, features.hasApiAccess ? t.pages.settings.enabled : t.pages.settings.notIncluded],
              [
                t.pages.settings.storage,
                features.maxStorageBytes === Infinity
                  ? format(t.pages.settings.storageUnlimited, { used: formatBytes(receiptBytes) })
                  : format(t.pages.settings.storageUsed, { used: formatBytes(receiptBytes), total: formatBytes(features.maxStorageBytes) }),
              ],
            ].map(([label, value]) => (
              <li key={label} className="flex items-center justify-between gap-4">
                <span className="text-subtle-foreground">{label}</span>
                <span className="text-muted-foreground">{value}</span>
              </li>
            ))}
          </ul>

          {subscription?.hasApiAccessOverride != null ? (
            <p className="text-xs text-subtle-foreground">
              {subscription.hasApiAccessOverride
                ? features.hasApiAccess === planDefaultApiAccess
                  ? t.pages.settings.apiGrantedMatch
                  : t.pages.settings.apiGrantedDifferent
                : features.hasApiAccess === planDefaultApiAccess
                  ? t.pages.settings.apiWithheldMatch
                  : t.pages.settings.apiWithheldDifferent}
            </p>
          ) : null}

          <Button variant="outline" size="sm" href="/dashboard/billing">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            {t.pages.settings.viewPlans}
          </Button>
        </CardContent>
      </Card>

      {canAccessEnterpriseSettings(features.tier) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {t.pages.settings.enterpriseSettings}
            </CardTitle>
            <CardDescription>{t.pages.settings.enterpriseSettingsHelp}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManageRoles(features.tier) && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted">
                <div>
                  <p className="font-medium text-foreground">{t.pages.settings.roleManagement}</p>
                  <p className="text-sm text-subtle-foreground">{t.pages.settings.roleManagementHelp}</p>
                </div>
                <Badge variant="secondary" className="border-brand-purple/25 bg-brand-purple/10 text-brand-purple">
                  {t.pages.settings.enterpriseOnly}
                </Badge>
              </div>
            )}
            {canConfigureSSO(features.tier) && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted">
                <div>
                  <p className="font-medium text-foreground">{t.pages.settings.ssoConfiguration}</p>
                  <p className="text-sm text-subtle-foreground">{t.pages.settings.ssoConfigurationHelp}</p>
                </div>
                <Badge variant="secondary" className="border-brand-purple/25 bg-brand-purple/10 text-brand-purple">
                  {t.pages.settings.enterpriseOnly}
                </Badge>
              </div>
            )}
            {(!canManageRoles(features.tier) || !canConfigureSSO(features.tier)) && (
              <p className="text-xs text-subtle-foreground">
                {t.pages.settings.enterpriseFeaturesLocked}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
