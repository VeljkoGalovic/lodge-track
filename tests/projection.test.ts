import { describe, expect, it } from "vitest"
import { percentChange, projectSeries, type ChartPoint, type ProjectedPoint } from "@/lib/metrics-display"

const point = (month: string, value: number): ChartPoint => ({ month, value })

// Fixed reference date for predictable month names in tests
const TEST_REFERENCE_DATE = new Date("2025-06-15")

function assertProjectedPoints(
  actual: ProjectedPoint[],
  expectedMonths: string[],
  expectedValues: number[]
) {
  expect(actual).toHaveLength(expectedMonths.length)
  for (let i = 0; i < expectedMonths.length; i++) {
    expect(actual[i].month).toBe(expectedMonths[i])
    expect(actual[i].value).toBe(expectedValues[i])
    // Upper/lower bounds should be present and >= 0 for non-expenses
    expect(actual[i].upperBound).toBeDefined()
    expect(actual[i].lowerBound).toBeDefined()
    expect(actual[i].upperBound).toBeGreaterThanOrEqual(actual[i].value)
    expect(actual[i].lowerBound).toBeLessThanOrEqual(actual[i].value)
  }
}

describe("projectSeries (seasonal forecasting)", () => {
  it("returns no projection when the series is too short to read a trend from", () => {
    expect(projectSeries([])).toEqual([])
    expect(projectSeries([point("Jan", 100), point("Feb", 120)])).toEqual([])
  })

  it("projects using seasonal indices scaled to baseline, with damping", () => {
    // Series: Jan=100, Feb=200, Mar=300, Apr=400, May=500, Jun=600
    // Baseline (trimmed mean) = 350
    // Jul index=1.30 -> 455, damped from 600 (15% cap = 90, min=510) -> 510
    // Aug index=1.25 -> 437.5, damped from 510 (15% cap = 76.5, range=[433.5, 586.5]) -> 438
    // Sep index=1.05 -> 367.5, damped from 438 (15% cap = 65.7, range=[372.3, 503.7]) -> 372
    const projection = projectSeries([
      point("Jan", 100),
      point("Feb", 200),
      point("Mar", 300),
      point("Apr", 400),
      point("May", 500),
      point("Jun", 600),
    ], { referenceDate: TEST_REFERENCE_DATE })

    assertProjectedPoints(projection, ["Jul", "Aug", "Sep"], [510, 438, 372])
  })

  it("projects falling series with seasonal indices and damping", () => {
    // Series: Jan=1000, Feb=850, Mar=700, Apr=550, May=400, Jun=250
    // Baseline (trimmed mean) = 625
    // Jul index=1.30 -> 812.5, damped from 250 (15% cap = 37.5, max=287.5) -> 288
    // Aug index=1.25 -> 781.25, damped from 288 (15% cap = 43.2, max=331.2) -> 331
    // Sep index=1.05 -> 656.25, damped from 331 (15% cap = 49.65, max=380.65) -> 381
    const projection = projectSeries([
      point("Jan", 1000),
      point("Feb", 850),
      point("Mar", 700),
      point("Apr", 550),
      point("May", 400),
      point("Jun", 250),
    ], { referenceDate: TEST_REFERENCE_DATE })

    assertProjectedPoints(projection, ["Jul", "Aug", "Sep"], [288, 331, 381])
  })

  it("projects only the requested number of months", () => {
    const projection = projectSeries(
      [point("Jan", 100), point("Feb", 200), point("Mar", 300)],
      { months: 1, referenceDate: TEST_REFERENCE_DATE }
    )
    expect(projection).toHaveLength(1)
    expect(projection[0].month).toBe("Jul") // actual month name from reference date
    expect(typeof projection[0].value).toBe("number")
    expect(projection[0].upperBound).toBeDefined()
    expect(projection[0].lowerBound).toBeDefined()
  })

  it("fits a noisy series using seasonal baseline", () => {
    // Mean ~200, seasonal forecast should follow seasonal pattern
    const projection = projectSeries([
      point("Jan", 150),
      point("Feb", 250),
      point("Mar", 150),
      point("Apr", 250),
    ], { referenceDate: TEST_REFERENCE_DATE })
    const values = projection.map((point) => point.value)
    // All projections should be positive and have bounds
    expect(values.every((v) => v > 0)).toBe(true)
    for (const p of projection) {
      expect(p.upperBound).toBeDefined()
      expect(p.lowerBound).toBeDefined()
    }
  })

  it("projects flat series at seasonal baseline", () => {
    // Flat series at 200: baseline = 200
    // Jul=1.30*200=260, Aug=1.25*200=250, Sep=1.05*200=210
    // Damped from 200 (15% cap = 30)
    // Jul: range=[170, 230], 260->230
    // Aug: from 230, range=[195.5, 264.5], 250 in range
    // Sep: from 250, range=[212.5, 287.5], 210->213 (min)
    const projection = projectSeries([
      point("Jan", 200),
      point("Feb", 200),
      point("Mar", 200),
      point("Apr", 200),
    ], { referenceDate: TEST_REFERENCE_DATE })
    assertProjectedPoints(projection, ["Jul", "Aug", "Sep"], [230, 250, 213])
  })

  it("rounds projections to whole minor units", () => {
    const projection = projectSeries([point("Jan", 1), point("Feb", 2), point("Mar", 2)], { referenceDate: TEST_REFERENCE_DATE })
    expect(projection.every((point) => Number.isInteger(point.value))).toBe(true)
    expect(projection.every((point) => Number.isInteger(point.upperBound!))).toBe(true)
    expect(projection.every((point) => Number.isInteger(point.lowerBound!))).toBe(true)
  })

  it("allows negative projections when allowNegative is true (for expenses)", () => {
    const projection = projectSeries(
      [point("Jan", 100), point("Feb", 80), point("Mar", 60)],
      { allowNegative: true, referenceDate: TEST_REFERENCE_DATE }
    )
    // With negative allowed, values can go below zero
    for (const p of projection) {
      expect(p.lowerBound).toBeLessThanOrEqual(p.value)
      // No clamp at 0
    }
  })

  it("generates correct month names for different locales", () => {
    const projectionEn = projectSeries(
      [point("Jan", 100), point("Feb", 110), point("Mar", 120)],
      { locale: "en", referenceDate: TEST_REFERENCE_DATE }
    )
    const projectionSr = projectSeries(
      [point("Jan", 100), point("Feb", 110), point("Mar", 120)],
      { locale: "sr", referenceDate: TEST_REFERENCE_DATE }
    )
    // Both should have 3 months with actual names
    expect(projectionEn).toHaveLength(3)
    expect(projectionSr).toHaveLength(3)
    // Month names should differ by locale
    expect(projectionEn[0].month).not.toBe(projectionSr[0].month)
  })
})

describe("percentChange (regression)", () => {
  it("returns undefined rather than inventing a change from a zero baseline", () => {
    expect(percentChange(0, 100)).toBeUndefined()
  })
})