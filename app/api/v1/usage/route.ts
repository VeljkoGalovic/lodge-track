import { NextResponse } from "next/server"
import { verifyApiAccess } from "@/lib/api-auth"
import { getOrgUsageMetrics } from "@/lib/usage-metrics"

/**
 * GET /api/v1/usage
 * Returns organization usage metrics including property count vs limit.
 * Requires Enterprise tier (hasApiAccess: true).
 */
export async function GET(req: Request) {
  const verification = await verifyApiAccess(req as any)

  if (!verification.ok) {
    return verification.response
  }

  const { membership } = verification
  const orgId = membership.user.orgId

  const metrics = await getOrgUsageMetrics(orgId)

  return NextResponse.json(metrics)
}