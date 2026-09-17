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
