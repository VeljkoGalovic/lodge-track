import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { enforceRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit"
import { auth } from "@/auth"

/**
 * Next.js Proxy for rate limiting and auth protection.
 */

// Paths that require authentication
const PROTECTED_API_PREFIXES = [
  "/api/expenses",
  "/api/properties",
  "/api/bookings",
  "/api/invitations",
  "/api/billing",
  "/api/analytics",
  "/api/team",
  "/api/subscription",
]

// Auth endpoints that need rate limiting
const AUTH_ENDPOINTS = [
  "/api/auth/signin",
  "/api/auth/register",
  "/api/auth/password-reset",
  "/api/auth/verify-email",
  "/api/auth/two-factor",
]

interface RateLimitError extends Error {
  code: string
  retryAfterSeconds: number
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown"

  // Skip proxy for static assets, Next.js internals, and public pages
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/accept-invitation")
  ) {
    return NextResponse.next()
  }

  // =========================================================================
  // Rate limiting for auth endpoints
  // =========================================================================
  for (const endpoint of AUTH_ENDPOINTS) {
    if (pathname.startsWith(endpoint)) {
      const config = RATE_LIMIT_CONFIGS[endpoint.replace("/api/auth/", "")] || RATE_LIMIT_CONFIGS.register
      const identifier = getRateLimitIdentifier(ip)

      try {
        await enforceRateLimit(identifier, config)
      } catch (error) {
        if (error instanceof Error && "code" in error && (error as RateLimitError).code === "RATE_LIMIT_EXCEEDED") {
          const retryAfter = (error as RateLimitError).retryAfterSeconds ?? config.windowMinutes * 60
          return new NextResponse(
            JSON.stringify({
              error: "Too many requests. Please try again later.",
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
        throw error
      }
    }
  }

  // =========================================================================
  // Rate limiting for API routes (general)
  // =========================================================================
  if (pathname.startsWith("/api/")) {
    const apiConfig = {
      maxAttempts: 100,
      windowMinutes: 15,
      action: "api_general",
    }
    const identifier = getRateLimitIdentifier(ip)

    try {
      await enforceRateLimit(identifier, apiConfig)
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as RateLimitError).code === "RATE_LIMIT_EXCEEDED") {
        const retryAfter = (error as RateLimitError).retryAfterSeconds ?? apiConfig.windowMinutes * 60
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests. Please try again later.",
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(apiConfig.maxAttempts),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + retryAfter),
            },
          }
        )
      }
      throw error
    }
  }

  // =========================================================================
  // Auth protection for protected API routes
  // =========================================================================
  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (isProtectedApi) {
    const session = await auth()

    if (!session?.user?.email) {
      return new NextResponse(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      )
    }
  }

  // =========================================================================
  // Security headers
  // =========================================================================
  const response = NextResponse.next()

  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  )

  if (pathname.startsWith("/api/")) {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}