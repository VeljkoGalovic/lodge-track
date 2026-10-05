import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { buildActivity } from "@/lib/activity"
import { currentLocale } from "@/lib/i18n/server"
import { currentThemePreference } from "@/lib/theme-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { hasValidAccess } from "@/lib/billing"
import { requestOrigin } from "@/lib/origin"
import { createCheckoutUrl } from "@/lib/billing"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/signin")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: {
        include: {
          subscription: true,
          _count: {
            select: { properties: true },
          },
        }
      }
    }
  })

  // `User.orgId` is required and cascades, so a user without an organization
  // should be impossible. Onboarding is the recovery path if that ever stops
  // being true, rather than a redirect to registration that would strand an
  // already-authenticated account.
  if (!user?.organization) {
    redirect("/onboarding")
  }

  const org = user.organization
  const subscription = org.subscription

  // Billing guard: redirect to billing page if subscription is expired/inactive and trial has ended
  const hasAccess = hasValidAccess(subscription?.status ?? "CANCELED", subscription?.trialEndsAt ?? null)
  if (!hasAccess) {
    redirect("/dashboard/billing?reason=access_revoked")
  }

  // Subscription payment guard: ensure paid tiers have completed checkout
  // If user has a paid tier (STARTER, PRO, BUSINESS) but subscription lacks billing identifiers,
  // they haven't completed Lemon Squeezy checkout - redirect to checkout
  const paidTiers = ["STARTER", "PRO", "BUSINESS"] as const
  if (subscription && paidTiers.includes(subscription.tier)) {
    const hasBillingIdentifiers = subscription.billingCustomerId && subscription.billingSubscriptionId

    if (!hasBillingIdentifiers) {
      // Check redirect counter to prevent infinite loop
      // After checkout, Lemon Squeezy redirects back with ?checkout=complete
      // We allow up to 3 redirects to give webhook time to process
      const headersList = await headers()
      const cookieHeader = headersList.get("cookie") ?? ""
      const redirectCountMatch = cookieHeader.match(/checkout_redirect_count=(\d+)/)
      const redirectCount = redirectCountMatch ? parseInt(redirectCountMatch[1], 10) : 0

      if (redirectCount >= 3) {
        // Too many redirects - let the billing page handle it with polling
        // Don't redirect to checkout again
      } else {
        // User selected a paid tier but never completed checkout - redirect to checkout
        const origin = await requestOrigin()
        const checkoutUrl = await createCheckoutUrl({
          tier: subscription.tier,
          email: user.email,
          orgId: user.orgId,
          redirectUrl: `${origin}/dashboard/billing?checkout=complete`,
        })

        if (checkoutUrl) {
          redirect(checkoutUrl)
        } else {
          // Checkout creation failed - redirect to billing with error
          redirect("/dashboard/billing?reason=checkout_failed")
        }
      }
    }
  }

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  // The bell's count obeys the same preferences as the feed itself, so the two
  // can never disagree about how much is waiting.
  const preferences = {
    notifyCheckInsDue: user.notifyCheckInsDue,
    notifyStaysEnding: user.notifyStaysEnding,
    notifyMissingRate: user.notifyMissingRate,
  }

  const bookings = await prisma.booking.findMany({
    where: { property: { orgId: org.id } },
    select: {
      id: true,
      guestName: true,
      startDate: true,
      endDate: true,
      status: true,
      totalAmount: true,
      property: { select: { id: true, name: true } },
    },
  })

  const attentionCount = buildActivity(bookings, preferences, new Date()).length

  /**
   * Both preferences are read here and handed to the shell as its starting
   * state. The cookie is authoritative — it is what `BootScript` already painted
   * the page with — and the user row is the fallback for a member signing in on
   * a device that has never seen either cookie. The row is what the setters in
   * app/actions/preferences.ts write, so the two only disagree for one request
   * after a write on another device.
   */
  const locale = await currentLocale(user.locale)
  const theme = await currentThemePreference(user.theme)

  return (
    <DashboardShell
      orgName={org.name}
      features={features}
      userName={user.name || undefined}
      userEmail={user.email}
      attentionCount={attentionCount}
      locale={locale}
      theme={theme}
    >
      {children}
    </DashboardShell>
  )
}