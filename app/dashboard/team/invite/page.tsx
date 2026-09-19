import { requireMembership, canManage, isOwner } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { requestOrigin } from "@/lib/origin"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { InviteForm } from "@/components/team/InviteForm"
import { InviteRow } from "@/components/team/InviteRow"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import {
  format,
  getDictionary,
  LINK_COUNT_FORMS,
  plural,
} from "@/lib/i18n/dictionaries"

export default async function InviteMemberPage() {
  const { user, organization } = await requireMembership()
  const locale = await currentLocale(user.locale)
  const t = getDictionary(locale)

  if (!canManage(user.role)) {
    return (
      <div className="max-w-3xl space-y-6">
        <PageHeader eyebrow={t.pages.eyebrows.people} title={t.pages.team.inviteTitle} />
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.notPermitted}</CardTitle>
            <CardDescription>
              {t.pages.team.inviteViewOnly}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" href="/dashboard/team">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.pages.team.backToTeam}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [origin, invitations] = await Promise.all([
    requestOrigin(),
    prisma.invitation.findMany({
      where: {
        orgId: organization.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.people}
        title={t.pages.team.inviteTitle}
        description={t.pages.team.inviteDescription}
        action={
          <Button variant="ghost" href="/dashboard/team">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.common.back}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t.pages.team.newInvitation}</CardTitle>
          <CardDescription>{t.pages.team.newInvitationHelp}</CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm canInviteOwner={isOwner(user.role)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#36BFAE]" />
            {t.pages.team.pendingInvitations}
          </CardTitle>
          <CardDescription>
            {invitations.length === 0
              ? t.pages.team.noPendingInvitations
              : invitations.length === 1
                ? t.pages.team.pendingLinksOne
                : format(t.pages.team.pendingLinks, { links: plural(invitations.length, LINK_COUNT_FORMS[locale], locale) })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.map((invitation) => (
            <InviteRow
              key={invitation.id}
              invitation={{
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                url: `${origin}/invite/${invitation.token}`,
                expiresAt: invitation.expiresAt.toLocaleDateString(locale === "sr" ? "sr-Latn-RS" : "en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
              }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
