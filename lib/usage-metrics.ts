import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import type { SubscriptionTier } from "@prisma/client"

export interface OrgUsageMetrics {
  properties: {
    used: number
    limit: number
    isAtLimit: boolean
    percentage: number
    isUnlimited: boolean
  }
}

/**
 * Gets organization usage metrics including property count vs limit.
 * This is a server-side function that can be used in server components or server actions.
 */
export async function getOrgUsageMetrics(orgId: string): Promise<OrgUsageMetrics> {
  // Get the organization with its subscription
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      subscription: true,
      _count: {
        select: { properties: true },
      },
    },
  })

  if (!organization) {
    throw new Error("Organization not found")
  }

  const subscription = organization.subscription
  const tier: SubscriptionTier = subscription?.tier || "STARTER"
  const maxPropertiesOverride = subscription?.maxPropertiesOverride ?? undefined
  const hasApiAccessOverride = subscription?.hasApiAccessOverride ?? undefined

  const features = getOrgFeatures(tier, maxPropertiesOverride, hasApiAccessOverride)

  const used = organization._count.properties
  const limit = features.maxProperties
  const isUnlimited = limit === Infinity
  const isAtLimit = !isUnlimited && used >= limit
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100)

  return {
    properties: {
      used,
      limit: isUnlimited ? Infinity : limit,
      isAtLimit,
      percentage,
      isUnlimited,
    },
  }
}