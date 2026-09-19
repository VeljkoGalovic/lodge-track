import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }))
import { expenseSeries, type MetricsExpense } from "@/lib/dashboard-metrics"

/** 15 September 2026, local time — inside the six-month trailing window. */
const NOW = new Date(2026, 8, 15)

const expense = (date: Date, amount: number): MetricsExpense => ({
  date,
  amount,
  currency: null,
})

describe("expenseSeries", () => {
  it("buckets expenses by the expense's own date, not the row's creation date", () => {
    // Two costs incurred in August and July, entered "now" (September).
    // createdAt-based bucketing would put both in September.
    const series = expenseSeries(
      [expense(new Date(2026, 7, 10), 5_000), expense(new Date(2026, 6, 2), 3_000)],
      NOW,
      6
    )

    // Six points, oldest first: Jul, Aug, Sep, Oct, Nov, Dec — wait, the window
    // ends at the reference month, so it is Apr..Sep. Check by label instead.
    const august = series.find((point) => point.month === new Date(2026, 7, 1).toLocaleDateString("en-US", { month: "short" }))
    const july = series.find((point) => point.month === new Date(2026, 6, 1).toLocaleDateString("en-US", { month: "short" }))
    const september = series.find((point) => point.month === new Date(2026, 8, 1).toLocaleDateString("en-US", { month: "short" }))

    expect(august?.value).toBe(5_000)
    expect(july?.value).toBe(3_000)
    expect(september?.value).toBe(0)
  })

  it("sums multiple expenses falling in the same month", () => {
    const series = expenseSeries(
      [expense(new Date(2026, 8, 1), 1_000), expense(new Date(2026, 8, 20), 2_500)],
      NOW,
      3
    )
    const september = series.at(-1)
    expect(september?.value).toBe(3_500)
  })

  it("ignores expenses outside the trailing window", () => {
    const series = expenseSeries([expense(new Date(2025, 0, 1), 9_999)], NOW, 3)
    expect(series.every((point) => point.value === 0)).toBe(true)
  })
})
