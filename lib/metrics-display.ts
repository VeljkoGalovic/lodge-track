import type { Locale } from "@/lib/i18n/locales"

/** Serialized chart data shared by server calculations and client presentation. */
export interface ChartPoint {
  month: string
  /** Minor currency units for revenue series, whole percent for occupancy series. */
  value: number
}

/**
 * Extended chart point for projections with optional confidence bounds.
 */
export interface ProjectedPoint extends ChartPoint {
  /** Upper confidence bound (optional). */
  upperBound?: number
  /** Lower confidence bound (optional). */
  lowerBound?: number
}

/**
 * Metadata about the forecasting method used.
 */
export interface ForecastMetadata {
  /** Method used for forecasting. */
  method: "seasonal" | "learned" | "damped-trend"
  /** Number of months of history available. */
  historyMonths: number
  /** Confidence level (0-1). */
  confidence: number
  /** Baseline value used for scaling. */
  baseline: number
}

/**
 * Percentage change between two periods, to one decimal place. Returns
 * `undefined` when there is no baseline to compare against — "+100%" against a
 * previous period of zero would say nothing true.
 */
export function percentChange(previous: number, current: number): number | undefined {
  if (previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/**
 * Options for the projection algorithm.
 */
export interface ProjectionOptions {
  /** Number of months to project forward. Default: 3. */
  months?: number
  /** Trailing window size for trend fitting. Default: 6. */
  windowMonths?: number
  /** Damping factor applied to slope each month (0-1). Default: 0.75. */
  dampingFactor?: number
  /** Maximum month-over-month change as percentage. Default: 15. */
  maxMonthlyChangePct?: number
  /** Whether negative values are allowed (for expenses where reduction is good). Default: false. */
  allowNegative?: boolean
  /** Reference date for generating actual month names. Default: current date. */
  referenceDate?: Date
  /** Locale for month names. Default: "en". */
  locale?: Locale
  /** Full historical series for 24+ month detection. */
  fullHistory?: ChartPoint[]
}

import { forecastSeasonal, type SeasonalForecastOptions, type SeasonalForecastResult } from "./seasonal-forecast"

/**
 * Extends a monthly series with projected points using seasonal forecasting.
 *
 * For series with < 24 months of history: uses industry-standard hospitality
 * seasonal curves (summer peaks, winter dips) scaled to the property's baseline.
 *
 * For series with 24+ months of history: blends seasonal curve with learned
 * historical trend (30% learned, 70% seasonal for conservative estimates).
 *
 * Features:
 * - Seasonal baseline: industry hospitality patterns (Jun-Aug peaks, Jan-Feb dips)
 * - Dynamic scaling: adapts to property's actual historical average
 * - Graceful transition: blends with learned trend at 24+ months
 * - Damping: caps month-over-month changes at maxMonthlyChangePct%
 * - Confidence bounds: wider for seasonal, narrower for learned method
 * - Actual month names: uses real month labels instead of "+1", "+2"
 * - UI transparency: returns metadata indicating method used
 *
 * Design constraints:
 * - Fewer than three recorded values cannot support a trend; returns empty array
 * - Projected values clamp at 0 by default (allowNegative overrides for expenses)
 * - Monthly change capped at maxMonthlyChangePct% of the previous projected value
 */
export function projectSeries(
  series: ChartPoint[],
  options: ProjectionOptions = {}
): ProjectedPoint[] {
  const {
    months = 3,
    maxMonthlyChangePct = 15,
    allowNegative = false,
    referenceDate = new Date(),
    locale = "en",
    fullHistory = series,
  } = options

  const seasonalOptions: SeasonalForecastOptions = {
    months,
    referenceDate,
    locale,
    maxMonthlyChangePct,
    allowNegative,
    fullHistory,
  }

  const result = forecastSeasonal(series, seasonalOptions)
  return result.projections
}

/**
 * Extended projection function that returns both projections and metadata.
 * Use this when you need to display the forecasting method in the UI.
 */
export function projectSeriesWithMeta(
  series: ChartPoint[],
  options: ProjectionOptions = {}
): { projections: ProjectedPoint[]; metadata: ForecastMetadata } {
  const {
    months = 3,
    maxMonthlyChangePct = 15,
    allowNegative = false,
    referenceDate = new Date(),
    locale = "en",
    fullHistory = series,
  } = options

  const seasonalOptions: SeasonalForecastOptions = {
    months,
    referenceDate,
    locale,
    maxMonthlyChangePct,
    allowNegative,
    fullHistory,
  }

  const result = forecastSeasonal(series, seasonalOptions)
  return {
    projections: result.projections,
    metadata: {
      method: result.method,
      historyMonths: result.historyMonths,
      confidence: result.confidence,
      baseline: result.baseline,
    },
  }
}