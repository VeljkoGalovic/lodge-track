import { NextRequest, NextResponse } from "next/server"
import { verifyApiAccess } from "@/lib/api-auth"
import { getOrgUsageMetrics } from "@/lib/usage-metrics"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * GET /api/v1/usage
 * Returns organization usage metrics including property count vs limit.
 * Requires Business tier (hasApiAccess: true).
 */
export async function GET(req: NextRequest) {
  const verification = await verifyApiAccess(req)

  if (!verification.ok) {
    return verification.response
  }

  const { membership } = verification
  const orgId = membership.user.orgId

  // Rate limiting: 100 requests/minute for GET (using orgId as identifier since it's session-based)
  const rateLimitResult = await checkRateLimit(`org:${orgId}`, {
    maxAttempts: 100,
    windowMinutes: 1,
    action: "api:v1:read",
  })
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } }
    )
  }

  const metrics = await getOrgUsageMetrics(orgId)

  return NextResponse.json(metrics)
}