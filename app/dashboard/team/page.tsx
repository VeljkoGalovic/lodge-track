import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { MemberRow } from "@/components/team/MemberRow"
import { canModifyMember, isOwner } from "@/lib/authorization"
import { Lock, Users, UserPlus, Shield, ArrowUpRight, Mail } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"

const PREVIEW_FEATURES = [
  {
    icon: Users,
    title: "Team Members",
    description: "Invite and manage team members",
  },
  {
    icon: Shield,
    title: "Role Management",
    description: "Assign Owner, Manager, Maintenance roles",
  },
  {
    icon: UserPlus,
    title: "Invitations",
    description: "Send and track team invitations",
  },
]

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
  const t = getDictionary(await currentLocale(user.locale))

  const org = user.organization
  const subscription = org.subscription

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

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
            <h3 className="text-xl font-semibold text-foreground">Team Management Locked</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-subtle-foreground">
              Invite team members, assign roles (Owner, Manager, Maintenance), and manage permissions
              with the Pro plan.
            </p>
            <Button size="lg" href="/dashboard/billing" className="mt-6">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {PREVIEW_FEATURES.map(({ icon: Icon, title, description }) => (
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
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {org.users.length} member{org.users.length === 1 ? "" : "s"} in your organization
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
            Pending invitations
          </CardTitle>
          <CardDescription>
            {pendingInvitations === 0
              ? "No invitations are outstanding."
              : `${pendingInvitations} link${pendingInvitations === 1 ? "" : "s"} created but not yet used.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" href="/dashboard/team/invite">
            {pendingInvitations === 0 ? "Invite someone" : "View invitation links"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
