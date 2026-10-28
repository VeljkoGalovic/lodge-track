/**
 * Seasonal Forecasting Module
 *
 * Implements industry-standard hospitality seasonal curves for forecasting
 * when historical data is insufficient (< 24 months). Transitions to
 * data-driven forecasting once enough history is accumulated.
 */

import type { ChartPoint, ProjectedPoint } from "@/lib/metrics-display"
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/locales"

/**
 * Industry-standard monthly seasonal indices for hospitality.
 * Normalized so annual average = 1.0.
 * Reflects typical patterns: summer peaks (Jun-Aug), winter dips (Jan-Feb).
 */
export const SEASONAL_INDICES: Record<string, number> = {
  Jan: 0.85,
  Feb: 0.82,
  Mar: 0.95,
  Apr: 1.00,
  May: 1.05,
  Jun: 1.20,
  Jul: 1.30,
  Aug: 1.25,
  Sep: 1.05,
  Oct: 0.95,
  Nov: 0.88,
  Dec: 0.90,
}

/** Month order for consistent indexing. */
export const MONTH_ORDER = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

export type MonthName = (typeof MONTH_ORDER)[number]

/**
 * Configuration for seasonal forecasting.
 */
export interface SeasonalForecastOptions {
  /** Number of months to project forward. Default: 3. */
  months?: number
  /** Reference date for generating month names. Default: current date. */
  referenceDate?: Date
  /** Locale for month names. Default: "en". */
  locale?: Locale
  /** Maximum month-over-month change as percentage (damping). Default: 15. */
  maxMonthlyChangePct?: number
  /** Whether negative values are allowed (expenses). Default: false. */
  allowNegative?: boolean
  /** Full historical series (for 24+ month detection). */
  fullHistory?: ChartPoint[]
}

/**
 * Result of seasonal forecasting with metadata.
 */
export interface SeasonalForecastResult {
  /** Projected points with confidence bounds. */
  projections: ProjectedPoint[]
  /** Method used for forecasting. */
  method: "seasonal" | "learned"
  /** Number of months of history available. */
  historyMonths: number
  /** Baseline value used for scaling (average monthly value). */
  baseline: number
  /** Confidence level indicator (0-1). */
  confidence: number
}

/**
 * Compute the baseline (average monthly value) from historical data.
 * Uses a trimmed mean to reduce outlier impact.
 */
function computeBaseline(series: ChartPoint[]): number {
  if (series.length === 0) return 0

  const values = series.map((p) => p.value).sort((a, b) => a - b)
  const trimCount = Math.floor(values.length * 0.1)
  const trimmed = values.slice(trimCount, values.length - trimCount)

  return trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length
}

/**
 * Get the seasonal index for a given month name.
 */
function getSeasonalIndex(month: string): number {
  return SEASONAL_INDICES[month] ?? 1.0
}

/**
 * Get the month index (0-11) for a month name.
 */
function getMonthIndex(month: string): number {
  return MONTH_ORDER.indexOf(month as MonthName)
}

/**
 * Generate the next N month names starting from a reference date.
 */
function generateFutureMonths(
  referenceDate: Date,
  count: number,
  locale: Locale = "en"
): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1 + i, 1)
    return date.toLocaleDateString(LOCALE_TAGS[locale], { month: "short" })
  })
}

/**
 * Apply damping to prevent unrealistic spikes in projections.
 */
function applyDamping(
  projectedValue: number,
  previousValue: number,
  maxMonthlyChangePct: number,
  allowNegative: boolean
): number {
  const maxChange = Math.abs(previousValue) * (maxMonthlyChangePct / 100)
  const minAllowed = previousValue - maxChange
  const maxAllowed = previousValue + maxChange

  let damped = Math.max(minAllowed, Math.min(maxAllowed, projectedValue))

  if (!allowNegative) {
    damped = Math.max(0, damped)
  }

  return Math.round(damped)
}

/**
 * Main seasonal forecasting function.
 *
 * Algorithm:
 * 1. Compute baseline from historical data (trimmed mean)
 * 2. For each projection month, apply the seasonal index for that month
 * 3. Scale by baseline to get the projected value
 * 4. Apply damping to prevent spikes
 * 5. If 24+ months of history, blend with learned trend (weighted average)
 * 6. Return projections with confidence bounds and metadata
 */
export function forecastSeasonal(
  series: ChartPoint[],
  options: SeasonalForecastOptions = {}
): SeasonalForecastResult {
  const {
    months = 3,
    referenceDate = new Date(),
    locale = "en",
    maxMonthlyChangePct = 15,
    allowNegative = false,
    fullHistory = series,
  } = options

  if (series.length < 3) {
    return {
      projections: [],
      method: "seasonal",
      historyMonths: series.length,
      baseline: 0,
      confidence: 0,
    }
  }

  // Check if we have enough history for learned forecasting (24+ months)
  const hasEnoughHistory = fullHistory.length >= 24

  // Compute baseline from recent history (use trailing 12 months or all if less)
  const recentHistory = series.slice(-Math.min(12, series.length))
  const baseline = computeBaseline(recentHistory)

  // If baseline is 0, can't do seasonal forecasting
  if (baseline === 0) {
    return {
      projections: [],
      method: "seasonal",
      historyMonths: series.length,
      baseline: 0,
      confidence: 0,
    }
  }

  // Determine the starting month index for projections from the reference date
  // (not from the series, since series month labels may not match actual calendar)
  // referenceDate.getMonth() returns 0-11 for Jan-Dec, we want the NEXT month
  const startMonthIndex = (referenceDate.getMonth() + 1) % 12

  // Get the last actual value for damping reference
  let lastActualValue = series[series.length - 1].value

  // For learned forecasting, compute trend from full history
  let learnedSlope = 0
  let learnedIntercept = 0

  if (hasEnoughHistory) {
    // Simple linear regression on full history
    const n = fullHistory.length
    const xValues = Array.from({ length: n }, (_, i) => i)
    const yValues = fullHistory.map((p) => p.value)

    const xMean = (n - 1) / 2
    const yMean = yValues.reduce((sum, v) => sum + v, 0) / n

    let sxx = 0
    let sxy = 0
    for (let i = 0; i < n; i++) {
      const x = xValues[i] - xMean
      sxx += x * x
      sxy += x * (yValues[i] - yMean)
    }
    learnedSlope = sxx === 0 ? 0 : sxy / sxx
    learnedIntercept = yMean - learnedSlope * xMean
  }

  // Generate projections
  const projections: ProjectedPoint[] = []
  const futureMonths = generateFutureMonths(referenceDate, months, locale)

  for (let i = 0; i < months; i++) {
    const monthIndex = (startMonthIndex + i) % 12
    const monthName = MONTH_ORDER[monthIndex]
    const seasonalIndex = getSeasonalIndex(monthName)

    // Base seasonal projection
    let projectedValue = baseline * seasonalIndex

    // If we have learned trend, blend it in (weight increases with history)
    if (hasEnoughHistory) {
      const futureX = fullHistory.length + i
      const learnedValue = learnedIntercept + learnedSlope * futureX
      // Weight: 30% learned, 70% seasonal (conservative)
      const learnedWeight = 0.3
      projectedValue = projectedValue * (1 - learnedWeight) + learnedValue * learnedWeight
    }

    // Apply damping relative to last actual/projected value
    projectedValue = applyDamping(
      projectedValue,
      lastActualValue,
      maxMonthlyChangePct,
      allowNegative
    )

    // Confidence bounds: wider for seasonal, narrower for learned
    const baseUncertainty = baseline * 0.15 // 15% base uncertainty
    const historyFactor = hasEnoughHistory ? 0.5 : 1.0
    const timeFactor = 1 + i * 0.1 // Uncertainty grows with horizon
    const boundMargin = baseUncertainty * historyFactor * timeFactor

    projections.push({
      month: futureMonths[i],
      value: projectedValue,
      upperBound: Math.round(projectedValue + boundMargin),
      lowerBound: allowNegative
        ? Math.round(projectedValue - boundMargin)
        : Math.max(0, Math.round(projectedValue - boundMargin)),
    })

    lastActualValue = projectedValue
  }

  // Confidence: higher with more history and learned method
  let confidence = 0.4 // Base confidence for seasonal
  if (hasEnoughHistory) confidence = 0.7
  if (series.length >= 12) confidence += 0.1
  confidence = Math.min(0.9, confidence)

  return {
    projections,
    method: hasEnoughHistory ? "learned" : "seasonal",
    historyMonths: fullHistory.length,
    baseline,
    confidence,
  }
}

/**
 * Convenience function that matches the existing projectSeries signature
 * but uses seasonal forecasting.
 */
export function projectSeriesSeasonal(
  series: ChartPoint[],
  options: SeasonalForecastOptions = {}
): ProjectedPoint[] {
  return forecastSeasonal(series, options).projections
}