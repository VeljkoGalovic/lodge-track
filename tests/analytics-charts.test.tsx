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
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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
    // Month labels are in the bars area (last flex-1 child), not the Y-axis
    const barsArea = region.querySelector(".flex-1")
    const labels = [...barsArea!.querySelectorAll("span")].map((span) => span.textContent)
    expect(labels).toEqual(revenue.map((point) => point.month))

    const bars = [...barsArea!.querySelectorAll<HTMLElement>(".rounded-t")]
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

  it("styles a falling expense series with the success colour, not the danger one", () => {
    render(<AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />)

    // Expenses fell 26000 -> 20800 (-20%) — that is good, so the trend block
    // carries text-success. Revenue/occupancy rises carry it too; the point
    // here is the direction-flip for costs.
    const expenseTrend = screen.getByText("-20% vs last month").closest("div")!
    expect(expenseTrend.className).toContain("text-success")
    expect(expenseTrend.className).not.toContain("text-destructive")

    const revenueTrend = screen.getByText("+16.7% vs last month").closest("div")!
    expect(revenueTrend.className).toContain("text-success")
  })

  it("styles a rising expense series with the danger colour, since higher costs are bad", () => {
    const risingExpenses = expenses.map((point, index) =>
      index === expenses.length - 1 ? { ...point, value: 31_200 } : point
    )
    render(
      <AnalyticsSection
        hasAccess
        currency="USD"
        range="6"
        data={{ revenue, occupancy, expenses: risingExpenses }}
      />
    )

    // 26000 -> 31200: +20%. For expenses that is the bad direction.
    const expenseTrend = screen.getByText("+20% vs last month").closest("div")!
    expect(expenseTrend.className).toContain("text-destructive")
  })

  it("paints expense bars with the amber warning token, distinct from teal revenue", () => {
    render(<AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />)

    const expenseBars = [...chartRegion(t.pages.analytics.expensesTitle).querySelectorAll<HTMLElement>(".rounded-t")]
    expect(expenseBars.length).toBeGreaterThan(0)
    for (const bar of expenseBars) {
      expect(bar.className).toContain("from-warning")
    }

    const revenueBars = [...chartRegion(t.pages.analytics.monthlyRevenue).querySelectorAll<HTMLElement>(".rounded-t")]
    for (const bar of revenueBars) {
      expect(bar.className).toContain("from-primary")
      expect(bar.className).not.toContain("from-warning")
    }
  })

  it("draws grid lines behind the bars for at-a-glance value gauging", () => {
    const { container } = render(
      <AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />
    )

    // The new grid lines are border-t elements on absolute positioned divs
    // inside the bars area, one per chart (3 charts = 3 sets of grid lines)
    // Each chart has 3 interior grid lines (at 25%, 50%, 75%)
    const gridLines = [...container.querySelectorAll('[style*="bottom: 25%"], [style*="bottom: 50%"], [style*="bottom: 75%"]')]
    // 3 charts × 3 interior grid lines = 9
    expect(gridLines.length).toBeGreaterThanOrEqual(3)
  })

  it("pins the exact value under a bar when clicked, and unpins on second click", () => {
    render(<AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />)

    const may = screen.getByRole("button", { name: "May USD 1805.00" })
    expect(screen.queryByRole("status")).not.toBeInTheDocument()

    fireEvent.click(may)
    expect(screen.getByRole("status")).toHaveTextContent("USD 1805.00")

    fireEvent.click(may)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("opens the value tooltip with Enter, keeping bars keyboard-operable", () => {
    const { container } = render(
      <AnalyticsSection hasAccess currency="USD" range="6" data={{ revenue, occupancy, expenses }} />
    )

    const junBar = screen.getByRole("button", { name: "Jun USD 950.00" })
    junBar.focus()
    fireEvent.keyDown(junBar, { key: "Enter" })
    expect(screen.getByRole("status")).toHaveTextContent("USD 950.00")

    fireEvent.keyDown(junBar, { key: " " })
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(container).toBeDefined()
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
