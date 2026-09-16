import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { MetricsGrid } from "@/components/dashboard/MetricsCards"
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection"
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable"
import { Building2, Calendar, DollarSign, TrendingUp, Home, Clock, CheckCircle } from "lucide-react"

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
    subscription?.maxPropertiesOverride ?? undefined
  )

  // Calculate metrics
  const totalProperties = org.properties.length
  const maxProperties = features.maxProperties
  const isAtPropertyLimit = totalProperties >= maxProperties && maxProperties !== Infinity

  // Active bookings this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const activeBookings = org.properties.flatMap(p => p.bookings).filter(booking => {
    const bookingStart = new Date(booking.startDate)
    return bookingStart >= startOfMonth && bookingStart <= endOfMonth
  }).length

  // Total revenue MTD (mock calculation - in real app would come from payments)
  const totalRevenue = org.properties.flatMap(p => p.bookings)
    .filter(booking => {
      const bookingStart = new Date(booking.startDate)
      return bookingStart >= startOfMonth && bookingStart <= endOfMonth
    })
    .reduce((sum, booking) => sum + 150, 0) // Mock $150 per booking

  // Occupancy rate (mock)
  const occupancyRate = totalProperties > 0 ? Math.min(95, Math.round((activeBookings / (totalProperties * 30)) * 100)) : 0

  // Recent properties (last 5)
  const recentProperties = org.properties
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(prop => ({
      id: prop.id,
      name: prop.name,
      status: prop.bookings.some(b => new Date(b.startDate) <= now && new Date(b.endDate) >= now) ? "active" : "draft",
    }))

  // Recent bookings (last 5)
  const recentBookings = org.properties
    .flatMap(p => p.bookings.map(b => ({ ...b, propertyName: p.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(booking => ({
      id: booking.id,
      name: booking.guestName,
      propertyName: booking.propertyName,
      date: `${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}`,
      status: new Date(booking.startDate) > now ? "pending" : new Date(booking.endDate) < now ? "checked-out" : "confirmed",
      value: "$" + (Math.random() * 500 + 100).toFixed(0)
    }))

  // Mock analytics data for charts
  const analyticsData = features.hasAdvancedAnalytics ? {
    revenue: [
      { month: "Jan", value: 12000 },
      { month: "Feb", value: 15000 },
      { month: "Mar", value: 13500 },
      { month: "Apr", value: 18000 },
      { month: "May", value: 21000 },
      { month: "Jun", value: 24000 },
    ],
    occupancy: [
      { month: "Jan", value: 65 },
      { month: "Feb", value: 72 },
      { month: "Mar", value: 68 },
      { month: "Apr", value: 78 },
      { month: "May", value: 85 },
      { month: "Jun", value: 82 },
    ],
  } : undefined

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.name || "User"}. Here&apos;s what&apos;s happening with your properties.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <MetricsGrid metrics={[
        {
          title: "Total Properties",
          value: totalProperties,
          subtitle: `${maxProperties === Infinity ? "Unlimited" : `${maxProperties} property limit`}`,
          icon: <Building2 className="h-5 w-5 text-brand-teal" />,
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
          value: activeBookings,
          subtitle: "This month",
          icon: <Calendar className="h-5 w-5 text-brand-purple" />,
          trend: { value: 12, label: "vs last month" },
        },
        {
          title: "Total Revenue",
          value: `$${totalRevenue.toLocaleString()}`,
          subtitle: "Month to date",
          icon: <DollarSign className="h-5 w-5 text-green-500" />,
          trend: { value: 8.5, label: "vs last month" },
        },
        {
          title: "Occupancy Rate",
          value: `${occupancyRate}%`,
          subtitle: "Current average",
          icon: <Home className="h-5 w-5 text-blue-500" />,
          trend: { value: 3.2, label: "vs last month" },
        },
      ]} />

      {/* Analytics Section - Feature Gated */}
      <AnalyticsSection hasAccess={features.hasAdvancedAnalytics} data={analyticsData} />

      {/* Recent Activity Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivityTable
          type="properties"
          items={recentProperties}
          emptyMessage="No properties yet. Add your first property to get started."
        />
        <RecentActivityTable
          type="bookings"
          items={recentBookings}
          emptyMessage="No bookings yet. Bookings will appear here when guests reserve your properties."
        />
      </div>
    </div>
  )
}