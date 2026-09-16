"use client"

import * as React from "react"
import { Lock, BarChart3, TrendingUp, ArrowUpRight } from "lucide-react"
import { clsx } from "clsx"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"

interface AnalyticsSectionProps {
  hasAccess: boolean
  data?: {
    revenue: Array<{ month: string; value: number }>
    occupancy: Array<{ month: string; value: number }>
  }
}

export function AnalyticsSection({ hasAccess, data }: AnalyticsSectionProps) {
  if (!hasAccess) {
    return (
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
        <div className="relative p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20">
            <Lock className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">Financial Analytics Locked</h3>
          <p className="mb-6 text-muted-foreground max-w-md mx-auto">
            Unlock detailed revenue reports, occupancy trends, and financial forecasting with the Pro plan.
          </p>
          <Button size="lg" asChild>
            <a href="/dashboard/billing">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </a>
          </Button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent pointer-events-none" />
      </Card>
    )
  }

  // Render actual analytics charts when access is granted
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-teal" />
          Financial Analytics
        </CardTitle>
        <CardDescription>Revenue and occupancy overview</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue Chart Placeholder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Monthly Revenue</h4>
              <Badge variant="secondary">MTD</Badge>
            </div>
            <div className="h-48 flex items-end justify-around gap-2 px-2">
              {data?.revenue?.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-brand-teal to-brand-teal/50 rounded-t transition-all duration-500"
                    style={{ height: `${Math.max(20, (item.value / 10000) * 100)}%` }}
                  />
                  <span className="mt-2 text-xs text-muted-foreground">{item.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-green-500">
              <TrendingUp className="h-4 w-4" />
              <span>+12.5% vs last month</span>
            </div>
          </div>

          {/* Occupancy Chart Placeholder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Occupancy Rate</h4>
              <Badge variant="secondary">Current</Badge>
            </div>
            <div className="h-48 flex items-end justify-around gap-2 px-2">
              {data?.occupancy?.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-brand-purple to-brand-purple/50 rounded-t transition-all duration-500"
                    style={{ height: `${item.value}%` }}
                  />
                  <span className="mt-2 text-xs text-muted-foreground">{item.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-green-500">
              <ArrowUpRight className="h-4 w-4" />
              <span>Peak season approaching</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}