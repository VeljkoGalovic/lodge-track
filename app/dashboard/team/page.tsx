import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { MemberRow } from "@/components/team/MemberRow"
import { canModifyMember, isOwner } from "@/lib/authorization"
import { Lock, Users, UserPlus, Shield, ArrowUpRight, Mail } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import {
  format,
  getDictionary,
  LINK_COUNT_FORMS,
  MEMBER_COUNT_FORMS,
  plural,
} from "@/lib/i18n/dictionaries"
import { canManageRoles, canConfigureSSO } from "@/lib/permissions"

export default async function TeamPage() {
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
          users: { orderBy: { createdAt: "asc" } },
          // Only the invitations that are still usable — an expired or consumed
          // one is history, not something the team page should count.
          invitations: {
            where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
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

  const previewFeatures = [
    {
      icon: Users,
      title: t.pages.team.preview.members,
      description: t.pages.team.preview.membersHelp,
    },
    {
      icon: Shield,
      title: t.pages.team.preview.roles,
      description: t.pages.team.preview.rolesHelp,
    },
    {
      icon: UserPlus,
      title: t.pages.team.preview.invitations,
      description: t.pages.team.preview.invitationsHelp,
    },
  ]

  const org = user.organization
  const subscription = org.subscription

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  const canManageRbac = canManageRoles(features.tier)
  const canConfigureSso = canConfigureSSO(features.tier)

  if (!features.hasTeamRoles) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t.pages.eyebrows.people}
          title={t.pages.team.title}
          description={t.pages.team.description}
        />

        <Card className="relative overflow-hidden">
          {/* Ambient purple wash, matching the landing page's feature cards. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-purple/15 blur-[100px]"
          />
          <div className="relative p-8 text-center md:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10">
              <Lock className="h-8 w-8 text-brand-purple" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{t.pages.team.locked}</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-subtle-foreground">
              {t.pages.team.lockedHelp}
            </p>
            <Button size="lg" href="/dashboard/billing" className="mt-6">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              {t.pages.team.upgrade}
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {previewFeatures.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const pendingInvitations = org.invitations.length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.people}
        title={t.pages.team.title}
        description={t.pages.team.description}
        action={
          <Button href="/dashboard/team/invite">
            <UserPlus className="mr-2 h-4 w-4" />
            {t.pages.team.inviteButton}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.pages.team.members}</CardTitle>
          <CardDescription>
            {format(t.pages.team.membersSummary, { members: plural(org.users.length, MEMBER_COUNT_FORMS[locale], locale) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {org.users.map((member) => (
              <MemberRow
                key={member.id}
                member={{
                  id: member.id,
                  name: member.name,
                  email: member.email,
                  role: member.role,
                  twoFactorEnabled: member.twoFactorEnabled,
                }}
                canModify={canModifyMember(user, member)}
                canPromoteToOwner={isOwner(user.role)}
                canResetTwoFactor={isOwner(user.role)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t.pages.team.pendingInvitations}
          </CardTitle>
          <CardDescription>
            {pendingInvitations === 0
              ? t.pages.team.noPendingInvitations
              : format(t.pages.team.pendingSummary, { links: plural(pendingInvitations, LINK_COUNT_FORMS[locale], locale) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" href="/dashboard/team/invite">
            {pendingInvitations === 0 ? t.pages.team.inviteSomeone : t.pages.team.viewInvitationLinks}
          </Button>
        </CardContent>
      </Card>

      {canManageRbac || canConfigureSso ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t.pages.team.businessSettings}
            </CardTitle>
            <CardDescription>{t.pages.team.businessSettingsHelp}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManageRbac && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted">
                <div>
                  <p className="font-medium text-foreground">{t.pages.team.roleManagement}</p>
                  <p className="text-sm text-subtle-foreground">{t.pages.team.roleManagementHelp}</p>
                </div>
                <Badge variant="secondary" className="border-brand-purple/25 bg-brand-purple/10 text-brand-purple">
                  {t.pages.team.businessOnly}
                </Badge>
              </div>
            )}
            {canConfigureSso && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted">
                <div>
                  <p className="font-medium text-foreground">{t.pages.team.ssoConfiguration}</p>
                  <p className="text-sm text-subtle-foreground">{t.pages.team.ssoConfigurationHelp}</p>
                </div>
                <Badge variant="secondary" className="border-brand-purple/25 bg-brand-purple/10 text-brand-purple">
                  {t.pages.team.businessOnly}
                </Badge>
              </div>
            )}
            {(!canManageRbac || !canConfigureSso) && (
              <p className="text-xs text-subtle-foreground">
                {t.pages.team.businessFeaturesLocked}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
