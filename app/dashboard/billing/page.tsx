import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures, getTierBadgeColor, getTierLabel } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Check, Crown, Building2, Lock, ArrowUpRight } from "lucide-react"
import { clsx } from "clsx"

interface TierConfig {
  name: string
  price: number
  priceId: string | null
  features: string[]
  limits: string[]
  cta: string
  popular: boolean
}

const TIER_CONFIG: Record<string, TierConfig> = {
  STARTER: {
    name: "Starter",
    price: 0,
    priceId: null,
    features: [
      "Up to 3 properties",
      "Basic booking management",
      "Calendar view",
      "Guest communication",
      "Mobile app access",
    ],
    limits: ["No advanced analytics", "No team roles", "No API access"],
    cta: "Current Plan",
    popular: false,
  },
  PRO: {
    name: "Pro",
    price: 49,
    priceId: "price_pro_monthly",
    features: [
      "Up to 15 properties",
      "Everything in Starter",
      "Advanced financial analytics",
      "Occupancy reporting",
      "Team roles (Manager, Maintenance)",
      "API access",
      "Priority support",
    ],
    limits: [],
    cta: "Upgrade to Pro",
    popular: true,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 199,
    priceId: "price_enterprise_monthly",
    features: [
      "Unlimited properties",
      "Everything in Pro",
      "Custom integrations",
      "Dedicated account manager",
      "SSO & advanced security",
      "Custom reporting",
      "SLA guarantee",
      "White-label options",
    ],
    limits: [],
    cta: "Contact Sales",
    popular: false,
  },
}

export default async function BillingPage() {
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

  const org = user.organization
  const subscription = org.subscription
  const currentTier = (subscription?.tier || "STARTER") as keyof typeof TIER_CONFIG

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and billing details</p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-brand-teal/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-teal" />
                Current Plan
              </CardTitle>
              <CardDescription>Your current subscription tier</CardDescription>
            </div>
            <Badge variant="secondary" className={getTierBadgeColor(features.tier)}>
              {features.tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">Monthly Cost</p>
              <p className="text-3xl font-bold">${TIER_CONFIG[currentTier].price}/mo</p>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">Properties Used</p>
              <p className="text-3xl font-bold">
                {org._count?.properties || 0} / {features.maxProperties === Infinity ? "∞" : features.maxProperties}
              </p>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-3xl font-bold capitalize">
                {subscription?.status?.toLowerCase() || "active"}
              </p>
            </div>
          </div>

          {subscription?.stripeSubscriptionId && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Stripe Subscription ID</p>
              <p className="font-mono text-sm">{subscription.stripeSubscriptionId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Choose Your Plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(TIER_CONFIG).map(([tierKey, config]) => {
            const isCurrent = tierKey === currentTier
            const tier = tierKey as keyof typeof TIER_CONFIG
            return (
              <Card
                key={tier}
                className={clsx(
                  "relative flex flex-col",
                  isCurrent && "border-brand-teal ring-1 ring-brand-teal",
                  config.popular && "border-brand-purple ring-1 ring-brand-purple"
                )}
              >
                {config.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary" className="bg-brand-purple text-brand-purple-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-4xl font-bold">${config.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <h3 className="text-xl font-semibold capitalize">{config.name}</h3>
                    {isCurrent && (
                      <Badge variant="secondary" className="mt-2">
                        Current Plan
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    {config.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {config.limits.map((limit) => (
                      <li key={limit} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : config.popular ? "primary" : "outline"}
                    href={config.priceId ? `/api/billing/checkout?priceId=${config.priceId}` : "#"}
                    onClick={config.priceId ? undefined : (e: React.MouseEvent) => e.preventDefault()}
                    disabled={isCurrent}
                  >
                    {config.cta}
                    {!isCurrent && !config.priceId && <ArrowUpRight className="ml-2 h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
          <CardDescription>Detailed breakdown of what each plan includes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Feature</th>
                  <th className="pb-3 font-medium text-center">Starter</th>
                  <th className="pb-3 font-medium text-center">Pro</th>
                  <th className="pb-3 font-medium text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 font-medium">Max Properties</td>
                  <td className="py-3 text-center">3</td>
                  <td className="py-3 text-center">15</td>
                  <td className="py-3 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3">Booking Management</td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3">Financial Analytics</td>
                  <td className="py-3 text-center"><Lock className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3">Team Roles</td>
                  <td className="py-3 text-center"><Lock className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3">API Access</td>
                  <td className="py-3 text-center"><Lock className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3">Priority Support</td>
                  <td className="py-3 text-center"><Lock className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3">Custom Integrations</td>
                  <td className="py-3 text-center"><Lock className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="py-3 text-center"><Lock className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3">SSO & Advanced Security</td>
                  <td className="py-3 text-center"><Lock className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="py-3 text-center"><Lock className="h-4 w-4 text-muted-foreground mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-4 w-4 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Billing History Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Billing history will appear here after your first payment</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}