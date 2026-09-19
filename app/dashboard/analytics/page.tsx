import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { ForecastCard } from "@/components/dashboard/AnalyticsSection"
import { monthlySeries, expenseSeries } from "@/lib/dashboard-metrics"
import { projectSeries } from "@/lib/metrics-display"
import { Lock, DollarSign, Home, TrendingUp, ArrowUpRight } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { getExchangeRates } from "@/lib/exchange-rates"

const RANGE_MONTHS = { "3": 3, "6": 6, "12": 12 } as const
type RangeKey = keyof typeof RANGE_MONTHS

function parseRange(value: string | undefined): RangeKey {
  return value === "3" || value === "12" ? value : "6"
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; forecast?: string }>
}) {
  const params = await searchParams
  const range = parseRange(params.range)
  const showForecast = params.forecast === "on"

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
              bookings: true,
              expenses: true
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

  const previewFeatures = [
    {
      icon: DollarSign,
      title: t.pages.analytics.revenueReports,
      description: t.pages.analytics.revenueHelp,
    },
    {
      icon: Home,
      title: t.pages.analytics.occupancyTrends,
      description: t.pages.analytics.occupancyHelp,
    },
    {
      icon: TrendingUp,
      title: t.pages.analytics.forecasting,
      description: t.pages.analytics.forecastingPreview,
    },
  ]

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
            <h3 className="text-xl font-semibold text-foreground">{t.pages.analytics.locked}</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-subtle-foreground">
              {t.pages.analytics.unlock}
            </p>
            <Button size="lg" href="/dashboard/billing" className="mt-6">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              {t.pages.analytics.upgrade}
            </Button>
          </div>
        </Card>

        {/* Feature preview cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {previewFeatures.map(({ icon: Icon, title, description }) => (
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
  const series = monthlySeries(org.properties, new Date(), RANGE_MONTHS[range], org.currency, rates, locale)
  const expenses = expenseSeries(
    org.properties.flatMap((property) =>
      property.expenses.map((expense) => ({
        date: expense.date,
        amount: expense.amount,
        currency: property.currency,
      }))
    ),
    new Date(),
    RANGE_MONTHS[range],
    org.currency,
    rates,
    locale
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.insights}
        title={t.pages.analytics.title}
        description={t.pages.analytics.description}
        action={
          /**
           * The forecast toggle lives here, in the page header — not in a
           * global settings toggle. The search param drives the server render,
           * so the projected bars arrive already drawn (or already gone).
           */
          <Button
            href={showForecast ? `/dashboard/analytics?range=${range}` : `/dashboard/analytics?range=${range}&forecast=on`}
            variant={showForecast ? "glass" : "outline"}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {showForecast ? t.pages.analytics.forecastHide : t.pages.analytics.forecastShow}
          </Button>
        }
      />

      <AnalyticsSection
        hasAccess
        currency={org.currency}
        range={range}
        data={{ ...series, expenses }}
      />

      <ForecastCard
        showForecast={showForecast}
        currency={org.currency}
        revenue={series.revenue}
        revenueProjection={showForecast ? projectSeries(series.revenue) : undefined}
        occupancy={series.occupancy}
        occupancyProjection={showForecast ? projectSeries(series.occupancy) : undefined}
      />
    </div>
  )
}
