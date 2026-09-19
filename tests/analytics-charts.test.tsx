// @vitest-environment jsdom
/**
 * Regression tests for the financial analytics chart rendering.
 *
 * The charts went blank while their trend lines ("-20% vs last month") kept
 * rendering: the bar's `height: N%` resolved against a content-sized flex
 * column, so every bar collapsed to 0px even though the series arrived intact
 * from the server. These tests pin the two halves of that contract:
 *
 *   1. With backend data present, bars are rendered with a non-zero scaled
 *      height style — not the empty placeholder.
 *   2. Each month label appears, and the bar's height style matches its own
 *      value, so series values cannot silently decouple from what is drawn.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection"
import { getDictionary } from "@/lib/i18n/dictionaries"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/analytics",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/components/i18n/LocaleProvider", () => ({
  useI18n: () => ({ locale: "en", t: getDictionary("en") }),
}))

vi.mock("@/lib/currency", () => ({
  formatCurrency: (minor: number, currency: string) => `${currency} ${(minor / 100).toFixed(2)}`,
}))

afterEach(cleanup)

const t = getDictionary("en")

/** Six trailing months, Apr..Sep, matching the analytics page's default window. */
const revenue = [
  { month: "Apr", value: 120_000 },
  { month: "May", value: 180_500 },
  { month: "Jun", value: 95_000 },
  { month: "Jul", value: 210_000 },
  { month: "Aug", value: 150_000 },
  { month: "Sep", value: 175_000 },
]
const occupancy = [
  { month: "Apr", value: 60 },
  { month: "May", value: 75 },
  { month: "Jun", value: 40 },
  { month: "Jul", value: 90 },
  { month: "Aug", value: 55 },
  { month: "Sep", value: 65 },
]
const expenses = [
  { month: "Apr", value: 30_000 },
  { month: "May", value: 25_000 },
  { month: "Jun", value: 28_000 },
  { month: "Jul", value: 22_000 },
  { month: "Aug", value: 26_000 },
  { month: "Sep", value: 20_800 },
]

function chartRegion(title: string): HTMLElement {
  // The chart body is the labelled region that carries the month labels.
  return screen.getByRole("img", { name: new RegExp(`${title}:`) })
}

describe("AnalyticsSection chart rendering with backend data", () => {
  it("renders bars instead of the empty placeholder when the series has values", () => {
    render(<AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />)

    for (const title of [t.pages.analytics.monthlyRevenue, t.pages.analytics.occupancyRate, t.pages.analytics.expensesTitle]) {
      expect(chartRegion(title)).toBeInTheDocument()
      // The old bug: `hasData` false-pathed into the dashed placeholder even
      // though the server had computed real values for every month.
      expect(screen.queryByText(t.pages.analytics.noData)).not.toBeInTheDocument()
    }
  })

  it("draws one bar per month with a height scaled to that month's value", () => {
    render(<AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />)

    const region = chartRegion(t.pages.analytics.monthlyRevenue)
    const labels = [...region.querySelectorAll("span")].map((span) => span.textContent)
    expect(labels).toEqual(revenue.map((point) => point.month))

    const bars = [...region.querySelectorAll<HTMLElement>(".rounded-t")]
    expect(bars).toHaveLength(revenue.length)

    const peak = Math.max(...revenue.map((point) => point.value))
    for (const [index, bar] of bars.entries()) {
      expect(bar.style.height).toBe(`${Math.max(4, (revenue[index].value / peak) * 100)}%`)
    }
  })

  it("scales occupancy against the fixed 100% ceiling, not the series peak", () => {
    render(<AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />)

    const bars = [...chartRegion(t.pages.analytics.occupancyRate).querySelectorAll<HTMLElement>(".rounded-t")]
    for (const [index, bar] of bars.entries()) {
      // Compare with a tolerance: value/ceiling*100 goes through floating point,
      // so 55% arrives as 55.00000000000001%.
      expect(parseFloat(bar.style.height)).toBeCloseTo(Math.max(4, occupancy[index].value), 6)
    }
  })

  it("keeps the percent-change trend line reading from the recorded series", () => {
    render(<AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />)

    // Revenue went 150000 -> 175000: +16.7%.
    expect(screen.getByText("+16.7% vs last month")).toBeInTheDocument()
    // Occupancy went 55 -> 65: percentChange rounds (10/55)*100 to 18.2.
    expect(screen.getByText("+18.2% vs last month")).toBeInTheDocument()
    // Expenses went 26000 -> 20800: -20%.
    expect(screen.getByText("-20% vs last month")).toBeInTheDocument()
  })

  it("still shows the empty placeholder when there is genuinely nothing to draw", () => {
    render(
      <AnalyticsSection
        hasAccess
        currency="USD"
        range="6"
        data={{ revenue: [], occupancy: [], expenses: [] }}
      />
    )

    expect(screen.getAllByText(t.pages.analytics.noData)).toHaveLength(3)
  })
})
