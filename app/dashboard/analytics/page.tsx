import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Lock, BarChart3, TrendingUp, DollarSign, Home, ArrowUpRight } from "lucide-react"
import Link from "next/link"

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

  if (!features.hasAdvancedAnalytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Analytics</h1>
          <p className="text-muted-foreground mt-1">Detailed revenue reports and occupancy trends</p>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
          <div className="relative p-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20">
              <Lock className="h-10 w-10 text-purple-400" />
            </div>
            <h3 className="mb-2 text-2xl font-semibold">Financial Analytics Locked</h3>
            <p className="mb-8 text-muted-foreground max-w-2xl mx-auto">
              Unlock detailed revenue reports, occupancy trends, financial forecasting, and advanced analytics with the Pro plan.
            </p>
            <Button size="lg" asChild href="/dashboard/billing">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Upgrade to Pro
            </Button>
          </div>
        </Card>

        {/* Feature preview cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue Reports
              </CardTitle>
              <CardDescription>Monthly, quarterly, and yearly revenue breakdowns</CardDescription>
            </CardHeader>
          </Card>
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Occupancy Trends
              </CardTitle>
              <CardDescription>Historical occupancy rates and seasonal patterns</CardDescription>
            </CardHeader>
          </Card>
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Forecasting
              </CardTitle>
              <CardDescription>AI-powered revenue and occupancy predictions</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  // If they have access, show the actual analytics
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Analytics</h1>
        <p className="text-muted-foreground mt-1">Detailed revenue reports and occupancy trends</p>
      </div>

      {/* Analytics content would go here */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-teal" />
            Analytics Dashboard
          </CardTitle>
          <CardDescription>Your advanced analytics will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">Full analytics dashboard coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}