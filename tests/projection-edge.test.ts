import { describe, expect, it } from "vitest"
import { projectSeriesWithMeta, type ChartPoint } from "@/lib/metrics-display"

const point = (month: string, value: number): ChartPoint => ({ month, value })

describe("projection edge cases", () => {
  const REFERENCE_DATE = new Date("2025-06-15")

  it("handles 12-month range with 24-month fullHistory (learned forecasting)", () => {
    // Simulate 12 months of recent data (the range)
    const series = [
      point("Jul", 100), point("Aug", 110), point("Sep", 120),
      point("Oct", 130), point("Nov", 140), point("Dec", 150),
      point("Jan", 160), point("Feb", 170), point("Mar", 180),
      point("Apr", 190), point("May", 200), point("Jun", 210),
    ]

    // Simulate 24 months of full history
    const fullHistory = [
      point("Jul", 50), point("Aug", 60), point("Sep", 70),
      point("Oct", 80), point("Nov", 90), point("Dec", 100),
      point("Jan", 110), point("Feb", 120), point("Mar", 130),
      point("Apr", 140), point("May", 150), point("Jun", 160),
      ...series
    ]

    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "en", 
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    expect(result.metadata.method).toBe("learned")
    expect(result.metadata.historyMonths).toBe(24)
    expect(result.metadata.confidence).toBeGreaterThan(0.5)
    // All projections should be valid numbers
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
      expect(Number.isFinite(p.upperBound)).toBe(true)
      expect(Number.isFinite(p.lowerBound)).toBe(true)
    }
  })

  it("handles 3-month range with 24-month fullHistory", () => {
    const series = [
      point("Apr", 190), point("May", 200), point("Jun", 210),
    ]

    const fullHistory = Array.from({ length: 24 }, (_, i) => 
      point("Jan", 50 + i * 10) // Simplified - just increasing
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "en", 
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    expect(result.metadata.method).toBe("learned")
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
    }
  })

  it("handles empty fullHistory with 12-month range", () => {
    const series = Array.from({ length: 12 }, (_, i) => 
      point("Jan", 100 + i * 10)
    )

    // fullHistory same as series (less than 24)
    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "en", 
      fullHistory: series 
    })

    expect(result.projections).toHaveLength(3)
    expect(result.metadata.method).toBe("seasonal")
    expect(result.metadata.historyMonths).toBe(12)
  })

  it("handles flat series with 24-month fullHistory", () => {
    const series = Array.from({ length: 12 }, () => 
      point("Jan", 100)
    )

    const fullHistory = Array.from({ length: 24 }, () => 
      point("Jan", 100)
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "en", 
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    // Should not produce NaN
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
      expect(p.value).toBeGreaterThanOrEqual(0)
    }
  })

  it("handles expenses (allowNegative) with 24-month fullHistory", () => {
    const series = Array.from({ length: 12 }, (_, i) => 
      point("Jan", 1000 - i * 50)
    )

    const fullHistory = Array.from({ length: 24 }, (_, i) => 
      point("Jan", 2000 - i * 50)
    )

    const result = projectSeriesWithMeta(series, { 
      referenceDate: REFERENCE_DATE, 
      locale: "en", 
      allowNegative: true,
      fullHistory 
    })

    expect(result.projections).toHaveLength(3)
    for (const p of result.projections) {
      expect(Number.isFinite(p.value)).toBe(true)
      expect(Number.isFinite(p.upperBound)).toBe(true)
      expect(Number.isFinite(p.lowerBound)).toBe(true)
    }
  })
})
