import { Resend } from "resend"
import { getDictionary } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/locales"

/**
 * Email service using Resend for transactional emails.
 * Supports email verification and password reset flows.
 */

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/** Base URL for email links - dynamically determined based on environment. */
function getBaseUrl(): string {
  // 1. Explicit override via env var (highest priority)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // 2. Vercel deployment URL (production preview/production)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 3. Auto-detect: if NODE_ENV is production but no explicit URL, don't default to localhost
  if (process.env.NODE_ENV === "production") {
    console.warn("[Email] NODE_ENV=production but no NEXT_PUBLIC_APP_URL or VERCEL_URL set. Email links may not work.")
    return "https://www.lodgetrack.com"
  }

  // 4. Development/local default
  return "http://localhost:3000"
}

/** Send an email via Resend, with graceful degradation if not configured. */
async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not set - email not sent:", { to, subject })
    return { success: false, error: "Email service not configured" }
  }

  try {
    const result = await resend.emails.send({
      from: "LodgeTrack <noreply@lodgetrack.com>",
      to,
      subject,
      html,
      text,
    })

    if (result.error) {
      console.error("[Email] Resend error:", result.error)
      return { success: false, error: result.error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[Email] Unexpected error:", error)
    return { success: false, error: "Failed to send email" }
  }
}

/** Build the email verification link. */
export function buildVerificationLink(token: string): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/verify-email?token=${token}`
}

/** Build the password reset link. */
export function buildResetLink(token: string): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/reset-password?token=${token}`
}

/** Send email verification email. */
export async function sendVerificationEmail(
  email: string,
  token: string,
  locale: Locale = "en"
): Promise<{ success: boolean; error?: string }> {
  const t = getDictionary(locale).emails.verifyEmail
  const link = buildVerificationLink(token)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #36bfae 0%, #ba87ff 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #07090E; margin: 0; font-size: 24px; font-weight: 700;">LodgeTrack</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin-top: 0; color: #1f2937;">${t.title}</h2>
        <p style="color: #4b5563;">${t.intro}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #36bfae 0%, #ba87ff 100%); color: #07090E; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            ${t.cta}
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">${t.altLink}</p>
        <p style="word-break: break-all; color: #36bfae; font-size: 14px;">${link}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">${t.expiry}</p>
      </div>
    </body>
    </html>
  `

  const text = `
${t.textTitle}

${t.textIntro}

${link}

${t.expiry}
  `

  return sendEmail({ to: email, subject: t.subject, html, text })
}

/** Send password reset email. */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  locale: Locale = "en"
): Promise<{ success: boolean; error?: string }> {
  const t = getDictionary(locale).emails.passwordReset
  const link = buildResetLink(token)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #36bfae 0%, #ba87ff 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #07090E; margin: 0; font-size: 24px; font-weight: 700;">LodgeTrack</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="margin-top: 0; color: #1f2937;">${t.title}</h2>
        <p style="color: #4b5563;">${t.intro}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #36bfae 0%, #ba87ff 100%); color: #07090E; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px;">
            ${t.cta}
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">${t.altLink}</p>
        <p style="word-break: break-all; color: #36bfae; font-size: 14px;">${link}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">${t.expiry}</p>
      </div>
    </body>
    </html>
  `

  const text = `
${t.textTitle}

${t.textIntro}

${link}

${t.expiry}
  `

  return sendEmail({ to: email, subject: t.subject, html, text })
}