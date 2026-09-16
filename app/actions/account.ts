"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { type ActionState, currentMembership, field } from "@/lib/authorization"
import { decryptSecret, encryptSecret } from "@/lib/crypto"
import { buildOtpAuthUri, generateSecret, verifyCode } from "@/lib/totp"

const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 120

/** Shown in the authenticator app beside the code. */
const TOTP_ISSUER = "LodgeTrack"

export async function updateProfile(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  const name = field(formData, "name")
  if (name.length > MAX_NAME_LENGTH) return { error: "That name is too long." }

  await prisma.user.update({
    where: { id: membership.user.id },
    // Empty clears the name rather than storing "", so the UI's `|| "User"`
    // fallbacks keep working.
    data: { name: name || null },
  })

  // The name is rendered in the shell's account menu, which every dashboard
  // route inherits.
  revalidatePath("/dashboard", "layout")
  return { success: "Profile updated." }
}

export async function changePassword(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  const currentPassword = field(formData, "currentPassword")
  const newPassword = field(formData, "newPassword")
  const confirmPassword = field(formData, "confirmPassword")

  if (!currentPassword) return { error: "Enter your current password." }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters.` }
  }
  if (newPassword !== confirmPassword) return { error: "The new passwords do not match." }
  if (newPassword === currentPassword) {
    return { error: "Your new password must be different from your current one." }
  }

  const user = await prisma.user.findUnique({ where: { id: membership.user.id } })
  if (!user?.passwordHash) {
    return { error: "This account has no password set. Contact an owner." }
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return { error: "Your current password is incorrect." }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  })

  return { success: "Password changed." }
}

/**
 * Generates a new secret and parks it on the account without enabling the second
 * factor. `twoFactorEnabled` only flips once a code has been proved, so an
 * abandoned setup can never lock anyone out.
 *
 * Refuses when a factor is already active: overwriting a working secret with an
 * unconfirmed one would lock the member out of their own account.
 */
export async function startTwoFactorSetup(): Promise<
  { secret: string; uri: string } | { error: string }
> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  const user = await prisma.user.findUnique({ where: { id: membership.user.id } })
  if (!user) return { error: "Your account could not be found." }
  if (user.twoFactorEnabled) {
    return { error: "Two-factor authentication is already on. Turn it off first to re-enrol." }
  }

  const secret = generateSecret()
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false },
  })

  const accountName = user.name ? `${user.name} (${user.email})` : user.email

  return {
    secret,
    uri: buildOtpAuthUri({ secret, accountName, issuer: TOTP_ISSUER }),
  }
}

export async function confirmTwoFactor(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  const code = field(formData, "code")
  if (!code) return { error: "Enter the six-digit code from your authenticator app." }

  const user = await prisma.user.findUnique({ where: { id: membership.user.id } })
  if (!user?.twoFactorSecret) {
    return { error: "Start the setup again — no pending secret was found." }
  }

  const secret = decryptSecret(user.twoFactorSecret)
  if (!secret) {
    return { error: "That setup could not be read. Start again to generate a new secret." }
  }
  if (!verifyCode(secret, code)) {
    return { error: "That code is not valid. Check your device's clock and try the next one." }
  }

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } })

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard/settings/2fa")
  return { success: "Two-factor authentication is on." }
}

/** Turns the factor off. Requires the password, so a borrowed session is not enough. */
export async function disableTwoFactor(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  const password = field(formData, "password")
  if (!password) return { error: "Enter your password to turn off two-factor authentication." }

  const user = await prisma.user.findUnique({ where: { id: membership.user.id } })
  if (!user?.passwordHash) return { error: "This account has no password set." }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "That password is incorrect." }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  })

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard/settings/2fa")
  return { success: "Two-factor authentication is off." }
}

/**
 * Stores which kinds of event this member wants in the activity feed. The feed
 * is derived from live bookings, so a preference changes what is shown from the
 * next render onwards — there is nothing else to update.
 */
export async function updateNotificationPreferences(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  const checked = (name: string) => formData.get(name) === "on"

  await prisma.user.update({
    where: { id: membership.user.id },
    data: {
      notifyCheckInsDue: checked("notifyCheckInsDue"),
      notifyStaysEnding: checked("notifyStaysEnding"),
      notifyMissingRate: checked("notifyMissingRate"),
    },
  })

  revalidatePath("/dashboard", "layout")
  revalidatePath("/dashboard/notifications")
  return { success: "Notification preferences saved." }
}
