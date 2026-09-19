import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { MetricsGrid } from "@/components/dashboard/MetricsCards"
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection"
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { Button } from "@/components/ui/Button"
import {
  formatDateRange,
  monthlySeries,
  expenseSeries,
  monthWindow,
  occupancyAt,
  percentChange,
  shiftMonths,
  statsForWindow,
} from "@/lib/dashboard-metrics"
import { formatAmount, formatCurrency } from "@/lib/currency"
import { getExchangeRates } from "@/lib/exchange-rates"
import { Building2, Calendar, DollarSign, Home } from "lucide-react"
import { currentLocale } from "@/lib/i18n/server"
import { format, getDictionary } from "@/lib/i18n/dictionaries"

const RANGE_MONTHS = { "3": 3, "6": 6, "12": 12 } as const
type RangeKey = keyof typeof RANGE_MONTHS

function parseRange(value: string | undefined): RangeKey {
  return value === "3" || value === "12" ? value : "6"
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const params = await searchParams
  const range = parseRange(params.range)

  const session = await auth()

  if (!session?.user?.email) {
    redirect("/signin")
  }

  // Get user with organization and related data
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: {
        include: {
          subscription: true,
          properties: {
            include: {
              bookings: true,
              expenses: true,
              _count: { select: { units: true } },
            }
          }
        }
      }
    }
  })

  if (!user?.organization) {
    redirect("/onboarding")
  }

  // The locale is a property of the member, so it is only readable once the
  // user row above is in hand — the dashboard layout resolves the same value
  // for the shell, and this page needs it for its own header.
  const locale = await currentLocale(user.locale)
  const t = getDictionary(locale)

  const org = user.organization
  const subscription = org.subscription

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  const properties = org.properties
  const bookings = properties.flatMap((property) =>
    property.bookings.map((booking) => ({ ...booking, propertyName: property.name, propertyCurrency: property.currency }))
  )

  const now = new Date()
  const rates = await getExchangeRates()

  // Calculate metrics
  const totalProperties = properties.length
  const maxProperties = features.maxProperties
  const isAtPropertyLimit = totalProperties >= maxProperties && maxProperties !== Infinity

  // Bookings and revenue for the latest month of the chosen window, against the
  // month before it, so the trends are measured rather than assumed. The
  // timeframe is a search param, so switching it re-renders this page in place —
  // no navigation, and bookmarks preserve the view.
  const windowMonths = RANGE_MONTHS[range]
  const thisMonth = monthWindow(now)
  const lastMonth = monthWindow(now, -1)

  const monthStats = statsForWindow(properties, thisMonth, org.currency, rates)
  const previousMonthStats = statsForWindow(properties, lastMonth, org.currency, rates)

  const occupancyRate = occupancyAt(properties, now)
  const previousOccupancyRate = occupancyAt(properties, shiftMonths(now, -1))

  const bookingsTrend = percentChange(previousMonthStats.bookings, monthStats.bookings)
  const revenueTrend = percentChange(previousMonthStats.revenueCents, monthStats.revenueCents)
  const occupancyTrend = percentChange(previousOccupancyRate, occupancyRate)

  // Say so plainly when some stays have no rate on file, rather than presenting
  // a partial sum as if it were the whole month.
  const revenueSubtitle =
    monthStats.bookings === 0
      ? t.pages.dashboard.metrics.noBookingsThisMonth
      : monthStats.pricedBookings === monthStats.bookings
        ? format(t.pages.dashboard.metrics.fromBookingsCount, { count: monthStats.bookings })
        : format(t.pages.dashboard.metrics.pricedOfCount, { priced: monthStats.pricedBookings, count: monthStats.bookings })

  // Recent properties (newest first)
  const recentProperties = [...properties]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((property) => {
      const tonight = property.bookings.filter(
        (booking) =>
          booking.status !== "CANCELLED" &&
          new Date(booking.startDate) <= now &&
          new Date(booking.endDate) >= now
      )
      return {
        id: property.id,
        name: property.name,
        bookingCount: property.bookings.length,
        occupied: tonight.length > 0,
        /** Capacity read for shared properties; null keeps the classic badge. */
        bedsOccupied: property.allowSharedBookings
          ? tonight.reduce(
              (sum, booking) =>
                sum +
                (booking.type === "SHARED_BED"
                  ? booking.bedIds.length
                  : property._count.units || 1),
              0
            )
          : null,
        bedsTotal: property._count.units,
      }
    })

  // Recent bookings (newest first), reporting the status actually stored
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((booking) => ({
      id: booking.id,
      guestName: booking.guestName,
      propertyName: booking.propertyName,
      dates: formatDateRange(booking.startDate, booking.endDate, locale),
      status: booking.status,
      amount: formatAmount(booking.totalAmount, booking.propertyCurrency || org.currency),
    }))

  const analyticsData = features.hasAdvancedAnalytics
    ? {
        ...monthlySeries(properties, now, windowMonths, org.currency, rates, locale),
        expenses: expenseSeries(
          properties.flatMap((property) =>
            property.expenses.map((expense) => ({
              date: expense.date,
              amount: expense.amount,
              currency: property.currency,
            }))
          ),
          now,
          windowMonths,
          org.currency,
          rates,
          locale
        ),
      }
    : undefined

  const firstName = user.name?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.pages.eyebrows.overview}
        title={
          firstName
            ? format(t.pages.dashboard.welcomeBackName, { name: firstName })
            : t.pages.dashboard.welcomeBack
        }
        description={format(t.pages.dashboard.happening, { org: org.name })}
        action={
          <Button variant="glass" href="/dashboard/properties">
            {t.pages.dashboard.manageProperties}
          </Button>
        }
      />

      <MetricsGrid metrics={[
        {
          title: t.pages.dashboard.metrics.totalProperties,
          value: totalProperties,
          subtitle: `${maxProperties === Infinity ? t.pages.dashboard.metrics.unlimited : format(t.pages.dashboard.metrics.propertyLimit, { max: maxProperties })}`,
          icon: <Building2 className="h-5 w-5 text-[#36BFAE]" />,
          progress: {
            current: totalProperties,
            max: maxProperties,
            label: t.pages.dashboard.metrics.propertiesUsed
          },
          isAtLimit: isAtPropertyLimit,
          action: isAtPropertyLimit ? { label: t.pages.dashboard.metrics.upgradePlan, href: "/dashboard/billing" } : undefined,
        },
        {
          title: t.pages.dashboard.metrics.activeBookings,
          value: monthStats.bookings,
          subtitle: t.pages.dashboard.metrics.staysStartingThisMonth,
          icon: <Calendar className="h-5 w-5 text-[#BA87FF]" />,
          trend: bookingsTrend === undefined ? undefined : { value: bookingsTrend, label: t.pages.dashboard.metrics.vsLastMonth },
        },
        {
          title: t.pages.dashboard.metrics.totalRevenue,
          value: monthStats.pricedBookings > 0 ? formatCurrency(monthStats.revenueCents, org.currency) : "—",
          subtitle: revenueSubtitle,
          icon: <DollarSign className="h-5 w-5 text-[#36BFAE]" />,
          trend: revenueTrend === undefined ? undefined : { value: revenueTrend, label: t.pages.dashboard.metrics.vsLastMonth },
        },
        {
          title: t.pages.dashboard.metrics.occupancyRate,
          value: `${occupancyRate}%`,
          subtitle: t.pages.dashboard.metrics.propertiesOccupiedToday,
          icon: <Home className="h-5 w-5 text-[#BA87FF]" />,
          trend: occupancyTrend === undefined ? undefined : { value: occupancyTrend, label: t.pages.dashboard.metrics.vsLastMonth },
        },
      ]} />

      {/* Analytics Section - Feature Gated */}
      <AnalyticsSection
        hasAccess={features.hasAdvancedAnalytics}
        currency={org.currency}
        range={range}
        rangeBasePath="/dashboard"
        data={analyticsData}
      />

      {/* Recent Activity Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <RecentActivityTable
          type="properties"
          items={recentProperties}
          viewAllHref="/dashboard/properties"
          viewAllLabel={t.pages.dashboard.recent.viewAll}
          emptyMessage={t.pages.dashboard.recent.noPropertiesYet}
        />
        <RecentActivityTable
          type="bookings"
          items={recentBookings}
          viewAllHref="/dashboard/bookings"
          viewAllLabel={t.pages.dashboard.recent.viewAll}
          emptyMessage={t.pages.dashboard.recent.noBookingsYet}
        />
      </div>
    </div>
  )
}
