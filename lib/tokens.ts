import { prisma } from "@/lib/prisma"
import { generateToken } from "@/lib/crypto"
import { canonicalizeEmail } from "@/lib/email"

/**
 * Token utilities for email verification and password reset.
 * Uses the VerificationToken model in the database.
 */

export type TokenPurpose = "email_verification" | "password_reset"

/**
 * Create a new verification token and store it in the database.
 * Returns the plain token (only shown once) and the hashed version stored in DB.
 */
export async function createVerificationToken(
  email: string,
  purpose: TokenPurpose,
  expiresInHours: number = 24
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  await prisma.verificationToken.create({
    data: {
      token,
      // Canonical, not merely lowercase: token rows must key to the stored
      // (canonicalized) user email even when a caller passes a Gmail alias
      // spelling of it. Fallback keeps old behaviour for non-parseable input.
      email: canonicalizeEmail(email) ?? email.toLowerCase(),
      purpose,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/**
 * Verify and consume a token.
 * Returns the email if valid, null if invalid/expired/used.
 * For email_verification, also marks the user's email as verified.
 */
export async function verifyAndConsumeToken(
  token: string,
  purpose: TokenPurpose
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!record) return null
  if (record.purpose !== purpose) return null
  if (record.usedAt) return null
  if (record.expiresAt < new Date()) return null

  // Mark as used
  await prisma.verificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })

  // If email verification, also mark user's email as verified
  if (purpose === "email_verification") {
    await prisma.user.update({
      where: { email: record.email },
      data: { emailVerified: new Date() },
    })
  }

  return record.email
}

/**
 * Check if a token is valid without consuming it (for preview/validation).
 */
export async function validateToken(
  token: string,
  purpose: TokenPurpose
): Promise<{ valid: boolean; email?: string; error?: string }> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!record) return { valid: false, error: "Token not found" }
  if (record.purpose !== purpose) return { valid: false, error: "Invalid token purpose" }
  if (record.usedAt) return { valid: false, error: "Token already used" }
  if (record.expiresAt < new Date()) return { valid: false, error: "Token expired" }

  return { valid: true, email: record.email }
}

/**
 * Delete expired tokens (cleanup utility).
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.verificationToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
  return result.count
}

/**
 * Invalidate all tokens for an email and purpose (e.g., when user requests a new reset link).
 */
export async function invalidateUserTokens(email: string, purpose: TokenPurpose): Promise<number> {
  const result = await prisma.verificationToken.updateMany({
    where: {
      email: canonicalizeEmail(email) ?? email.toLowerCase(),
      purpose,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  })
  return result.count
}