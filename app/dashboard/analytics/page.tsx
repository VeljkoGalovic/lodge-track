import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { monthlySeries } from "@/lib/dashboard-metrics"
import { Lock, DollarSign, Home, TrendingUp, ArrowUpRight } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getExchangeRates } from "@/lib/exchange-rates"

const PREVIEW_FEATURES = [
  {
    icon: DollarSign,
    title: "Revenue Reports",
    description: "Monthly, quarterly, and yearly revenue breakdowns",
  },
  {
    icon: Home,
    title: "Occupancy Trends",
    description: "Historical occupancy rates and seasonal patterns",
  },
  {
    icon: TrendingUp,
    title: "Forecasting",
    description: "AI-powered revenue and occupancy predictions",
  },
]

export default async function AnalyticsPage() {
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
          properties: {
            include: {
              bookings: true
            }
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

  const org = user.organization
  const subscription = org.subscription

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  if (!features.hasAdvancedAnalytics) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t.pages.eyebrows.insights}
          title={t.pages.analytics.title}
          description={t.pages.analytics.description}
        />

        <Card className="relative overflow-hidden">
          {/* Ambient purple wash, matching the landing page's feature cards. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-purple/15 blur-[100px]"
          />
          <div className="relative p-8 text-center md:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10">
              <Lock className="h-8 w-8 text-brand-purple" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Financial Analytics Locked</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-subtle-foreground">
              Unlock detailed revenue reports, occupancy trends, financial forecasting, and advanced
              analytics with the Pro plan.
            </p>
            <Button size="lg" href="/dashboard/billing" className="mt-6">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
        </Card>

        {/* Feature preview cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {PREVIEW_FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const rates = await getExchangeRates()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.insights}
        title={t.pages.analytics.title}
        description={t.pages.analytics.description}
      />

      <AnalyticsSection
        hasAccess
        currency={org.currency}
        data={monthlySeries(org.properties, new Date(), 6, org.currency, rates, locale)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-purple" />
            Forecasting
          </CardTitle>
          <CardDescription>
            Projected revenue and occupancy are not built yet — the charts above report what has
            actually been recorded.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
