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
import { getDictionary } from "@/lib/i18n/dictionaries"

export default async function InviteMemberPage() {
  const { user, organization } = await requireMembership()
  // Only used to format the expiry dates below in the reader's own language.
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
              Back to team
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
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>New invitation</CardTitle>
          <CardDescription>
            There is no email provider connected, so nothing is sent automatically — copy the link
            and pass it on yourself.
          </CardDescription>
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
              ? "No invitations are outstanding."
              : `${invitations.length} link${invitations.length === 1 ? "" : "s"} still to be used. Each one works once.`}
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
                expiresAt: invitation.expiresAt.toLocaleDateString(locale, {
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
