import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AcceptInviteForm } from "@/components/invite/AcceptInviteForm"
import { ROLE_LABELS } from "@/lib/roles"
import type { Role } from "@prisma/client"

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

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: { select: { name: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  })

  const problem = invitationProblem(invitation)

  return (
    <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
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
            <h1 className="mb-2 text-2xl font-bold text-white">Join {invitation.organization.name}</h1>
            <p className="mb-6 text-sm text-slate-400">
              {invitation.invitedBy
                ? `${invitation.invitedBy.name ?? invitation.invitedBy.email} invited you`
                : "You have been invited"}{" "}
              as {ROLE_LABELS[invitation.role as Role].toLowerCase()}. Choose a password to finish
              setting up your account.
            </p>

            <AcceptInviteForm token={token} email={invitation.email} />
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold text-white">This link cannot be used</h1>
            <p className="mb-6 text-sm text-slate-400">
              {problem ?? "This invitation link is not valid."}
            </p>
            <p className="text-sm text-slate-400">
              Ask whoever invited you to send a new one, or{" "}
              <Link href="/signin" className="text-[#36bfae] hover:underline">
                sign in
              </Link>{" "}
              if you already have an account.
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
  } | null
): string | null {
  if (!invitation) return "This invitation link is not valid."
  if (invitation.acceptedAt) return "This invitation has already been used."
  if (invitation.revokedAt) return "This invitation has been revoked."
  if (invitation.expiresAt < new Date()) return "This invitation has expired."
  return null
}
