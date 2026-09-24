import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"

/**
 * Verifies that the organization has API access (Business/Enterprise tier).
 * Returns the membership object if valid, or a NextResponse with 403 if not.
 */
export async function verifyApiAccess(req: NextRequest): Promise<
  | { ok: true; membership: { user: { id: string; orgId: string }; organization: { id: string; subscription: { tier: string } | null } } }
  | { ok: false; response: NextResponse }
> {
  const session = await auth()

  if (!session?.user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: {
        include: {
          subscription: true,
        },
      },
    },
  })

  if (!user?.organization) {
    return {
      ok: false,
      response: NextResponse.json({ error: "organization not found" }, { status: 404 })
    }
  }

  const org = user.organization
  const subscription = org.subscription

  // Get organization features to check API access
  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride ?? undefined
  )

  if (!features.hasApiAccess) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "forbidden",
          message: "API access requires Business tier or higher",
          requiredTier: "BUSINESS",
          currentTier: features.tier
        },
        { status: 403 }
      )
    }
  }

  return {
    ok: true,
    membership: {
      user: { id: user.id, orgId: user.orgId },
      organization: { id: org.id, subscription: subscription ? { tier: subscription.tier } : null }
    }
  }
}