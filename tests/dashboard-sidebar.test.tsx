// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { getDictionary } from "@/lib/i18n/dictionaries"

const usePathnameMock = vi.hoisted(() => ({ value: "/dashboard" }))

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock.value,
}))
vi.mock("@/components/i18n/LocaleProvider", () => ({
  useI18n: () => ({ locale: "en", t: getDictionary("en") }),
}))

afterEach(cleanup)

const mockFeatures = {
  tier: "STARTER" as const,
  maxProperties: 10,
  maxUnits: 20,
  maxStorageBytes: 1024 * 1024 * 1024, // 1GB
  hasAdvancedAnalytics: false,
  hasTeamRoles: false,
  hasApiAccess: false,
}

const defaultProps = {
  features: mockFeatures,
  orgName: "Test Lodge",
  collapsed: false,
  onToggleCollapse: vi.fn(),
  onCloseMobile: vi.fn(),
}

describe("DashboardSidebar - no usage meter", () => {
  it("does not render UsageMeter or property usage text", () => {
    render(<DashboardSidebar {...defaultProps} />)
    // No property usage text
    expect(screen.queryByText(/properties used/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/unlimited/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/of 10/i)).not.toBeInTheDocument()
    // No progress bar
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    // No upgrade plan button
    expect(screen.queryByText(/upgrade plan/i)).not.toBeInTheDocument()
  })

  it("renders all navigation links", () => {
    render(<DashboardSidebar {...defaultProps} />)
    // Core navigation links
    expect(screen.getByRole("link", { name: /overview/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /properties/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /bookings/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /calendar/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /expenses/i })).toBeInTheDocument()
    // Feature-gated links should still render but be locked
    expect(screen.getByRole("link", { name: /analytics/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /team/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /billing/i })).toBeInTheDocument()
  })

  it("renders org name and tier badge in footer", () => {
    render(<DashboardSidebar {...defaultProps} />)
    expect(screen.getByText("Test Lodge")).toBeInTheDocument()
    expect(screen.getByText("STARTER")).toBeInTheDocument()
  })

  it("highlights active navigation item", () => {
    usePathnameMock.value = "/dashboard/properties"
    render(<DashboardSidebar {...defaultProps} />)
    // The aria-current is on the Link element inside the SidebarMenuButton
    const propertiesLink = screen.getByRole("link", { name: /properties/i })
    expect(propertiesLink).toHaveAttribute("aria-current", "page")
  })

  it("shows lock icon for feature-gated items when feature is disabled", () => {
    render(<DashboardSidebar {...defaultProps} />)
    // Analytics and Team require features that are disabled in mockFeatures
    // They should have the locked styling (opacity-50 cursor-not-allowed)
    const analyticsLink = screen.getByRole("link", { name: /analytics/i })
    const teamLink = screen.getByRole("link", { name: /team/i })
    expect(analyticsLink).toHaveClass("opacity-50")
    expect(analyticsLink).toHaveClass("cursor-not-allowed")
    expect(teamLink).toHaveClass("opacity-50")
    expect(teamLink).toHaveClass("cursor-not-allowed")
  })
})