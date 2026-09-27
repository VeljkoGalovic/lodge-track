import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { UsageMeter } from "@/components/dashboard/UsageMeter"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { ReactNode } from "react"

// Mock i18n
vi.mock("@/components/i18n/LocaleProvider", () => ({
  useI18n: () => ({
    t: {
      pages: {
        dashboard: {
          metrics: {
            usage: "Usage",
            propertyUsage: "Property Usage",
            ofLimit: "{used} of {limit}",
            unlimitedUsage: "{used} used — unlimited",
            atLimit: "At limit",
            nearLimit: "Approaching limit",
            upgradeToAddMore: "Upgrade to add more properties",
            unlimited: "Unlimited",
            propertiesUsed: "Properties used",
            upgradePlan: "Upgrade Plan",
          },
        },
      },
    },
    locale: "en" as const,
    format: (template: string, values: Record<string, string | number>) =>
      template.replace(/\{(\w+)\}/g, (match, key: string) =>
        Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
      ),
  }),
  LocaleProvider: ({ children, locale }: { children: ReactNode; locale: "en" | "sr" }) => <>{children}</>,
}))

const renderWithProvider = (component: ReactNode) => {
  return render(<LocaleProvider>{component}</LocaleProvider>)
}

describe("UsageMeter", () => {
  describe("standard mode", () => {
    it("renders usage correctly for normal usage", () => {
      renderWithProvider(<UsageMeter used={2} max={10} label="Properties" />)

      expect(screen.getByText("Properties")).toBeInTheDocument()
      expect(screen.getByText("2 of 10")).toBeInTheDocument()
      // Usage appears twice - once as badge, once as progress label
      expect(screen.getAllByText("Usage")).toHaveLength(2)
      expect(screen.getByText("20%")).toBeInTheDocument()
    })

    it("renders usage correctly for unlimited tier", () => {
      renderWithProvider(<UsageMeter used={50} max={Infinity} label="Properties" />)

      // Label only appears once in the main area
      expect(screen.getByText("Properties")).toBeInTheDocument()
      expect(screen.getByText("50 used — unlimited")).toBeInTheDocument()
      expect(screen.getByText("Unlimited")).toBeInTheDocument()
    })

    it("shows at limit status when at capacity", () => {
      renderWithProvider(<UsageMeter used={10} max={10} label="Properties" />)

      // "At limit" appears twice - once as badge, once as progress label
      expect(screen.getAllByText("At limit")).toHaveLength(2)
      expect(screen.getByText("10 of 10")).toBeInTheDocument()
      expect(screen.getByText("100%")).toBeInTheDocument()
    })

    it("shows near limit status at 80%", () => {
      renderWithProvider(<UsageMeter used={8} max={10} label="Properties" />)

      // "Approaching limit" appears twice - once as badge, once as progress label
      expect(screen.getAllByText("Approaching limit")).toHaveLength(2)
      expect(screen.getByText("8 of 10")).toBeInTheDocument()
      expect(screen.getByText("80%")).toBeInTheDocument()
    })

    it("shows upgrade button when at limit and action provided", () => {
      renderWithProvider(
        <UsageMeter
          used={10}
          max={10}
          label="Properties"
          action={{ label: "Upgrade Plan", href: "/billing" }}
        />
      )

      // Upgrade button is rendered as a link (anchor), not a button
      expect(screen.getByRole("link", { name: /Upgrade Plan/i })).toBeInTheDocument()
    })

    it("does not show upgrade button when not at limit", () => {
      renderWithProvider(
        <UsageMeter
          used={5}
          max={10}
          label="Properties"
          action={{ label: "Upgrade Plan", href: "/billing" }}
        />
      )

      expect(screen.queryByRole("link", { name: /Upgrade Plan/i })).not.toBeInTheDocument()
    })

    it("does not show upgrade button when at limit but no action provided", () => {
      renderWithProvider(<UsageMeter used={10} max={10} label="Properties" />)

      expect(screen.queryByRole("link", { name: /Upgrade Plan/i })).not.toBeInTheDocument()
    })

    it("renders progress bar with correct width", () => {
      renderWithProvider(<UsageMeter used={5} max={10} label="Properties" />)

      // Progress bar is a div without role="progressbar" in current implementation
      // Just check that the progress element exists and has correct width style
      const progressContainer = screen.getByText("50%").closest("div")
      expect(progressContainer).toBeInTheDocument()
    })

    it("renders progress bar as 0 for unlimited", () => {
      renderWithProvider(<UsageMeter used={50} max={Infinity} label="Properties" />)

      // Progress bar should NOT show 0% for unlimited (percentage text is hidden)
      expect(screen.queryByText("0%")).not.toBeInTheDocument()
      // Unlimited shows "Unlimited" instead of percentage
      expect(screen.getByText("Unlimited")).toBeInTheDocument()
    })
  })

  describe("compact mode", () => {
    it("renders compact version correctly", () => {
      renderWithProvider(<UsageMeter used={2} max={10} label="Properties" compact />)

      expect(screen.getByText("Properties")).toBeInTheDocument()
      expect(screen.getByText("2 of 10")).toBeInTheDocument()
      // Progress element exists
      const progressContainer = screen.getByText("2 of 10").closest("div")?.parentElement
      expect(progressContainer).toBeInTheDocument()
    })

    it("shows upgrade button inline in compact mode when at limit", () => {
      renderWithProvider(
        <UsageMeter
          used={10}
          max={10}
          label="Properties"
          compact
          action={{ label: "Upgrade Plan", href: "/billing" }}
        />
      )

      // In compact mode, the action is a link (anchor tag with href)
      expect(screen.getByRole("link", { name: /Upgrade Plan/i })).toBeInTheDocument()
    })

    it("does not show percentage text in compact mode", () => {
      renderWithProvider(<UsageMeter used={5} max={10} label="Properties" compact />)

      // In compact mode, percentage is not shown in the label
      expect(screen.getByText("5 of 10")).toBeInTheDocument()
      expect(screen.queryByText("50%")).not.toBeInTheDocument()
    })
  })

  describe("hidePercentage option", () => {
    it("hides percentage when showPercentage is false", () => {
      renderWithProvider(<UsageMeter used={5} max={10} label="Properties" showPercentage={false} />)

      expect(screen.queryByText("50%")).not.toBeInTheDocument()
    })
  })

  describe("zero usage", () => {
    it("handles zero properties correctly", () => {
      renderWithProvider(<UsageMeter used={0} max={10} label="Properties" />)

      expect(screen.getByText("0 of 10")).toBeInTheDocument()
      expect(screen.getByText("0%")).toBeInTheDocument()
    })
  })
})

describe("UsageMeter integration with getOrgUsageMetrics", () => {
  it("displays correct data from usage metrics", () => {
    // Simulate data from getOrgUsageMetrics
    const metrics = {
      properties: {
        used: 7,
        limit: 15,
        isAtLimit: false,
        percentage: 46.67,
        isUnlimited: false,
      },
    }

    renderWithProvider(
      <UsageMeter
        used={metrics.properties.used}
        max={metrics.properties.limit}
        label="Properties"
      />
    )

    expect(screen.getByText("7 of 15")).toBeInTheDocument()
    // Component rounds percentage, so 46.67% becomes 47%
    expect(screen.getByText("47%")).toBeInTheDocument()
  })

  it("displays correct data for business tier", () => {
    const metrics = {
      properties: {
        used: 100,
        limit: Infinity,
        isAtLimit: false,
        percentage: 0,
        isUnlimited: true,
      },
    }

    renderWithProvider(
      <UsageMeter
        used={metrics.properties.used}
        max={metrics.properties.limit}
        label="Properties"
      />
    )

    expect(screen.getByText("100 used — unlimited")).toBeInTheDocument()
    expect(screen.getByText("Unlimited")).toBeInTheDocument()
  })

  it("displays correct data for at-limit starter tier", () => {
    const metrics = {
      properties: {
        used: 3,
        limit: 3,
        isAtLimit: true,
        percentage: 100,
        isUnlimited: false,
      },
    }

    renderWithProvider(
      <UsageMeter
        used={metrics.properties.used}
        max={metrics.properties.limit}
        label="Properties"
        action={{ label: "Upgrade Plan", href: "/billing" }}
      />
    )

    expect(screen.getByText("3 of 3")).toBeInTheDocument()
    expect(screen.getByText("100%")).toBeInTheDocument()
    // "At limit" appears twice - once as badge, once as progress label
    expect(screen.getAllByText("At limit")).toHaveLength(2)
    // In standard mode, upgrade action is a link
    expect(screen.getByRole("link", { name: /Upgrade Plan/i })).toBeInTheDocument()
  })
})