import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hasValidAccess } from "@/lib/billing"
import { guardApiRateLimit } from "@/lib/api-guard"

/**
 * Development fallback: if NODE_ENV=development and checkout=complete with mock=true,
 * create a mock active subscription for local testing without live webhooks.
 */
async function ensureMockSubscription(user: { orgId: string; email: string }, tier: "STARTER" | "PRO" | "BUSINESS" = "STARTER") {
  if (process.env.NODE_ENV !== "development") return null

  // Check if subscription already exists with billing identifiers
  const existing = await prisma.subscription.findUnique({
    where: { orgId: user.orgId },
  })

  if (existing?.billingSubscriptionId && existing?.billingCustomerId) {
    return existing // Already has real webhook data
  }

  // Create or update with mock identifiers for local testing
  const mockSub = await prisma.subscription.upsert({
    where: { orgId: user.orgId },
    create: {
      orgId: user.orgId,
      tier,
      status: "ACTIVE",
      billingSubscriptionId: `mock_sub_${user.orgId}`,
      billingCustomerId: `mock_cust_${user.orgId}`,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      tier,
      status: "ACTIVE",
      billingSubscriptionId: existing?.billingSubscriptionId ?? `mock_sub_${user.orgId}`,
      billingCustomerId: existing?.billingCustomerId ?? `mock_cust_${user.orgId}`,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  console.log("[dev] Created mock subscription for local testing:", {
    orgId: user.orgId,
    tier: mockSub.tier,
    status: mockSub.status,
  })

  return mockSub
}

export async function GET(request: Request) {
  const rateLimited = await guardApiRateLimit(request)
  if (rateLimited) return rateLimited

  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const isMockRequest = searchParams.get("mock") === "true"
  const isCheckoutComplete = searchParams.get("checkout") === "complete"

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: { include: { subscription: true } } },
  })

  if (!user?.organization?.subscription) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 })
  }

  const sub = user.organization.subscription

  // Development fallback: auto-create mock subscription if polling times out
  if (process.env.NODE_ENV === "development" && (isMockRequest || isCheckoutComplete)) {
    const tier = sub.tier as "STARTER" | "PRO" | "BUSINESS"
    const mockSub = await ensureMockSubscription({ orgId: user.orgId, email: user.email }, tier)

    if (mockSub) {
      const hasAccess = hasValidAccess(mockSub.status, mockSub.trialEndsAt)
      return NextResponse.json({
        tier: mockSub.tier,
        status: mockSub.status,
        hasAccess,
        billingSubscriptionId: mockSub.billingSubscriptionId,
        billingCustomerId: mockSub.billingCustomerId,
        currentPeriodEnd: mockSub.currentPeriodEnd,
        trialEndsAt: mockSub.trialEndsAt,
        mock: true,
      })
    }
  }

  const hasAccess = hasValidAccess(sub.status, sub.trialEndsAt)

  return NextResponse.json({
    tier: sub.tier,
    status: sub.status,
    hasAccess,
    billingSubscriptionId: sub.billingSubscriptionId,
    billingCustomerId: sub.billingCustomerId,
    currentPeriodEnd: sub.currentPeriodEnd,
    trialEndsAt: sub.trialEndsAt,
  })
}