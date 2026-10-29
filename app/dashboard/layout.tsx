import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Metadata } from "next"
import { getOrgFeatures } from "@/lib/subscriptions"
import { buildActivity } from "@/lib/activity"
import { currentLocale } from "@/lib/i18n/server"
import { currentThemePreference } from "@/lib/theme-server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { createCheckoutUrl, hasValidAccess, needsHostedCheckout } from "@/lib/billing"
import { requestOrigin } from "@/lib/origin"
import { headers } from "next/headers"

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * The dashboard is private data behind a session — no search engine should
 * ever index it. robots.txt blocks the crawl; the meta twin covers the
 * crawler that follows a link somewhere in spite of it.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/signin")
  }

  // Fetch user first (needed for orgId)
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

  // Now fetch bookings and preferences in parallel with locale/theme
  const now = new Date()
  const preferences = {
    notifyCheckInsDue: user.notifyCheckInsDue,
    notifyStaysEnding: user.notifyStaysEnding,
    notifyMissingRate: user.notifyMissingRate,
  }

  const [bookingsResult, locale, theme] = await Promise.all([
    prisma.booking.findMany({
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
    }),
    currentLocale(user.locale),
    currentThemePreference(user.theme),
  ])

  const attentionCount = buildActivity(bookingsResult, preferences, now).length

  // Subscription payment guard: ensure paid tiers have completed checkout.
  // If the tier is a paid one but the subscription lacks billing identifiers,
  // they haven't completed Lemon Squeezy checkout — except for a deliberate
  // lifetime grant, which by definition never carries identifiers and must
  // reach the dashboard untouched. This runs BEFORE the billing access guard,
  // because a CANCELED status with no billing identifiers means "never
  // completed checkout", not "access revoked after having access".
  if (subscription && needsHostedCheckout(subscription)) {
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

  // Billing guard: redirect to billing page if subscription is expired/inactive and trial has ended
  // Only runs if user has completed checkout (has billing identifiers) or is on free tier
  const hasAccess = hasValidAccess(subscription?.status ?? "CANCELED", subscription?.trialEndsAt ?? null)
  if (!hasAccess) {
    redirect("/dashboard/billing?reason=access_revoked")
  }

  // Check if onboarding is completed for paid subscriptions
  // Only show wizard for organizations with an active paid subscription
  const paidTiers = ["STARTER", "PRO", "BUSINESS"] as const
  const isPaidTier = subscription && paidTiers.includes(subscription.tier)
  const needsOnboarding = Boolean(isPaidTier && !org.onboardingCompleted)

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  return (
    <DashboardShell
      orgName={org.name}
      features={features}
      userName={user.name || undefined}
      userEmail={user.email}
      attentionCount={attentionCount}
      locale={locale}
      theme={theme}
      needsOnboarding={needsOnboarding}
      subscriptionTier={subscription?.tier || "STARTER"}
    >
      {children}
    </DashboardShell>
  )
}