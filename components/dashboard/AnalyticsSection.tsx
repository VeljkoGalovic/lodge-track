"use client"

import * as React from "react"
import { Lock, BarChart3, TrendingUp, ArrowUpRight } from "lucide-react"
import { clsx } from "clsx"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { percentChange, type ChartPoint } from "@/lib/dashboard-metrics"
import { formatCurrency } from "@/lib/currency"

interface AnalyticsSectionProps {
  hasAccess: boolean
  /** ISO 4217 code for the organization, so the chart matches every other figure. */
  currency: string
  data?: {
    /** Revenue per month, in cents. */
    revenue: ChartPoint[]
    /** Occupancy per month, as a whole percent. */
    occupancy: ChartPoint[]
  }
}

function ChartPanel({
  title,
  badge,
  series,
  accent,
  /** Fixed ceiling for the bars; omit to scale against the series peak. */
  ceiling,
  formatValue
}: {
  title: string
  badge: string
  series: ChartPoint[]
  accent: "teal" | "purple"
  ceiling?: number
  formatValue: (value: number) => string
}) {
  const latest = series.at(-1)?.value ?? 0
  const previous = series.at(-2)?.value
  const change = previous === undefined ? undefined : percentChange(previous, latest)

  const peak = Math.max(...series.map((point) => point.value), 0)
  const scale = ceiling ?? peak
  const hasData = series.length > 0 && peak > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium text-white">{title}</h4>
        <Badge variant="secondary">{badge}</Badge>
      </div>

      {hasData ? (
        <div
          className="flex h-48 items-end justify-around gap-2 px-2"
          role="img"
          aria-label={`${title}: ${series
            .map((point) => `${point.month} ${formatValue(point.value)}`)
            .join(", ")}`}
        >
          {series.map((point) => (
            <div key={point.month} className="flex flex-1 flex-col items-center">
              <div
                title={`${point.month}: ${formatValue(point.value)}`}
                className={clsx(
                  "w-full rounded-t transition-all duration-500",
                  accent === "teal"
                    ? "bg-gradient-to-t from-[#36BFAE] to-[#36BFAE]/40"
                    : "bg-gradient-to-t from-[#BA87FF] to-[#BA87FF]/40"
                )}
                style={{ height: `${scale > 0 ? Math.max(4, (point.value / scale) * 100) : 0}%` }}
              />
              <span className="mt-2 text-xs text-slate-400">{point.month}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-slate-400">
          No data recorded for this period yet
        </div>
      )}

      {change === undefined ? (
        <p className="text-sm text-slate-400">
          {hasData ? "No prior period to compare against" : "Add bookings with rates to see trends"}
        </p>
      ) : (
        <div
          className={clsx(
            "flex items-center gap-2 text-sm",
            change >= 0 ? "text-[#36BFAE]" : "text-red-400"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          <span>
            {change >= 0 ? "+" : ""}
            {change}% vs last month
          </span>
        </div>
      )}
    </div>
  )
}

export function AnalyticsSection({ hasAccess, currency, data }: AnalyticsSectionProps) {
  if (!hasAccess) {
    return (
      <Card className="relative overflow-hidden">
        {/* Ambient purple wash, matching the landing page's feature cards. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#BA87FF]/15 blur-[100px]"
        />
        <div className="relative p-8 text-center md:p-12">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#BA87FF]/25 bg-[#BA87FF]/10">
            <Lock className="h-8 w-8 text-[#BA87FF]" />
          </div>
          <h3 className="text-xl font-semibold text-white">Financial Analytics Locked</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Unlock detailed revenue reports, occupancy trends, and financial forecasting with the Pro
            plan.
          </p>
          <Button size="lg" href="/dashboard/billing" className="mt-6">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Upgrade to Pro
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#36BFAE]" />
          Financial Analytics
        </CardTitle>
        <CardDescription>Revenue and occupancy, last six months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-2">
          <ChartPanel
            title="Monthly Revenue"
            badge="6 months"
            series={data?.revenue ?? []}
            accent="teal"
            formatValue={(value) => formatCurrency(value, currency)}
          />
          <ChartPanel
            title="Occupancy Rate"
            badge="6 months"
            series={data?.occupancy ?? []}
            accent="purple"
            // Occupancy has a real ceiling, so bars are drawn against 100% rather
            // than stretched to the series peak.
            ceiling={100}
            formatValue={(value) => `${value}%`}
          />
        </div>
      </CardContent>
    </Card>
  )
}
