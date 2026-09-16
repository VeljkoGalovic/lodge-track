import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures, getTierBadgeColor } from "@/lib/subscriptions"
import { billingStatus } from "@/lib/billing"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreditCard, Check, Lock, AlertTriangle, ArrowUpRight } from "lucide-react"
import type { Tier } from "@/lib/subscriptions"

interface TierCopy {
  name: string
  /** Indicative only — the amount actually charged is the one configured on the
   *  variant in the Lemon Squeezy store, and is shown on the checkout page. */
  price: number
  tagline: string
  popular: boolean
}

const TIER_COPY: Record<Tier, TierCopy> = {
  STARTER: { name: "Starter", price: 0, tagline: "For a first property or two", popular: false },
  PRO: { name: "Pro", price: 49, tagline: "For a growing portfolio", popular: true },
  ENTERPRISE: { name: "Enterprise", price: 199, tagline: "For large or multi-site operators", popular: false },
}

const TIER_ORDER: Tier[] = ["STARTER", "PRO", "ENTERPRISE"]

/** Every plan includes these; they are not gated by tier. */
const BASE_FEATURES = [
  "Property and booking management",
  "Availability calendar",
  "Activity feed and notifications",
  "Team members with roles",
]

/** Read straight from the feature gates, so this list cannot drift from the code. */
function tierFeatures(tier: Tier): string[] {
  const features = getOrgFeatures(tier)
  return [
    features.maxProperties === Infinity
      ? "Unlimited properties"
      : `Up to ${features.maxProperties} properties`,
    ...BASE_FEATURES,
    features.hasAdvancedAnalytics ? "Advanced financial analytics" : "No advanced analytics",
    features.hasTeamRoles ? "Role-based permissions" : "No role-based permissions",
    features.hasApiAccess ? "API access" : "No API access",
  ]
}

const COMPARISON_ROWS: Array<{ feature: string; value: (tier: Tier) => string | boolean }> = [
  {
    feature: "Max properties",
    value: (tier) => {
      const { maxProperties } = getOrgFeatures(tier)
      return maxProperties === Infinity ? "Unlimited" : String(maxProperties)
    },
  },
  { feature: "Booking management", value: () => true },
  { feature: "Availability calendar", value: () => true },
  { feature: "Activity feed", value: () => true },
  { feature: "Financial analytics", value: (tier) => getOrgFeatures(tier).hasAdvancedAnalytics },
  { feature: "Role-based permissions", value: (tier) => getOrgFeatures(tier).hasTeamRoles },
  { feature: "API access", value: (tier) => getOrgFeatures(tier).hasApiAccess },
]

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "string") {
    return <span className="text-slate-300">{value}</span>
  }

  return value ? (
    <>
      <Check className="mx-auto h-4 w-4 text-[#36BFAE]" />
      <span className="sr-only">Included</span>
    </>
  ) : (
    <>
      <Lock className="mx-auto h-4 w-4 text-slate-600" />
      <span className="sr-only">Not included</span>
    </>
  )
}

/** What a checkout redirect reports back through the query string. */
const CHECKOUT_ERRORS: Record<string, string> = {
  not_configured:
    "Checkout is not available yet — this deployment has no Lemon Squeezy credentials set. See the configuration note below.",
  unknown_tier: "That plan is not one we sell.",
  not_owner: "Only an owner of this organization can change its plan.",
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

  const params = await searchParams

  const org = user.organization
  const subscription = org.subscription
  const currentTier: Tier = subscription?.tier ?? "STARTER"

  const features = getOrgFeatures(
    currentTier,
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  const provider = billingStatus()
  const isOwner = user.role === "OWNER"
  const statusLabel = (subscription?.status ?? "ACTIVE").toLowerCase().replace(/_/g, " ")

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Billing & Subscription"
        description="Manage your plan and billing details."
      />

      {params.error && CHECKOUT_ERRORS[params.error] ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{CHECKOUT_ERRORS[params.error]}</p>
        </div>
      ) : null}

      {params.checkout === "complete" ? (
        <div className="rounded-xl border border-[#36BFAE]/25 bg-[#36BFAE]/10 px-4 py-3 text-sm text-slate-300">
          Checkout finished. Your plan updates as soon as Lemon Squeezy confirms the payment — reload
          this page in a moment if it still shows the old one.
        </div>
      ) : null}

      {/* Current Plan Card */}
      <Card className="border-[#36BFAE]/25">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#36BFAE]" />
                Current Plan
              </CardTitle>
              <CardDescription>Your current subscription tier</CardDescription>
            </div>
            <Badge variant="outline" className={getTierBadgeColor(features.tier)}>
              {subscription?.tier ?? "STARTER"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Plan price",
                value:
                  TIER_COPY[currentTier].price === 0
                    ? "Free"
                    : `$${TIER_COPY[currentTier].price}/mo`,
              },
              {
                label: "Properties used",
                value: `${org._count?.properties || 0} / ${
                  features.maxProperties === Infinity ? "∞" : features.maxProperties
                }`,
              },
              { label: "Status", value: statusLabel },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="mt-1 text-2xl font-bold capitalize tracking-tight text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {subscription?.billingSubscriptionId ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-slate-400">Lemon Squeezy subscription</p>
              <p className="mt-1 font-mono text-sm text-slate-300">
                {subscription.billingSubscriptionId}
              </p>
              {subscription.currentPeriodEnd ? (
                <p className="mt-1 text-xs text-slate-500">
                  Current period ends{" "}
                  {subscription.currentPeriodEnd.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
              ) : null}
            </div>
          ) : null}

          {subscription?.isLifetimeFree ? (
            <p className="text-sm text-slate-400">
              This organization is marked lifetime free — no payment is taken, and plan changes are
              not needed.
            </p>
          ) : null}

          {/* Cancelling and card changes are the provider's own hosted flows; the
              link is only offered when a checkout is configured at all, since
              without credentials there is no customer portal to point at. */}
          {subscription?.billingSubscriptionId && provider.canCheckout ? (
            <p className="text-sm text-slate-400">
              To change your card, download an invoice, or cancel, use the customer portal link in
              the receipt email Lemon Squeezy sent when you subscribed.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-white">Choose Your Plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TIER_ORDER.map((tier) => {
            const copy = TIER_COPY[tier]
            const isCurrent = tier === currentTier
            const featuresForTier = tierFeatures(tier)
            // STARTER is the free tier created at registration, so it is never
            // bought. The paid tiers are self-serve once the deployment has the
            // credentials to open a checkout at all.
            const purchasable = tier !== "STARTER" && provider.canCheckout

            return (
              <Card
                key={tier}
                className={
                  copy.popular
                    ? "relative flex flex-col overflow-visible border-[#BA87FF]/50 bg-white/[0.08] ring-1 ring-[#BA87FF]/30"
                    : "relative flex flex-col"
                }
              >
                {copy.popular && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#BA87FF]/20 blur-[80px]"
                    />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="border-transparent bg-[#BA87FF] text-[#07090E]">
                        Most Popular
                      </Badge>
                    </div>
                  </>
                )}
                <CardHeader>
                  <div className="text-center">
                    <div className="mb-2 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold tracking-tight text-white">
                        ${copy.price}
                      </span>
                      <span className="text-slate-400">/month</span>
                    </div>
                    <h3 className="text-xl font-semibold text-white">{copy.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{copy.tagline}</p>
                    {isCurrent && (
                      <Badge variant="secondary" className="mt-3">
                        Current Plan
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-6 flex-1 space-y-3">
                    {featuresForTier.map((feature) => {
                      const excluded = feature.startsWith("No ")
                      return (
                        <li
                          key={feature}
                          className={
                            excluded
                              ? "flex items-start gap-2 text-sm text-slate-500"
                              : "flex items-start gap-2 text-sm text-slate-300"
                          }
                        >
                          {excluded ? (
                            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                          ) : (
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#36BFAE]" />
                          )}
                          <span>{feature}</span>
                        </li>
                      )
                    })}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : purchasable && isOwner ? (
                    <Button
                      variant={copy.popular ? "primary" : "outline"}
                      className="w-full"
                      href={`/api/billing/checkout?tier=${tier}`}
                    >
                      Choose {copy.name}
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
                          ? "Only an owner can change this organization's plan"
                          : "Checkout is not configured on this deployment"
                      }
                    >
                      {isOwner ? "Checkout unavailable" : "Owner only"}
                      {isOwner ? <ArrowUpRight className="ml-2 h-4 w-4" /> : null}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="text-xs text-slate-500">
          Amounts shown are indicative. The price charged is the one configured on the variant in
          your Lemon Squeezy store, and is displayed on the checkout page before you pay.
        </p>
      </div>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
          <CardDescription>
            Taken from the same limits the app enforces, so what is listed here is what you get
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-center">Starter</TableHead>
                <TableHead className="text-center">Pro</TableHead>
                <TableHead className="text-center">Enterprise</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON_ROWS.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="font-medium text-white">{row.feature}</TableCell>
                  {TIER_ORDER.map((tier) => (
                    <TableCell key={tier} className="text-center">
                      <ComparisonCell value={row.value(tier)} />
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
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Invoices are issued by Lemon Squeezy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
              <CreditCard className="h-6 w-6 text-[#36BFAE]" />
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm text-slate-400">
              Invoices are not read back from the provider, so none are listed here. Each payment
              sends a receipt with a customer portal link, and that is where invoices live.
            </p>
          </div>
        </CardContent>
      </Card>

      {!provider.canCheckout ? (
        <Card className="border-amber-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="h-5 w-5" />
              Billing is not configured on this deployment
            </CardTitle>
            <CardDescription>
              The plan cards above are read-only until these environment variables are set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 font-mono text-xs text-slate-400">
              {provider.missing.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
            <p className="text-sm text-slate-400">
              Webhook deliveries are {provider.canReceiveWebhooks ? "verifiable" : "not verifiable"} —
              {" "}
              {provider.canReceiveWebhooks
                ? "the signing secret is set, so subscription updates from the provider will be applied."
                : "LEMON_SQUEEZY_WEBHOOK_SECRET is unset, so any webhook delivery is rejected and plans never change on payment."}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
