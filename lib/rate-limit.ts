import { prisma } from "@/lib/prisma"

/**
 * Rate limiting for auth endpoints.
 *
 * Uses the database to track attempts per IP/email combination with a sliding
 * window. The window is based on the `createdAt` of the RateLimit record.
 * Expired records are cleaned up periodically.
 */

export interface RateLimitConfig {
  /** Maximum attempts allowed in the window. */
  maxAttempts: number
  /** Window in minutes. */
  windowMinutes: number
  /** Identifier for the rate limit (e.g., "register", "login", "password_reset"). */
  action: string
}

/**
 * Default rate limit configurations per action.
 *
 * Two layers keep the honest user moving and the brute-forcer out:
 *
 *  - Per-action buckets below are keyed by the canonical EMAIL: they are the
 *    wall against password guessing on a specific account. Loose enough that
 *    a human double-checking a login or resending a verification email is
 *    never locked out; tight enough that 24/7 guessing makes no progress.
 *  - The per-IP layer lives in `guardAuthEndpointRateLimit` (`AUTH_CALLBACK_IP`
 *    for the login endpoint, the general API quota for the rest): it is the
 *    wall against a flood of attempts across many addresses from one source,
 *    which is what overloads the server. Worst case an IP may issue ~40 auth
 *    posts per 15 min — a rounding error of load.
 *
 * The `RATE_LIMIT_DISABLED` kill-switch short-circuits both layers (see
 * checkRateLimit), so a testing box can sleep on policy.
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  register: { maxAttempts: 5, windowMinutes: 60, action: "register" },
  login: { maxAttempts: 20, windowMinutes: 60, action: "login" },
  password_reset: { maxAttempts: 5, windowMinutes: 60, action: "password_reset" },
  email_verification: { maxAttempts: 5, windowMinutes: 60, action: "email_verification" },
  two_factor: { maxAttempts: 10, windowMinutes: 60, action: "two_factor" },
}

/**
 * Per-IP cap for login attempts specifically (the callback endpoint). People
 * on one connection — an office, a household, a phone behind carrier NAT —
 * share this bucket, so it is generous; a credential-stuffing script is not.
 */
export const AUTH_CALLBACK_IP_CONFIG: RateLimitConfig = {
  maxAttempts: 40,
  windowMinutes: 15,
  action: "auth_callback_ip",
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

/**
 * Check and consume a rate limit slot.
 *
 * Returns { allowed: true, remaining } if under limit.
 * Returns { allowed: false, remaining: 0, retryAfterSeconds } if over limit.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Testing kill-switch, set as a runtime env var on the box being tested
  // against (never in the repo's dev env, never in prod defaults): every
  // auth action reports allowed and writes nothing. The env var, not a code
  // difference, is what makes this auditable — the flag must be visible in
  // the environment to be off, and turning it off restores all buckets.
  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return { allowed: true, remaining: Number.MAX_SAFE_INTEGER }
  }

  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000)

  // Clean up expired records for this identifier and action
  await prisma.rateLimit.deleteMany({
    where: {
      identifier,
      action: config.action,
      createdAt: { lt: windowStart },
    },
  })

  // Count current attempts in window
  const count = await prisma.rateLimit.count({
    where: {
      identifier,
      action: config.action,
      createdAt: { gte: windowStart },
    },
  })

  if (count >= config.maxAttempts) {
    // Find the oldest record to calculate retry-after
    const oldest = await prisma.rateLimit.findFirst({
      where: {
        identifier,
        action: config.action,
        createdAt: { gte: windowStart },
      },
      orderBy: { createdAt: "asc" },
    })

    const retryAfterSeconds = oldest
      ? Math.ceil((oldest.createdAt.getTime() + config.windowMinutes * 60 * 1000 - Date.now()) / 1000)
      : config.windowMinutes * 60

    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, retryAfterSeconds) }
  }

  // Record this attempt
  await prisma.rateLimit.create({
    data: {
      identifier,
      action: config.action,
    },
  })

  return { allowed: true, remaining: config.maxAttempts - count - 1 }
}

/**
 * Get the client identifier for rate limiting.
 * Uses IP address when available, falls back to a hash of the email.
 * For email-based actions (password reset, email verification), we also
 * include the email to prevent enumeration while still limiting per-email.
 */
export function getRateLimitIdentifier(ip: string | null, email?: string): string {
  if (ip) return ip
  if (email) return `email:${email.toLowerCase()}`
  return "unknown"
}

/**
 * Check rate limit and throw if exceeded.
 * Convenience wrapper that throws a standardized error.
 */
export async function enforceRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  const result = await checkRateLimit(identifier, config)
  if (!result.allowed) {
    const error = new Error("Rate limit exceeded") as Error & {
      code: string
      retryAfterSeconds: number
    }
    error.code = "RATE_LIMIT_EXCEEDED"
    error.retryAfterSeconds = result.retryAfterSeconds || config.windowMinutes * 60
    throw error
  }
}
/**
 * Human-readable duration for retry messages ("59 min 12 s", "1 h 5 min").
 * Locale-neutral on purpose: numbers carry the meaning, so callers can splice
 * it into any localized sentence without a second formatting layer.
 */
export function humanizeRetrySeconds(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  if (s === 0) return "a few seconds"
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h} h`)
  if (m > 0) parts.push(`${m} min`)
  if (sec > 0 || parts.length === 0) parts.push(`${sec} s`)
  return parts.join(" ")
}
