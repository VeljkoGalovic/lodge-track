import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hasValidAccess, tierForVariantId } from "@/lib/billing"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: { include: { subscription: true } } },
  })

  if (!user?.organization?.subscription) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 })
  }

  const sub = user.organization.subscription
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