"use client"

import * as React from "react"
import Link from "next/link"
import { Lock, BarChart3, TrendingUp, ArrowUpRight } from "lucide-react"
import { clsx } from "clsx"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { percentChange, type ChartPoint, type ProjectedPoint, type ForecastMetadata, projectSeries, projectSeriesWithMeta } from "@/lib/metrics-display"
import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider"
import { format } from "@/lib/i18n/dictionaries"
import { LOCALE_TAGS } from "@/lib/i18n/locales"
import { formatCurrency } from "@/lib/currency"
import { monthWindow } from "@/lib/dashboard-metrics"

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
  /** Whether projections are currently shown, to preserve in range links. */
  showForecast?: boolean
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
  showForecast = false,
}: {
  current: RangeKey
  basePath?: string
  showForecast?: boolean
}) {
  const t = useDictionary()
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
          href={`${basePath}?range=${key}${showForecast ? "&forecast=on" : ""}`}
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

/** Bar fill per accent. Warning is the theme's amber token, so it follows dark mode. */
function barFill(accent: "teal" | "purple" | "amber"): string {
  if (accent === "teal") return "bg-gradient-to-t from-primary to-primary/40"
  if (accent === "purple") return "bg-gradient-to-t from-brand-purple to-brand-purple/40"
  return "bg-gradient-to-t from-warning to-warning/30"
}

/** Outlined projection bars draw the accent as a dashed border instead of a fill. */
function projectionBorder(accent: "teal" | "purple" | "amber"): string {
  if (accent === "teal") return "border-primary/70"
  if (accent === "purple") return "border-brand-purple/70"
  return "border-warning/70"
}

/** Chart height constant — used for bars, grid, axis, and empty state. */
const CHART_HEIGHT = 160
/** Responsive chart height: 160px base, 200px on md, 240px on lg. */
const chartHeightClass = `h-[${CHART_HEIGHT}px] md:h-[200px] lg:h-[240px]`

/** Minimum bar width for touch targets (44px for accessibility) */
const MIN_BAR_WIDTH = 44

interface ChartPanelProps {
  title: string
  badge: string
  series: ChartPoint[]
  accent: "teal" | "purple" | "amber"
  /** Fixed ceiling for the bars; omit to scale against the series peak. */
  ceiling?: number
  formatValue: (value: number) => string
  /** Outlined continuation bars — the projection reads as distinct from history. */
  projected?: ProjectedPoint[]
  /**
   * Expense-style series where a decrease is the good outcome: the trend line
   * flips to the success colour on a negative change instead of the danger one.
   */
  goodWhenDown?: boolean
}

function ChartPanel({
  title,
  badge,
  series,
  accent,
  ceiling,
  formatValue,
  projected,
  goodWhenDown = false,
}: ChartPanelProps) {
  const t = useDictionary()
  const { locale } = useLocale()
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

  // Check if we have data to display: either historical data with values,
  // or projected data when showing projected-only view (series is empty)
  const hasHistoricalData = series.length > 0 && series.some((point) => point.value > 0)
  const hasProjectedData = projected && projected.length > 0 && projected.some((point) => point.value > 0)
  const hasData = hasHistoricalData || (series.length === 0 && hasProjectedData)

  const formatFor = (point: ChartPoint) => formatValue(point.value)

  /** The month whose exact value is pinned open; null when nothing is. */
  const [activeMonth, setActiveMonth] = React.useState<string | null>(null)

  /** Direction-aware trend colour: costs falling is a win, revenue falling is not. */
  const trendGood = goodWhenDown ? (change ?? 0) < 0 : (change ?? 0) >= 0

  /** Y-axis steps: 0, 25%, 50%, 75%, 100% of scale (5 labels, 4 intervals). */
  const axisSteps = React.useMemo(() => {
    if (scale <= 0) return [0]
    const steps = 4
    return Array.from({ length: steps + 1 }, (_, i) => (scale * i) / steps)
  }, [scale])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-medium text-foreground">{title}</h4>
        <Badge variant="secondary">{badge}</Badge>
      </div>

      {hasData ? (
        <div className="relative">
          {/* Chart area: Y-axis labels + grid lines on left, bars on right */}
          <div className="flex gap-2" role="img" aria-label={`${title}: ${all.map((point) => `${point.month} ${formatFor(point)}`).join(", ")}`}>
            {/* Y-axis column: labels on far left, grid lines as horizontal rules */}
            <div className="w-12 flex-shrink-0 flex flex-col justify-between" style={{ height: CHART_HEIGHT }} aria-hidden="true">
              {axisSteps.slice().reverse().map((step, index) => (
                <div key={index} className="relative h-1/4 border-t border-border/40">
                  <span className="absolute -right-2 top-0 text-[10px] text-subtle-foreground -translate-y-1/2 text-right w-10 pr-1">
                    {formatFor({ month: "", value: step } as ChartPoint)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bars area */}
            <div className="flex-1 relative" style={{ height: CHART_HEIGHT }}>
              {/* Grid lines matching axis steps */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ height: CHART_HEIGHT }}
              >
                {axisSteps.slice(1, -1).map((step, index) => (
                  <div
                    key={index}
                    className="absolute left-0 right-0 border-t border-border/40"
                    style={{ bottom: `${(step / scale) * 100}%` }}
                  />
                ))}
              </div>

              {/* Bars */}
              <div
                className="relative flex items-end justify-around gap-2 px-2 overflow-x-auto pb-4 scrollbar-hide"
                style={{ height: CHART_HEIGHT }}
                role="region"
                aria-label={t.pages.analytics.chartScrollRegion}
                tabIndex={0}
              >
               {all.map((point, index) => {
                  const isProjected = projected?.includes(point) ?? false
                  const isActive = activeMonth === point.month
                  return (
                    <div key={`${point.month}-${index}`} className="flex flex-1 flex-col items-center self-stretch min-w-[44px]">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          title={`${point.month}: ${formatFor(point)}`}
                          className={clsx(
                            "w-full rounded-t transition-all duration-500",
                            isProjected
                              ? "border-2 border-dashed bg-transparent"
                              : barFill(accent),
                            isProjected ? projectionBorder(accent) : undefined,
                            "cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                          )}
                          style={{
                            height: `${scale > 0 ? Math.max(4, (point.value / scale) * 100) : 0}%`,
                          }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isActive}
                          aria-label={`${point.month} ${formatFor(point)}`}
                          onClick={() => setActiveMonth(isActive ? null : point.month)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              setActiveMonth(isActive ? null : point.month)
                            }
                          }}
                        />
                      </div>
                      <div className="relative">
                        <span className={clsx("mt-2 text-xs", isProjected && "text-subtle-foreground/70")}>
                          {point.month}
                        </span>
                        {isActive ? (
                          <span
                            role="status"
                            className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-0.5 text-xs font-medium text-foreground shadow-sm"
                          >
                            {formatFor(point)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-subtle-foreground ${chartHeightClass}`}>
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
            trendGood ? "text-success" : "text-destructive"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          <span>
            {format(t.pages.analytics.monthlyChange, { change: new Intl.NumberFormat(LOCALE_TAGS[locale], { signDisplay: "exceptZero", maximumFractionDigits: 1 }).format(change) })}
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
  showForecast = false,
  data,
}: AnalyticsSectionProps) {
  const t = useDictionary()
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
        <RangeSelector current={range} basePath={rangeBasePath} showForecast={showForecast} />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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
              accent="amber"
              formatValue={(value) => formatCurrency(value, currency)}
              goodWhenDown
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
  range,
  revenue,
  revenueProjection,
  revenueMetadata,
  occupancy,
  occupancyProjection,
  occupancyMetadata,
  expenses,
  expensesProjection,
  expensesMetadata,
}: {
  showForecast: boolean
  currency: string
  range: RangeKey
  /** Recorded history, drawn solid. */
  revenue: ChartPoint[]
  /** Trend-slope continuation, drawn outlined. */
  revenueProjection?: ProjectedPoint[]
  /** Metadata about the forecasting method used for revenue. */
  revenueMetadata?: ForecastMetadata
  occupancy: ChartPoint[]
  occupancyProjection?: ProjectedPoint[]
  occupancyMetadata?: ForecastMetadata
  expenses: ChartPoint[]
  expensesProjection?: ProjectedPoint[]
  expensesMetadata?: ForecastMetadata
}) {
  const t = useDictionary()

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

  // Determine overall forecast method (use revenue as primary indicator)
  const forecastMethod = revenueMetadata?.method ?? "seasonal"
  const forecastConfidence = revenueMetadata?.confidence ?? 0.4
  const historyMonths = revenueMetadata?.historyMonths ?? 0

  const methodLabel = forecastMethod === "learned"
    ? t.pages.analytics.forecastMethodLearned
    : t.pages.analytics.forecastMethodSeasonal

  const methodDescription = forecastMethod === "learned"
    ? t.pages.analytics.forecastMethodLearnedDesc
    : t.pages.analytics.forecastMethodSeasonalDesc

  // Check if we're in 1-year view with forecast - show historical and projected in separate rows
  const isYearViewWithForecast = range === "12" && showForecast

  return (
    <Card className="border-border/50 bg-muted/30">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-purple" />
            <span>{t.pages.analytics.forecasting}</span>
          </div>
          {/* Forecast method indicator */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {methodLabel}
            </Badge>
            <span className="text-xs text-subtle-foreground hidden sm:inline">
              ({Math.round(forecastConfidence * 100)}% confidence)
            </span>
          </div>
        </div>
        <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>{methodDescription}</span>
          {historyMonths > 0 && (
            <span className="text-xs text-subtle-foreground">
              {t.pages.analytics.forecastBasedOn} {historyMonths} {t.pages.analytics.forecastMonthsOfData}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isYearViewWithForecast ? (
            // Historical data row
            <>
              <div className="space-y-6">
                <ChartPanel
                  title={t.pages.analytics.monthlyRevenue}
                  badge={t.pages.analytics.last12Months}
                  series={revenue}
                  accent="teal"
                  formatValue={(value) => formatCurrency(value, currency)}
                />
                <ChartPanel
                  title={t.pages.analytics.occupancyRate}
                  badge={t.pages.analytics.last12Months}
                  series={occupancy}
                  accent="purple"
                  ceiling={100}
                  formatValue={(value) => `${value}%`}
                />
                {expenses.length > 0 ? (
                  <ChartPanel
                    title={t.pages.analytics.expensesTitle}
                    badge={t.pages.analytics.last12Months}
                    series={expenses}
                    accent="amber"
                    formatValue={(value) => formatCurrency(value, currency)}
                    goodWhenDown
                  />
                ) : null}
              </div>
              {/* Projected data row */}
              <div className="space-y-6 pt-4 border-t border-border/50">
                <ChartPanel
                  title={t.pages.analytics.monthlyRevenue}
                  badge={t.pages.analytics.projectedNext12Months}
                  series={[]}
                  projected={revenueProjection}
                  accent="teal"
                  formatValue={(value) => formatCurrency(value, currency)}
                />
                <ChartPanel
                  title={t.pages.analytics.occupancyRate}
                  badge={t.pages.analytics.projectedNext12Months}
                  series={[]}
                  projected={occupancyProjection}
                  accent="purple"
                  ceiling={100}
                  formatValue={(value) => `${value}%`}
                />
                {expenses.length > 0 && expensesProjection ? (
                  <ChartPanel
                    title={t.pages.analytics.expensesTitle}
                    badge={t.pages.analytics.projectedNext12Months}
                    series={[]}
                    projected={expensesProjection}
                    accent="amber"
                    formatValue={(value) => formatCurrency(value, currency)}
                    goodWhenDown
                  />
                ) : null}
              </div>
            </>
          ) : (
            // Original combined view for 3/6 month ranges
            <div className="space-y-6">
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
              {expenses.length > 0 ? (
                <ChartPanel
                  title={t.pages.analytics.expensesTitle}
                  badge={t.pages.analytics.projected}
                  series={expenses}
                  projected={expensesProjection}
                  accent="amber"
                  formatValue={(value) => formatCurrency(value, currency)}
                  goodWhenDown
                />
              ) : null}
            </div>
          )}
        </div>
        <p className="mt-6 border-t border-border pt-4 text-xs text-subtle-foreground">
          {t.pages.analytics.forecastDisclaimer}
        </p>
      </CardContent>
    </Card>
  )
}
