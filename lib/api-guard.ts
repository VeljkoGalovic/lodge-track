import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  AUTH_CALLBACK_IP_CONFIG,
  enforceRateLimit,
  getRateLimitIdentifier,
  type RateLimitConfig,
} from "@/lib/rate-limit"

/**
 * Route-level guards replacing the checks that used to live in `proxy.ts`.
 *
 * The Node.js middleware must stay free of database imports (it runs in the
 * Worker's middleware bundle, which cannot tolerate the async-module machinery
 * pulled in by the prisma/pg stack), so rate limiting and auth checks run
 * inside the route handlers themselves.
 */

interface RateLimitErrorLike extends Error {
  code: string
  retryAfterSeconds: number
}

/** Same general quota the proxy middleware applied to every /api route. */
export const API_GENERAL_CONFIG: RateLimitConfig = {
  maxAttempts: 100,
  windowMinutes: 15,
  action: "api_general",
}

export function clientIpFrom(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  )
}

function rateLimitResponse(config: RateLimitConfig, retryAfterSeconds?: number): NextResponse {
  const retryAfter = retryAfterSeconds || config.windowMinutes * 60
  return new NextResponse(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      // The rate_limited code + seconds to wait let the sign-in panel route
      // the visitor to the real rate-limit page (with its countdown) instead
      // of an unexplained error the same way the email-limiter path does.
      code: `rate_limited:${retryAfter}`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(config.maxAttempts),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + retryAfter),
      },
    }
  )
}

/**
 * Rate-limit a request against the general API quota (100 / 15 min per IP).
 * Returns a 429 response when exceeded, otherwise `null`.
 */
export async function guardApiRateLimit(
  request: NextRequest | Request,
  config: RateLimitConfig = API_GENERAL_CONFIG
): Promise<NextResponse | null> {
  if (process.env.LOCAL_DEVELOPMENT === "true") return null

  const identifier = getRateLimitIdentifier(clientIpFrom(request))
  try {
    await enforceRateLimit(identifier, config)
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as RateLimitErrorLike).code === "RATE_LIMIT_EXCEEDED"
    ) {
      return rateLimitResponse(config, (error as RateLimitErrorLike).retryAfterSeconds)
    }
    throw error
  }
  return null
}

/**
 * Rate limit the NextAuth endpoints per IP. The login callback gets its own
 * flood cap; every other auth endpoint rides the general API quota — the old
 * fallback (the register config, 5 per hour) could lock a shared connection
 * out of signing out.
 * Returns a 429 response when exceeded, otherwise `null`.
 */
export async function guardAuthEndpointRateLimit(request: NextRequest | Request): Promise<NextResponse | null> {
  if (process.env.LOCAL_DEVELOPMENT === "true") return null

  const pathname = new URL(request.url).pathname
  if (pathname === "/api/auth/session" || pathname === "/api/auth/csrf") {
    return null
  }

  const config = pathname.startsWith("/api/auth/callback")
    ? AUTH_CALLBACK_IP_CONFIG
    : API_GENERAL_CONFIG
  const identifier = getRateLimitIdentifier(clientIpFrom(request))

  try {
    await enforceRateLimit(identifier, config)
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as RateLimitErrorLike).code === "RATE_LIMIT_EXCEEDED"
    ) {
      return rateLimitResponse(config, (error as RateLimitErrorLike).retryAfterSeconds)
    }
    throw error
  }
  return null
}
