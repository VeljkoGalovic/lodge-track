"use server"

import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { type ActionState, field } from "@/lib/authorization"

const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 120

/**
 * Redeems a one-time invitation link.
 *
 * Deliberately reachable without a session — the person following the link has
 * no account yet. The token is the only credential involved and is 256 bits of
 * randomness, single-use, revocable and time-limited.
 */
export async function acceptInvitation(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = field(formData, "token")
  if (!token) return { error: "This invitation link is missing its token." }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  })

  // One message for every unusable token: distinguishing "never existed" from
  // "already used" tells a stranger which links are real.
  if (!invitation) return { error: "This invitation link is not valid." }
  if (invitation.acceptedAt) return { error: "This invitation has already been used." }
  if (invitation.revokedAt) return { error: "This invitation has been revoked." }
  if (invitation.expiresAt < new Date()) return { error: "This invitation has expired." }

  const name = field(formData, "name")
  const password = field(formData, "password")
  const confirmPassword = field(formData, "confirmPassword")

  if (name.length > MAX_NAME_LENGTH) return { error: "That name is too long." }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
  }
  if (password !== confirmPassword) return { error: "The passwords do not match." }

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } })
  if (existing) {
    return { error: "An account already exists for this email. Sign in instead." }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    await prisma.$transaction(async (tx) => {
      // Claimed first, and the claim is what authorises the account: the update
      // is conditional on the invitation still being unaccepted, so of two
      // simultaneous submits exactly one gets `count === 1`. Throwing rolls the
      // whole transaction back, so a loser cannot leave a user behind.
      const { count } = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: new Date() },
      })
      if (count === 0) throw new Error("invitation-already-claimed")

      await tx.user.create({
        data: {
          name: name || null,
          email: invitation.email,
          passwordHash,
          role: invitation.role,
          orgId: invitation.orgId,
        },
      })
    })
  } catch (error) {
    if (error instanceof Error && error.message === "invitation-already-claimed") {
      return { error: "This invitation has already been used." }
    }
    throw error
  }

  return {
    success: `You have joined ${invitation.organization.name}. Sign in to continue.`,
    redirect: "/signin",
  }
}
