import { describe, expect, it } from "vitest"
import { percentChange, projectSeries, type ChartPoint } from "@/lib/metrics-display"

const point = (month: string, value: number): ChartPoint => ({ month, value })

describe("projectSeries", () => {
  it("returns no projection when the series is too short to read a trend from", () => {
    expect(projectSeries([])).toEqual([])
    expect(projectSeries([point("Jan", 100), point("Feb", 120)])).toEqual([])
  })

  it("projects the mean of the last three recorded months", () => {
    const projection = projectSeries([
      point("Jan", 100),
      point("Feb", 200),
      point("Mar", 300),
      point("Apr", 400),
      point("May", 500),
      point("Jun", 600),
    ])

    expect(projection).toEqual([
      { month: "+1", value: 500 },
      { month: "+2", value: 500 },
      { month: "+3", value: 500 },
    ])
  })

  it("projects only the requested number of months", () => {
    const projection = projectSeries([point("Jan", 100), point("Feb", 200), point("Mar", 300)], 1)
    expect(projection).toEqual([{ month: "+1", value: 200 }])
  })

  it("rounds the trend to whole minor units", () => {
    const projection = projectSeries([point("Jan", 1), point("Feb", 2), point("Mar", 2)])
    expect(projection.every((point) => Number.isInteger(point.value))).toBe(true)
  })
})

describe("percentChange (regression)", () => {
  it("returns undefined rather than inventing a change from a zero baseline", () => {
    expect(percentChange(0, 100)).toBeUndefined()
  })
})
