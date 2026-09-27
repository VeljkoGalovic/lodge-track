import { describe, expect, it } from "vitest"
import { projectSeriesWithMeta, type ChartPoint } from "@/lib/metrics-display"

const point = (month: string, value: number): ChartPoint => ({ month, value })

describe("projection edge cases - range 12 specific", () => {
  const REFERENCE_DATE = new Date("2025-06-15")

  it("handles 12-month range with 24-month fullHistory and reference date at year boundary", () => {
    // Test with reference date in December
    const decRef = new Date("2025-12-15")
    
    const series = Array.from({ length: 12 }, (_, i) => 
      point("Jan", 100 + i * 10)
    )

    const fullHistory = Array.from({ length: 24 }, (_, i) => 
      point("Jan", 50 + i * 10)
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: decRef, 
      locale: "en", 
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
    }
  })

  it("handles reference date in January (new year boundary)", () => {
    const janRef = new Date("2026-01-15")
    
    const series = Array.from({ length: 12 }, (_, i) => 
      point("Jan", 100 + i * 10)
    )

    const fullHistory = Array.from({ length: 24 }, (_, i) => 
      point("Jan", 50 + i * 10)
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: janRef, 
      locale: "en", 
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
    }
  })

  it("handles Serbian locale with 24-month history", () => {
    const series = Array.from({ length: 12 }, (_, i) => 
      point("Jan", 100 + i * 10)
    )

    const fullHistory = Array.from({ length: 24 }, (_, i) => 
      point("Jan", 50 + i * 10)
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "sr", 
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
    }
  })

  it("handles zero baseline with 24-month history", () => {
    const series = Array.from({ length: 12 }, () => 
      point("Jan", 0)
    )

    const fullHistory = Array.from({ length: 24 }, () => 
      point("Jan", 0)
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "en", 
      fullHistory 
    })

    // Should return empty projections when baseline is 0
    expect(result.projections).toHaveLength(0)
  })

  it("handles very small values with 24-month history", () => {
    const series = Array.from({ length: 12 }, (_, i) => 
      point("Jan", 1 + i)
    )

    const fullHistory = Array.from({ length: 24 }, (_, i) => 
      point("Jan", 1 + i)
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "en", 
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
      expect(p.value).toBeGreaterThanOrEqual(0)
    }
  })

  it("handles occupancy data (values 0-100) with 24-month history", () => {
    const series = Array.from({ length: 12 }, (_, i) => 
      point("Jan", 50 + i * 4)
    )

    const fullHistory = Array.from({ length: 24 }, (_, i) => 
      point("Jan", 30 + i * 3)
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "en", 
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
      expect(p.value).toBeGreaterThanOrEqual(0)
    }
  })
})
