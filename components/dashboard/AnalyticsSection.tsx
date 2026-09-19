"use client"

import * as React from "react"
import Link from "next/link"
import { Lock, BarChart3, TrendingUp, ArrowUpRight } from "lucide-react"
import { clsx } from "clsx"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { percentChange, type ChartPoint } from "@/lib/metrics-display"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { format } from "@/lib/i18n/dictionaries"
import { formatCurrency } from "@/lib/currency"

type RangeKey = "3" | "6" | "12"

interface AnalyticsSectionProps {
  hasAccess: boolean
  /** ISO 4217 code for the organization, so the chart matches every other figure. */
  currency: string
  /** How many months of history the server computed; the overview omits it. */
  range?: RangeKey
  /**
   * Where the range links point. The analytics page is the default; the
   * dashboard overview overrides it so changing the range there updates the
   * overview in place instead of navigating away.
   */
  rangeBasePath?: string
  data?: {
    /** Revenue per month, in cents. */
    revenue: ChartPoint[]
    /** Occupancy per month, as a whole percent. */
    occupancy: ChartPoint[]
    /** Costs per month, in cents, bucketed by the expense's own date. */
    expenses?: ChartPoint[]
  }
}

/** The date-range selector: quiet segmented links, server-driven like the calendar. */
function RangeSelector({
  current,
  basePath = "/dashboard/analytics",
}: {
  current: RangeKey
  basePath?: string
}) {
  const { t } = useI18n()
  const options: Array<{ key: RangeKey; label: string }> = [
    { key: "3", label: t.pages.analytics.range3 },
    { key: "6", label: t.pages.analytics.range6 },
    { key: "12", label: t.pages.analytics.range12 },
  ]

  return (
    <nav aria-label={t.pages.analytics.chartDescription} className="flex items-center gap-1">
      {options.map(({ key, label }) => (
        <Link
          key={key}
          href={`${basePath}?range=${key}`}
          aria-current={key === current ? "true" : undefined}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-sm transition-colors",
            key === current
              ? "bg-primary font-medium text-[#07090E]"
              : "text-subtle-foreground hover:bg-accent hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

function ChartPanel({
  title,
  badge,
  series,
  accent,
  ceiling,
  formatValue,
  /** Outlined continuation bars — the projection reads as distinct from history. */
  projected,
}: {
  title: string
  badge: string
  series: ChartPoint[]
  accent: "teal" | "purple"
  /** Fixed ceiling for the bars; omit to scale against the series peak. */
  ceiling?: number
  formatValue: (value: number) => string
  projected?: ChartPoint[]
}) {
  const { t, locale } = useI18n()
  const all = projected ? [...series, ...projected] : series
  const latest = series.at(-1)?.value ?? 0
  const previous = series.at(-2)?.value
  const change = previous === undefined ? undefined : percentChange(previous, latest)

  /**
   * The scale must not be inflated by the projection alone: a flat low-history
   * series with a high trend mean would otherwise redraw history as tiny bars.
   * The ceiling takes the larger of the two peaks, so history keeps its shape.
   */
  const historyPeak = Math.max(...series.map((point) => point.value), 0)
  const projectionPeak = projected
    ? Math.max(...projected.map((point) => point.value), 0)
    : 0
  const scale = ceiling ?? Math.max(historyPeak, projectionPeak)
  const hasData = series.length > 0 && all.some((point) => point.value > 0)

  const formatFor = (point: ChartPoint) => formatValue(point.value)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium text-foreground">{title}</h4>
        <Badge variant="secondary">{badge}</Badge>
      </div>

      {hasData ? (
        <div
          className="flex h-48 items-end justify-around gap-2 px-2"
          role="img"
          aria-label={`${title}: ${all
            .map((point) => `${point.month} ${formatFor(point)}`)
            .join(", ")}`}
        >
          {all.map((point) => {
            const isProjected = projected?.includes(point) ?? false
            return (
              /**
               * `self-stretch` overrides the row's `items-end` so the column
               * spans the full chart height. Without it the column is
               * content-sized, and the bar's percentage height below has no
               * definite parent to resolve against — every bar collapses to
               * 0px, leaving month labels and the trend line on a blank chart.
               */
              <div key={point.month} className="flex flex-1 flex-col items-center self-stretch">
                {/*
                 * The bar area, not the label-sized column, is what the bar's
                 * `height: N%` measures against. As a growing flex item inside
                 * the stretched column it has a definite height, so the
                 * percentage finally lands.
                 */}
                <div className="flex w-full flex-1 items-end">
                  <div
                    title={`${point.month}: ${formatFor(point)}`}
                    className={clsx(
                      "w-full rounded-t transition-all duration-500",
                      isProjected
                        ? // Outlined, not filled: the projection is a sketch of
                          // the future, drawn in the accent but not committed.
                          "border-2 border-dashed bg-transparent"
                        : accent === "teal"
                          ? "bg-gradient-to-t from-primary to-primary/40"
                          : "bg-gradient-to-t from-brand-purple to-brand-purple/40",
                      isProjected && accent === "teal" ? "border-primary/70" : undefined,
                      isProjected && accent === "purple" ? "border-brand-purple/70" : undefined
                    )}
                    style={{ height: `${scale > 0 ? Math.max(4, (point.value / scale) * 100) : 0}%` }}
                  />
                </div>
                <span className={clsx("mt-2 text-xs", isProjected && "text-subtle-foreground/70")}>
                  {point.month}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-subtle-foreground">
          {t.pages.analytics.noData}
        </div>
      )}

      {change === undefined ? (
        <p className="text-sm text-subtle-foreground">
          {hasData ? t.pages.analytics.noPrior : t.pages.analytics.addBookings}
        </p>
      ) : (
        <div
          className={clsx(
            "flex items-center gap-2 text-sm",
            change >= 0 ? "text-primary" : "text-destructive"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          <span>
            {format(t.pages.analytics.monthlyChange, { change: new Intl.NumberFormat(locale === "sr" ? "sr-Latn-RS" : "en-US", { signDisplay: "exceptZero", maximumFractionDigits: 1 }).format(change) })}
          </span>
        </div>
      )}
    </div>
  )
}

export function AnalyticsSection({
  hasAccess,
  currency,
  range = "6",
  rangeBasePath,
  data,
}: AnalyticsSectionProps) {
  const { t } = useI18n()
  if (!hasAccess) {
    return (
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
          <p className="mx-auto mt-2 max-w-md text-sm text-subtle-foreground">
            {t.pages.analytics.unlock}
          </p>
          <Button size="lg" href="/dashboard/billing" className="mt-6">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            {t.pages.analytics.upgrade}
          </Button>
        </div>
      </Card>
    )
  }

  const rangeLabel =
    range === "3"
      ? t.pages.analytics.range3
      : range === "12"
        ? t.pages.analytics.range12
        : t.pages.analytics.range6

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t.pages.analytics.title}
          </CardTitle>
          <CardDescription>{t.pages.analytics.chartDescription}</CardDescription>
        </div>
        <RangeSelector current={range} basePath={rangeBasePath} />
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-2">
          <ChartPanel
            title={t.pages.analytics.monthlyRevenue}
            badge={rangeLabel}
            series={data?.revenue ?? []}
            accent="teal"
            formatValue={(value) => formatCurrency(value, currency)}
          />
          <ChartPanel
            title={t.pages.analytics.occupancyRate}
            badge={rangeLabel}
            series={data?.occupancy ?? []}
            accent="purple"
            // Occupancy has a real ceiling, so bars are drawn against 100% rather
            // than stretched to the series peak.
            ceiling={100}
            formatValue={(value) => `${value}%`}
          />
          {data?.expenses ? (
            <ChartPanel
              title={t.pages.analytics.expensesTitle}
              badge={rangeLabel}
              series={data.expenses}
              accent="teal"
              formatValue={(value) => formatCurrency(value, currency)}
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * The forecasting card sits beneath the charts. When hidden it explains what
 * will appear; when shown it renders the projection beside the disclaimer —
 * which is permanent, in both states, because the caution belongs to the
 * feature, not to one view of it.
 */
export function ForecastCard({
  showForecast,
  currency,
  revenue,
  revenueProjection,
  occupancy,
  occupancyProjection,
}: {
  showForecast: boolean
  currency: string
  /** Recorded history, drawn solid. */
  revenue: ChartPoint[]
  /** Mean-trend continuation, drawn outlined. */
  revenueProjection?: ChartPoint[]
  occupancy: ChartPoint[]
  occupancyProjection?: ChartPoint[]
}) {
  const { t } = useI18n()

  if (!showForecast) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-purple" />
            {t.pages.analytics.forecasting}
          </CardTitle>
          <CardDescription>{t.pages.analytics.forecastingPreview}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-subtle-foreground">{t.pages.analytics.forecastDisclaimer}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand-purple" />
          {t.pages.analytics.forecasting}
        </CardTitle>
        <CardDescription>{t.pages.analytics.forecastingHelp}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-2">
          <ChartPanel
            title={t.pages.analytics.monthlyRevenue}
            badge={t.pages.analytics.projected}
            series={revenue}
            projected={revenueProjection}
            accent="teal"
            formatValue={(value) => formatCurrency(value, currency)}
          />
          <ChartPanel
            title={t.pages.analytics.occupancyRate}
            badge={t.pages.analytics.projected}
            series={occupancy}
            projected={occupancyProjection}
            accent="purple"
            ceiling={100}
            formatValue={(value) => `${value}%`}
          />
        </div>
        <p className="mt-6 border-t border-border pt-4 text-xs text-subtle-foreground">
          {t.pages.analytics.forecastDisclaimer}
        </p>
      </CardContent>
    </Card>
  )
}
