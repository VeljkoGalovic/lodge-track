"use server"

import { revalidatePath } from "next/cache"
import { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  type ActionState,
  canManage,
  canModifyMember,
  currentMembership,
  field,
  isOwner,
} from "@/lib/authorization"
import { generateToken } from "@/lib/crypto"

const ROLES = Object.values(Role)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** How long an invitation link stays usable. */
const INVITE_DAYS = 7

/**
 * Creates a pending invitation and its single-use link.
 *
 * Nothing is emailed — there is no mail provider wired up — so the link is
 * returned to the inviter to pass on, and shown on the invite page until it is
 * used or revoked.
 */
export async function inviteMember(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to invite members." }
  }

  const email = field(formData, "email").toLowerCase()
  const role = field(formData, "role") || "MANAGER"

  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." }
  if (!ROLES.includes(role as Role)) return { error: "Choose a valid role." }
  if (role === "OWNER" && !isOwner(membership.user.role)) {
    return { error: "Only an owner can invite another owner." }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return {
      error:
        existingUser.orgId === membership.organization.id
          ? "That person is already a member of your organization."
          : "An account with that email already exists.",
    }
  }

  /**
   * A person can hold one invitation at a time. Re-inviting supersedes the
   * previous link rather than leaving two live tokens for the same address.
   */
  await prisma.invitation.updateMany({
    where: { email, orgId: membership.organization.id, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  await prisma.invitation.create({
    data: {
      token: generateToken(),
      email,
      role: role as Role,
      orgId: membership.organization.id,
      invitedById: membership.user.id,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    },
  })

  revalidatePath("/dashboard/team")
  revalidatePath("/dashboard/team/invite")
  return { success: `Invitation created for ${email}. Copy the link below and send it on.` }
}

export async function revokeInvitation(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to revoke invitations." }
  }

  const { count } = await prisma.invitation.updateMany({
    where: {
      id: field(formData, "id"),
      orgId: membership.organization.id,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  })
  if (count === 0) return { error: "That invitation is no longer pending." }

  revalidatePath("/dashboard/team")
  revalidatePath("/dashboard/team/invite")
  return { success: "Invitation revoked." }
}

export async function updateMemberRole(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to change roles." }
  }

  const userId = field(formData, "userId")
  const role = field(formData, "role")
  if (!ROLES.includes(role as Role)) return { error: "Choose a valid role." }

  const target = await prisma.user.findFirst({
    where: { id: userId, orgId: membership.organization.id },
  })
  if (!target) return { error: "That member is no longer in your organization." }

  if (!canModifyMember(membership.user, target)) {
    return { error: "You cannot change that member's role." }
  }
  if (role === "OWNER" && !isOwner(membership.user.role)) {
    return { error: "Only an owner can promote someone to owner." }
  }

  await prisma.user.update({ where: { id: target.id }, data: { role: role as Role } })

  revalidatePath("/dashboard/team")
  return { success: `${target.name || target.email} is now ${role.toLowerCase()}.` }
}

export async function removeMember(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to remove members." }
  }

  const target = await prisma.user.findFirst({
    where: { id: field(formData, "userId"), orgId: membership.organization.id },
  })
  if (!target) return { error: "That member is no longer in your organization." }

  if (!canModifyMember(membership.user, target)) {
    return { error: "You cannot remove that member." }
  }

  await prisma.user.delete({ where: { id: target.id } })

  revalidatePath("/dashboard/team")
  return { success: `${target.name || target.email} removed.` }
}

/**
 * Clears a member's second factor so they can enrol again.
 *
 * This is the recovery path for a lost phone, and the only way out of a secret
 * that can no longer be decrypted because AUTH_SECRET was rotated. It is
 * deliberately restricted to owners acting on someone else — nobody can reset
 * their own factor from here, because that would make 2FA self-service for
 * anyone who got hold of a session.
 */
export async function resetMemberTwoFactor(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!isOwner(membership.user.role)) {
    return { error: "Only an owner can reset another member's two-factor authentication." }
  }

  const target = await prisma.user.findFirst({
    where: { id: field(formData, "userId"), orgId: membership.organization.id },
  })
  if (!target) return { error: "That member is no longer in your organization." }
  if (target.id === membership.user.id) {
    return { error: "Turn off your own two-factor authentication from Settings." }
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  revalidatePath("/dashboard/team")
  return {
    success: `${target.name || target.email} will be asked to set up two-factor authentication again.`,
  }
}
