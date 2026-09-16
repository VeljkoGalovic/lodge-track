import { NextResponse } from "next/server"
import type { SubscriptionTier } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canAdminister } from "@/lib/authorization"
import { createCheckoutUrl } from "@/lib/billing"
import { absoluteUrl } from "@/lib/origin"

/**
 * Starts a subscription purchase.
 *
 * A GET that redirects, because its whole job is to hand the browser to the
 * hosted checkout page — there is no JSON for a client component to consume, and
 * the links that reach it are plain `href`s on the billing page.
 *
 * `tier` is a tier name rather than a provider price id: the variant ids are
 * configuration, and letting the browser name one would let it name any variant
 * in the store, including ones this app does not sell.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.redirect(absoluteUrl("/signin", request))
  }

  const tier = new URL(request.url).searchParams.get("tier")
  if (tier !== "PRO" && tier !== "ENTERPRISE") {
    return NextResponse.redirect(absoluteUrl("/dashboard/billing?error=unknown_tier", request))
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  })
  if (!user) {
    return NextResponse.redirect(absoluteUrl("/signin", request))
  }

  // Buying a plan commits the organization, not the person clicking.
  if (!canAdminister(user.role)) {
    return NextResponse.redirect(absoluteUrl("/dashboard/billing?error=not_owner", request))
  }

  const checkoutUrl = await createCheckoutUrl({
    tier: tier as SubscriptionTier,
    email: user.email,
    orgId: user.orgId,
    redirectUrl: absoluteUrl("/dashboard/billing?checkout=complete", request),
  })

  // Also the path taken when the deployment simply has no Lemon Squeezy
  // credentials yet, which the billing page reports in full.
  if (!checkoutUrl) {
    return NextResponse.redirect(absoluteUrl("/dashboard/billing?error=not_configured", request))
  }

  return NextResponse.redirect(checkoutUrl)
}
