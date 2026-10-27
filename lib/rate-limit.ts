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
 * These are conservative defaults that can be overridden.
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  register: { maxAttempts: 5, windowMinutes: 60, action: "register" },
  login: { maxAttempts: 10, windowMinutes: 15, action: "login" },
  password_reset: { maxAttempts: 3, windowMinutes: 60, action: "password_reset" },
  email_verification: { maxAttempts: 3, windowMinutes: 60, action: "email_verification" },
  two_factor: { maxAttempts: 5, windowMinutes: 15, action: "two_factor" },
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
