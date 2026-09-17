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
import { getDictionary } from "@/lib/i18n/dictionaries"
import { User, Building2, Bell, Palette, Shield, KeyRound, Mail, ArrowUpRight } from "lucide-react"

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
            Profile
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Appearance &amp; language
          </CardTitle>
          <CardDescription>
            Both apply to your account only — other members of {organization.name} keep their own.
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
            Organization
          </CardTitle>
          <CardDescription>Manage your organization details</CardDescription>
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
            Notifications
          </CardTitle>
          <CardDescription>Choose what appears in your activity feed</CardDescription>
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
              Email and push delivery
            </span>
            <p className="mt-1">
              Not connected. There is no mail or push provider wired up, so the feed above is only
              visible inside the app. Nothing is sent to you.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and sign-in protection</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div>
              <p className="font-medium text-foreground">Change password</p>
              <p className="text-sm text-subtle-foreground">Update your account password</p>
            </div>
            <Button variant="outline" size="sm" href="/dashboard/settings/password">
              Change
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div>
              <p className="font-medium text-foreground">Two-factor authentication</p>
              <p className="text-sm text-subtle-foreground">
                {user.twoFactorEnabled
                  ? "On — a code is required at sign-in"
                  : "Add an extra layer of security"}
              </p>
            </div>
            <Button variant="outline" size="sm" href="/dashboard/settings/2fa">
              {user.twoFactorEnabled ? "Manage" : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Plan &amp; access
          </CardTitle>
          <CardDescription>What your subscription currently entitles this organization to</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className={getTierBadgeColor(features.tier)}>
              {getTierLabel(features.tier)}
            </Badge>
            {subscription?.isLifetimeFree ? <Badge variant="success">Lifetime free</Badge> : null}
            {subscription?.maxPropertiesOverride != null ? (
              <Badge variant="outline">
                Property limit overridden to {subscription.maxPropertiesOverride}
              </Badge>
            ) : null}
          </div>

          <ul className="space-y-2 text-sm">
            {[
              [
                "Property limit",
                features.maxProperties === Infinity ? "Unlimited" : String(features.maxProperties),
              ],
              ["Advanced analytics", features.hasAdvancedAnalytics ? "Included" : "Not included"],
              ["Team roles", features.hasTeamRoles ? "Included" : "Not included"],
              ["API access", features.hasApiAccess ? "Enabled" : "Not included"],
              [
                "Receipt storage",
                features.maxStorageBytes === Infinity
                  ? `${formatBytes(receiptBytes)} used — unlimited`
                  : `${formatBytes(receiptBytes)} of ${formatBytes(features.maxStorageBytes)}`,
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
              API access is {subscription.hasApiAccessOverride ? "granted" : "withheld"} by an
              override on this subscription
              {features.hasApiAccess === planDefaultApiAccess
                ? ", which matches what your plan already gives you"
                : ", which differs from your plan's default"}
              .
            </p>
          ) : null}

          <Button variant="outline" size="sm" href="/dashboard/billing">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            View plans
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
