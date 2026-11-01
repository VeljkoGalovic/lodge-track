import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Next.js Proxy for security headers.
 *
 * IMPORTANT: this middleware must stay free of database imports. The
 * middleware bundle is compiled to a self-contained Worker function (OpenNext
 * "node middleware"), whose async-module loading machinery breaks in workerd
 * when prisma/pg (or anything else that compiles to async turbopack modules)
 * is pulled in. Rate limiting and auth gating therefore live in
 * `lib/api-guard.ts` and run inside the API route handlers.
 */

// Paths that skip the proxy entirely (static assets, Next.js internals, public pages)
const SKIPPED_PREFIXES = [
  "/_next",
  "/static",
  "/favicon",
  "/robots.txt",
  "/sitemap.xml",
  "/signin",
  "/register",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/accept-invitation",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Development bypass
  if (process.env.LOCAL_DEVELOPMENT === "true") {
    return NextResponse.next()
  }

  // HSTS — tell browsers to stop attempting plain HTTP for a year.
  // The Cloudflare edge already 301s http→https; this pins the host so
  // future visits by returning users never renegotiate insecurely.
  // If HSTS is ever enabled at the Cloudflare edge (SSL/TLS → Edge
  // Certificates), remove this header to avoid emitting it twice.
  const HSTS = "max-age=31536000; includeSubDomains"

  // Skip proxy for static assets, Next.js internals, and public pages
  if (SKIPPED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const response = NextResponse.next()
    response.headers.set("Strict-Transport-Security", HSTS)
    return response
  }

  // =========================================================================
  // Security headers
  // =========================================================================
  const response = NextResponse.next()

  response.headers.set("Strict-Transport-Security", HSTS)
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
