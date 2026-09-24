"use server"

import { getOrgUsageMetrics } from "@/lib/usage-metrics"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * Server action to get usage metrics for the current user's organization.
 * Can be called from client components via useActionState or from server components.
 */
export async function getUsageMetricsAction(): Promise<{
  success: boolean
  data?: Awaited<ReturnType<typeof getOrgUsageMetrics>>
  error?: string
}> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return { success: false, error: "unauthorized" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { orgId: true },
    })

    if (!user?.orgId) {
      return { success: false, error: "organization not found" }
    }

    const metrics = await getOrgUsageMetrics(user.orgId)
    return { success: true, data: metrics }
  } catch (error) {
    console.error("[getUsageMetricsAction] error:", error)
    return { success: false, error: "unexpected_error" }
  }
}