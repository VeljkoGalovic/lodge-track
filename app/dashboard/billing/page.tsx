import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { billingStatus } from "@/lib/billing"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreditCard, Check, Lock, AlertTriangle, ArrowUpRight } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { format, getDictionary, type Dictionary } from "@/lib/i18n/dictionaries"
import { getOrgFeatures, getTierBadgeColor, formatBytes, TIER_PRICES_CENTS, TIER_PRICE_STRINGS, getAccountManagerEmail } from "@/lib/subscriptions"
import type { Tier } from "@/lib/subscriptions"
import { CheckoutComplete } from "./CheckoutComplete"

interface TierCopy {
  name: string
  /** Price in cents (minor units) as configured in Lemon Squeezy. */
  priceCents: number
  popular: boolean
}

const TIER_COPY: Record<Tier, TierCopy> = {
  STARTER: { name: "Starter", priceCents: TIER_PRICES_CENTS.STARTER, popular: false },
  PRO: { name: "Pro", priceCents: TIER_PRICES_CENTS.PRO, popular: true },
  BUSINESS: { name: "Business", priceCents: TIER_PRICES_CENTS.BUSINESS, popular: false },
}

const TIER_ORDER: Tier[] = ["STARTER", "PRO", "BUSINESS"]

/** Feature availability is data, never inferred from translated copy. */
function tierFeatures(tier: Tier, t: Dictionary): { label: string; included: boolean }[] {
  const features = getOrgFeatures(tier)
  return [
    { label: features.maxProperties === Infinity ? t.pages.billing.unlimitedProperties : format(t.pages.billing.propertyAllowance, { count: features.maxProperties }), included: true },
    ...[t.pages.billing.propertyManagement, t.pages.billing.calendar, t.pages.billing.notifications, t.pages.billing.members].map((label) => ({ label, included: true })),
    { label: features.hasAdvancedAnalytics ? t.pages.billing.analytics : t.pages.billing.noAnalytics, included: features.hasAdvancedAnalytics },
    { label: features.hasTeamRoles ? t.pages.billing.permissions : t.pages.billing.noPermissions, included: features.hasTeamRoles },
    { label: features.hasApiAccess ? t.settings.apiAccess : t.pages.billing.noApi, included: features.hasApiAccess },
  ]
}

function comparisonRows(t: Dictionary): Array<{ feature: string; value: (tier: Tier) => string | boolean }> {
  return [
    { feature: t.settings.propertyLimit, value: (tier) => {
      const { maxProperties } = getOrgFeatures(tier)
      return maxProperties === Infinity ? t.common.unlimited : String(maxProperties)
    } },
    { feature: t.pages.billing.bookingManagement, value: () => true },
    { feature: t.pages.billing.calendar, value: () => true },
    { feature: t.pages.billing.activity, value: () => true },
    { feature: t.pages.billing.financialAnalytics, value: (tier) => getOrgFeatures(tier).hasAdvancedAnalytics },
    { feature: t.pages.billing.permissions, value: (tier) => getOrgFeatures(tier).hasTeamRoles },
    { feature: t.settings.apiAccess, value: (tier) => getOrgFeatures(tier).hasApiAccess },
  ]
}

function ComparisonCell({ value, t }: { value: string | boolean; t: Dictionary }) {
  if (typeof value === "string") {
    return <span className="text-muted-foreground">{value}</span>
  }

  return value ? (
    <>
      <Check className="mx-auto h-4 w-4 text-primary" />
      <span className="sr-only">{t.settings.included}</span>
    </>
  ) : (
    <>
      <Lock className="mx-auto h-4 w-4 text-subtle-foreground" />
      <span className="sr-only">{t.settings.notIncluded}</span>
    </>
  )
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkout?: string }>
}) {
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
            select: { properties: true }
          }
        }
      }
    }
  })

  if (!user?.organization) {
    redirect("/onboarding")
  }

  // The locale lives on the member row, so it is only readable once that row is
  // in hand. The dashboard layout resolves the same value for the shell.
  const locale = await currentLocale(user.locale)
  const t = getDictionary(locale)
  const dateLocale = locale === "sr" ? "sr-Latn-RS" : "en-US"
  const price = (amount: number) => new Intl.NumberFormat(dateLocale, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)
  const taglines: Record<Tier, string> = {
    STARTER: t.pages.billing.starterTagline,
    PRO: t.pages.billing.proTagline,
    BUSINESS: t.pages.billing.businessTagline,
  }
  const checkoutErrors: Record<string, string> = {
    not_configured: t.pages.billing.errorNotConfigured,
    unknown_tier: t.pages.billing.errorUnknownTier,
    not_owner: t.pages.billing.errorNotOwner,
  }

  const params = await searchParams

  const org = user.organization
  const subscription = org.subscription
  const currentTier: Tier = subscription?.tier ?? "STARTER"

  const features = getOrgFeatures(
    currentTier,
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  const accountManagerEmail = getAccountManagerEmail(currentTier)

  const provider = billingStatus()
  const isOwner = user.role === "OWNER"
  const statusLabel = t.pages.billing.statuses[subscription?.status ?? "ACTIVE"]

  // Format price in cents to locale-aware currency string
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat(dateLocale, { style: "currency", currency: "USD" }).format(cents / 100)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.account}
        title={t.pages.billing.title}
        description={t.pages.billing.description}
      />

      {params.error && checkoutErrors[params.error] ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{checkoutErrors[params.error]}</p>
        </div>
      ) : null}

      {params.checkout === "complete" ? (
        <CheckoutComplete
          message={t.pages.billing.checkoutComplete}
          pollingMessage={t.pages.billing.pollingCheckout}
        />
      ) : null}

      {/* Current Plan Card */}
      <Card className="border-primary/25">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {t.pages.billing.currentPlan}
              </CardTitle>
              <CardDescription>{t.pages.billing.currentPlanHelp}</CardDescription>
            </div>
            <Badge variant="outline" className={getTierBadgeColor(features.tier)}>
              {subscription?.tier ?? "STARTER"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: t.pages.billing.planPrice,
                value:
                  TIER_COPY[currentTier].priceCents === 0
                    ? t.pages.billing.free
                    : format(t.pages.billing.monthlyPrice, { amount: formatPrice(TIER_COPY[currentTier].priceCents) }),
              },
              {
                label: t.pages.billing.propertiesUsed,
                value: `${org._count?.properties || 0} / ${
                  features.maxProperties === Infinity ? "∞" : features.maxProperties
                }`,
              },
              { label: t.forms.status, value: statusLabel },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-muted p-4"
              >
                <p className="text-sm text-subtle-foreground">{item.label}</p>
                <p className="mt-1 text-2xl font-bold capitalize tracking-tight text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {subscription?.billingSubscriptionId ? (
            <div className="rounded-2xl border border-border bg-muted p-4">
              <p className="text-sm text-subtle-foreground">{t.pages.billing.providerSubscription}</p>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {subscription.billingSubscriptionId}
              </p>
              {subscription.currentPeriodEnd ? (
                <p className="mt-1 text-xs text-subtle-foreground">
                  {format(t.pages.billing.periodEnds, { date: subscription.currentPeriodEnd.toLocaleDateString(dateLocale, {
                    day: "numeric", month: "long", year: "numeric",
                  }) })}
                </p>
              ) : null}
            </div>
          ) : null}

          {subscription?.isLifetimeFree ? (
            <p className="text-sm text-subtle-foreground">
              {t.pages.billing.lifetimeHelp}
            </p>
          ) : null}

          {/* Cancelling and card changes are the provider's own hosted flows; the
              link is only offered when a checkout is configured at all, since
              without credentials there is no customer portal to point at. */}
          {subscription?.billingSubscriptionId && provider.canCheckout ? (
            <p className="text-sm text-subtle-foreground">
              {t.pages.billing.portalHelp}
            </p>
          ) : null}

          {accountManagerEmail && currentTier === "BUSINESS" ? (
            <div className="rounded-2xl border border-brand-purple/25 bg-brand-purple/10 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-brand-purple">{t.pages.billing.accountManager}</span>
              </div>
              <p className="mt-1 text-sm text-subtle-foreground">{t.pages.billing.accountManagerHelp}</p>
              <p className="mt-2 font-mono text-sm text-brand-purple">{accountManagerEmail}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t.pages.billing.choosePlan}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TIER_ORDER.map((tier) => {
            const copy = TIER_COPY[tier]
            const isCurrent = tier === currentTier
            const featuresForTier = tierFeatures(tier, t)
            // STARTER is the free tier created at registration, so it is never
            // bought. The paid tiers are self-serve once the deployment has the
            // credentials to open a checkout at all.
            const purchasable = tier !== "STARTER" && provider.canCheckout

            return (
              <Card
                key={tier}
                className={
                  copy.popular
                    ? "relative flex flex-col overflow-visible border-brand-purple/50 bg-accent ring-1 ring-[#BA87FF]/30"
                    : "relative flex flex-col"
                }
              >
                {copy.popular && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-purple/20 blur-[80px]"
                    />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="border-transparent bg-brand-purple text-[#07090E]">
                        {t.pages.billing.popular}
                      </Badge>
                    </div>
                  </>
                )}
                <CardHeader>
                  <div className="text-center">
                    <div className="mb-2 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold tracking-tight text-foreground">
                        {formatPrice(copy.priceCents)}
                      </span>
                      <span className="text-subtle-foreground">{t.pages.billing.perMonth}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{copy.name}</h3>
                    <p className="mt-1 text-sm text-subtle-foreground">{taglines[tier]}</p>
                    {isCurrent && (
                      <Badge variant="secondary" className="mt-3">
                        {t.pages.billing.currentPlan}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-6 flex-1 space-y-3">
                    {featuresForTier.map((feature) => {
                      const excluded = !feature.included
                      return (
                        <li
                          key={feature.label}
                          className={
                            excluded
                              ? "flex items-start gap-2 text-sm text-subtle-foreground"
                              : "flex items-start gap-2 text-sm text-muted-foreground"
                          }
                        >
                          {excluded ? (
                            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                          ) : (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          )}
                          <span>{feature.label}</span>
                        </li>
                      )
                    })}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t.pages.billing.currentPlan}
                    </Button>
                  ) : purchasable && isOwner ? (
                    <Button
                      variant={copy.popular ? "primary" : "outline"}
                      className="w-full"
                      href={`/api/billing/checkout?tier=${tier}`}
                    >
                      {format(t.pages.billing.choose, { plan: copy.name })}
                    </Button>
                  ) : (
                    // Says why rather than appearing to do something: either the
                    // viewer cannot commit the organization to a plan, or this
                    // deployment has no credentials to take a payment with.
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                      title={
                        !isOwner
                          ? t.pages.billing.ownerOnlyHint
                          : t.pages.billing.unavailableHint
                      }
                    >
                      {isOwner ? t.pages.billing.unavailable : t.pages.billing.ownerOnly}
                      {isOwner ? <ArrowUpRight className="ml-2 h-4 w-4" /> : null}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="text-xs text-subtle-foreground">
          {t.pages.billing.priceDisclaimer}
        </p>
      </div>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t.pages.billing.comparison}</CardTitle>
          <CardDescription>
            {t.pages.billing.comparisonHelp}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.pages.billing.feature}</TableHead>
                <TableHead className="text-center">Starter</TableHead>
                <TableHead className="text-center">Pro</TableHead>
                <TableHead className="text-center">Business</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows(t).map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                  {TIER_ORDER.map((tier) => (
                    <TableCell key={tier} className="text-center">
                      <ComparisonCell value={row.value(tier)} t={t} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Billing history */}
      <Card>
        <CardHeader>
          <CardTitle>{t.pages.billing.history}</CardTitle>
          <CardDescription>{t.pages.billing.historyHelp}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm text-subtle-foreground">
              {t.pages.billing.noInvoices}
            </p>
          </div>
        </CardContent>
      </Card>

      {!provider.canCheckout ? (
        <Card className="border-warning/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              {t.pages.billing.notConfigured}
            </CardTitle>
            <CardDescription>
              {t.pages.billing.configurationHelp}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 font-mono text-xs text-subtle-foreground">
              {provider.missing.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            <p className="text-sm text-subtle-foreground">
              {provider.canReceiveWebhooks ? t.pages.billing.webhooksReady : t.pages.billing.webhooksUnavailable}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
