/** Serialized chart data shared by server calculations and client presentation. */
export interface ChartPoint {
  month: string
  /** Minor currency units for revenue series, whole percent for occupancy series. */
  value: number
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
 * Extends a monthly series with three projected points at the mean of the last
 * three recorded values — a simple, honest trend. Months reuse the trailing
 * labels where possible ("Sep"→"Oct") but never invent a month that was not
 * recorded; when the series is too short to read a trend from, no projection
 * is offered at all and the caller shows the static card instead.
 */
export function projectSeries(series: ChartPoint[], months = 3): ChartPoint[] {
  if (series.length < 3) return []

  const window = series.slice(-3)
  const trend = Math.round(window.reduce((sum, point) => sum + point.value, 0) / window.length)

  return Array.from({ length: months }, (_, index) => ({
    month: `+${index + 1}`,
    value: trend,
  }))
}
