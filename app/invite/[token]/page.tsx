import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AcceptInviteForm } from "@/components/invite/AcceptInviteForm"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { currentLocale } from "@/lib/i18n/server"
import { format, getDictionary, type Dictionary } from "@/lib/i18n/dictionaries"

export const metadata = { title: "Accept your invitation · LodgeTrack" }

/**
 * The public landing page for a one-time invitation link.
 *
 * Reachable without a session, because the person following it has no account
 * yet. The state of the invitation is resolved on the server so an unusable link
 * explains itself rather than presenting a form that would only fail on submit.
 */
export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // Read before the lookup so both the failure copy and the form below are in
  // the visitor's language, on a page they reach without a session.
  const locale = await currentLocale()
  const t = getDictionary(locale)

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  })

  const problem = invitationProblem(invitation, t)

  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-[10%] -top-[20%] h-[60%] w-[60%] animate-aurora rounded-full bg-gradient-to-br from-[#36bfae]/30 to-[#ba87ff]/25 blur-[120px]" />
        <div className="absolute -right-[10%] top-[30%] h-[50%] w-[50%] animate-aurora rounded-full bg-gradient-to-tl from-[#ba87ff]/25 to-[#36bfae]/30 blur-[100px] [animation-delay:3s]" />
      </div>

      <div className="glass-card relative z-10 w-full max-w-md p-8">
        {/* `invitation` is tested here as well as inside `problem`, so that it is
            narrowed for the form below — a lone `problem` check cannot tell
            TypeScript the row exists. */}
        {invitation && !problem ? (
          <>
            <h1 className="mb-2 text-2xl font-bold text-white">
              {format(t.invite.joinTitle, { org: invitation.organization.name })}
            </h1>
            <p className="mb-6 text-sm text-slate-400">
              {format(
                invitation.invitedBy ? t.invite.subtitle : t.invite.subtitleNoInviter,
                {
                  inviter:
                    invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? "",
                  role: t.roles.labels[invitation.role].toLocaleLowerCase(locale),
                }
              )}
            </p>

            <LocaleProvider locale={locale}>
              <AcceptInviteForm token={token} email={invitation.email} />
            </LocaleProvider>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold text-white">{t.invite.invalidTitle}</h1>
            <p className="mb-6 text-sm text-slate-400">
              {problem ?? t.invite.problemNotFound}
            </p>
            <p className="text-sm text-slate-400">
              {t.invite.askForNew}{" "}
              <Link href="/signin" className="text-[#36bfae] hover:underline">
                {t.auth.signIn}
              </Link>{" "}
              {t.invite.ifYouHaveAccount}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

/**
 * Why this invitation cannot be redeemed, or `null` when it can. Takes the row so
 * the page and the action agree on what "usable" means, without the page listing
 * the same four conditions a second time in a different order.
 */
function invitationProblem(
  invitation: {
    acceptedAt: Date | null
    revokedAt: Date | null
    expiresAt: Date
  } | null,
  t: Dictionary
): string | null {
  if (!invitation) return t.invite.problemNotFound
  if (invitation.acceptedAt) return t.invite.problemAccepted
  if (invitation.revokedAt) return t.invite.problemRevoked
  if (invitation.expiresAt < new Date()) return t.invite.problemExpired
  return null
}
