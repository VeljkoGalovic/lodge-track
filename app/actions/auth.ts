// app/actions/auth.ts
"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createVerificationToken, verifyAndConsumeToken, invalidateUserTokens } from "@/lib/tokens"
import { sendVerificationEmail, sendPasswordResetEmail, buildResetLink } from "@/lib/email"
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit"
import { getLegalVersionDate } from "@/lib/markdown"
import { headers } from "next/headers"
import { isLocale } from "@/lib/i18n/locales"
import { isThemePreference } from "@/lib/theme"
import { isSupportedCurrency, normalizeCurrency } from "@/lib/currency"
import { validatePassword } from "@/lib/password-validation"
import { createCheckoutUrl } from "@/lib/billing"

export async function registerUser(prevState: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string; redirect?: string }> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string
  const termsAccepted = formData.get("termsAccepted") === "on"
  const isOver18 = formData.get("isOver18") === "on"
  const locale = formData.get("locale") as string
  const theme = formData.get("theme") as string
  const currency = formData.get("currency") as string
  const selectedTier = formData.get("selectedTier") as "STARTER" | "PRO" | "BUSINESS"

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  if (!termsAccepted) {
    return { error: "You must accept the Terms of Service and Privacy Policy to register." }
  }

  if (!isOver18) {
    return { error: "You must confirm that you are over 18 years old to register." }
  }

  // Validate password strength
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.valid) {
    return { error: `Password requirements not met: ${passwordValidation.errors.join(", ")}` }
  }

  // Validate and normalize preferences
  const validatedLocale = isLocale(locale) ? locale : "en"
  const validatedTheme = isThemePreference(theme) ? theme : "SYSTEM"
  const validatedCurrency = normalizeCurrency(currency)
  const validatedTier = selectedTier === "PRO" || selectedTier === "BUSINESS" ? selectedTier : "STARTER"

  // Rate limiting for registration
  const identifier = getRateLimitIdentifier(null, email)
  const rateLimitResult = await checkRateLimit(identifier, RATE_LIMIT_CONFIGS.register)
  if (!rateLimitResult.allowed) {
    return { error: `Too many registration attempts. Please try again in ${rateLimitResult.retryAfterSeconds} seconds.` }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    return { error: "User with this email already exists." }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  // Get IP address and user agent for legal consent logging
  const headersList = await headers()
  const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headersList.get("x-real-ip")
    || "unknown"
  const userAgent = headersList.get("user-agent") || "unknown"

  // Get version dates from markdown files
  const tosVersion = getLegalVersionDate("terms-of-service.md")
  const privacyPolicyVersion = getLegalVersionDate("privacy-policy.md")

  // Use a Prisma transaction to create the Organization, User, LegalConsent, and default Starter Subscription atomically
  let organizationId = ""
  let userId = ""

  await prisma.$transaction(async (tx) => {
    // 1. Create the firm/organization with currency preference
    const organization = await tx.organization.create({
      data: {
        name: name ? `${name}'s Organization` : "My Organization",
        currency: validatedCurrency,
      },
    })

    organizationId = organization.id

    // 2. Create the user linked to this organization with locale and theme preferences
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "OWNER",
        orgId: organization.id,
        termsAcceptedAt: new Date(),
        locale: validatedLocale,
        theme: validatedTheme,
      },
    })

    userId = user.id

    // 3. Create LegalConsent record for compliance
    await tx.legalConsent.create({
      data: {
        userId: user.id,
        tosVersion,
        privacyPolicyVersion,
        ipAddress,
        userAgent,
      },
    })

    // 4. Create a default subscription for the organization
    // Use PENDING status to indicate payment hasn't been completed yet
    await tx.subscription.create({
      data: {
        orgId: organization.id,
        tier: validatedTier,
        status: "CANCELED", // Start as CANCELED so dashboard guard forces checkout
      },
    })
  })

  // For all tiers, send verification email first. Checkout will be triggered after email verification.
  try {
    const { token } = await createVerificationToken(email, "email_verification", 24)
    const emailResult = await sendVerificationEmail(email, token, validatedLocale)
    if (!emailResult.success) {
      return { error: `Registration saved, but email failed: ${emailResult.error}` }
    }
  } catch (error) {
    console.error("Failed to send verification email:", error)
    const message = error instanceof Error ? error.message : String(error)
    return { error: `Failed to send verification email: ${message}` }
  }

  return { success: "Account created! Please check your email to verify your address.", redirect: "/signin?verify=pending" }
}

/**
 * Send password reset email - creates a reset token and sends it via Resend
 */
export async function sendPasswordReset(prevState: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string; redirect?: string }> {
  const email = formData.get("email") as string

  if (!email) {
    return { error: "Email is required." }
  }

  // Rate limiting for password reset requests
  const identifier = getRateLimitIdentifier(null, email)
  const rateLimitResult = await checkRateLimit(identifier, RATE_LIMIT_CONFIGS.password_reset)
  if (!rateLimitResult.allowed) {
    return { error: `Too many password reset requests. Please try again in ${rateLimitResult.retryAfterSeconds} seconds.` }
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  // Always return success to prevent email enumeration
  // But only actually send email if user exists
  if (user) {
    try {
      // Invalidate any existing unused reset tokens for this user
      await invalidateUserTokens(email, "password_reset")

      // Create new reset token (expires in 1 hour)
      const { token } = await createVerificationToken(email, "password_reset", 1)
      await sendPasswordResetEmail(email, token, "en") // TODO: Get locale from request
    } catch (error) {
      console.error("Failed to send password reset email:", error)
      return { error: "Failed to send reset email. Please try again." }
    }
  }

  return { success: "If an account exists with that email, a password reset link has been sent.", redirect: "/signin?reset=sent" }
}

/**
 * Reset password - verify token and update user's password
 */
export async function resetPassword(prevState: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string; redirect?: string }> {
  const token = formData.get("token") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!token) {
    return { error: "Invalid or missing reset token." }
  }

  if (!password || !confirmPassword) {
    return { error: "Both password fields are required." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  // Verify and consume the token
  const email = await verifyAndConsumeToken(token, "password_reset")
  if (!email) {
    return { error: "Invalid or expired reset token. Please request a new one." }
  }

  // Hash new password and update user
  const passwordHash = await bcrypt.hash(password, 10)

  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  })

  return { success: "Password has been reset successfully. You can now sign in.", redirect: "/signin?reset=success" }
}

/**
 * Resend email verification - creates a new verification token and sends it
 */
export async function sendVerificationEmailAction(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email) {
    return { success: false, error: "Email is required." }
  }

  // Rate limiting for email verification resend
  const identifier = getRateLimitIdentifier(null, email)
  const rateLimitResult = await checkRateLimit(identifier, RATE_LIMIT_CONFIGS.email_verification)
  if (!rateLimitResult.allowed) {
    return { success: false, error: `Too many verification email requests. Please try again in ${rateLimitResult.retryAfterSeconds} seconds.` }
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  // Always return success to prevent email enumeration
  // But only actually send email if user exists and is not already verified
  if (user && !user.emailVerified) {
    try {
      // Invalidate any existing unused verification tokens for this user
      await invalidateUserTokens(email, "email_verification")

      // Create new verification token (expires in 24 hours)
      const { token } = await createVerificationToken(email, "email_verification", 24)
      await sendVerificationEmail(email, token, "en") // TODO: Get locale from request
    } catch (error) {
      console.error("Failed to send verification email:", error)
      return { success: false, error: "Failed to send verification email. Please try again." }
    }
  }

  return { success: true }
}