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
  monthWindow,
  occupancyAt,
  percentChange,
  shiftMonths,
  statsForWindow,
} from "@/lib/dashboard-metrics"
import { formatAmount, formatCurrency } from "@/lib/currency"
import { Building2, Calendar, DollarSign, Home } from "lucide-react"

export default async function DashboardPage() {
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

  const org = user.organization
  const subscription = org.subscription

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride
  )

  const properties = org.properties
  const bookings = properties.flatMap((property) =>
    property.bookings.map((booking) => ({ ...booking, propertyName: property.name }))
  )

  const now = new Date()

  // Calculate metrics
  const totalProperties = properties.length
  const maxProperties = features.maxProperties
  const isAtPropertyLimit = totalProperties >= maxProperties && maxProperties !== Infinity

  // Bookings and revenue for the current month, against the same counts for the
  // month before so the trends are measured rather than assumed.
  const thisMonth = monthWindow(now)
  const lastMonth = monthWindow(now, -1)

  const monthStats = statsForWindow(properties, thisMonth)
  const previousMonthStats = statsForWindow(properties, lastMonth)

  const occupancyRate = occupancyAt(properties, now)
  const previousOccupancyRate = occupancyAt(properties, shiftMonths(now, -1))

  const bookingsTrend = percentChange(previousMonthStats.bookings, monthStats.bookings)
  const revenueTrend = percentChange(previousMonthStats.revenueCents, monthStats.revenueCents)
  const occupancyTrend = percentChange(previousOccupancyRate, occupancyRate)

  // Say so plainly when some stays have no rate on file, rather than presenting
  // a partial sum as if it were the whole month.
  const revenueSubtitle =
    monthStats.bookings === 0
      ? "No bookings this month"
      : monthStats.pricedBookings === monthStats.bookings
        ? `From ${monthStats.bookings} booking${monthStats.bookings === 1 ? "" : "s"}`
        : `${monthStats.pricedBookings} of ${monthStats.bookings} bookings priced`

  // Recent properties (newest first)
  const recentProperties = [...properties]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((property) => ({
      id: property.id,
      name: property.name,
      bookingCount: property.bookings.length,
      occupied: property.bookings.some(
        (booking) =>
          booking.status !== "CANCELLED" &&
          new Date(booking.startDate) <= now &&
          new Date(booking.endDate) >= now
      ),
    }))

  // Recent bookings (newest first), reporting the status actually stored
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((booking) => ({
      id: booking.id,
      guestName: booking.guestName,
      propertyName: booking.propertyName,
      dates: formatDateRange(booking.startDate, booking.endDate),
      status: booking.status,
      amount: formatAmount(booking.totalAmount, org.currency),
    }))

  const analyticsData = features.hasAdvancedAnalytics
    ? monthlySeries(properties, now, 6)
    : undefined

  const firstName = user.name?.trim().split(/\s+/)[0]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description={`Here's what's happening across ${org.name} today.`}
        action={
          <Button variant="glass" href="/dashboard/properties">
            Manage properties
          </Button>
        }
      />

      <MetricsGrid metrics={[
        {
          title: "Total Properties",
          value: totalProperties,
          subtitle: `${maxProperties === Infinity ? "Unlimited" : `${maxProperties} property limit`}`,
          icon: <Building2 className="h-5 w-5 text-[#36BFAE]" />,
          progress: {
            current: totalProperties,
            max: maxProperties,
            label: "Properties used"
          },
          isAtLimit: isAtPropertyLimit,
          action: isAtPropertyLimit ? { label: "Upgrade Plan", href: "/dashboard/billing" } : undefined,
        },
        {
          title: "Active Bookings",
          value: monthStats.bookings,
          subtitle: "Stays starting this month",
          icon: <Calendar className="h-5 w-5 text-[#BA87FF]" />,
          trend: bookingsTrend === undefined ? undefined : { value: bookingsTrend, label: "vs last month" },
        },
        {
          title: "Total Revenue",
          value: monthStats.pricedBookings > 0 ? formatCurrency(monthStats.revenueCents, org.currency) : "—",
          subtitle: revenueSubtitle,
          icon: <DollarSign className="h-5 w-5 text-[#36BFAE]" />,
          trend: revenueTrend === undefined ? undefined : { value: revenueTrend, label: "vs last month" },
        },
        {
          title: "Occupancy Rate",
          value: `${occupancyRate}%`,
          subtitle: "Properties occupied today",
          icon: <Home className="h-5 w-5 text-[#BA87FF]" />,
          trend: occupancyTrend === undefined ? undefined : { value: occupancyTrend, label: "vs last month" },
        },
      ]} />

      {/* Analytics Section - Feature Gated */}
      <AnalyticsSection
        hasAccess={features.hasAdvancedAnalytics}
        currency={org.currency}
        data={analyticsData}
      />

      {/* Recent Activity Tables */}
      <div className="grid gap-6 xl:grid-cols-2">
        <RecentActivityTable
          type="properties"
          items={recentProperties}
          viewAllHref="/dashboard/properties"
          viewAllLabel="View all"
          emptyMessage="No properties yet. Add your first property to get started."
        />
        <RecentActivityTable
          type="bookings"
          items={recentBookings}
          viewAllHref="/dashboard/bookings"
          viewAllLabel="View all"
          emptyMessage="No bookings yet. Bookings will appear here when guests reserve your properties."
        />
      </div>
    </div>
  )
}
