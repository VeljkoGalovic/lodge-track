// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom/vitest"
import ApiDashboardClient from "@/app/dashboard/api/ApiDashboardClient"
import { getDictionary } from "@/lib/i18n/dictionaries"

vi.mock("next/navigation", () => ({
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

vi.mock("@/components/i18n/LocaleProvider", () => ({
  useI18n: () => ({ locale: "en", t: getDictionary("en") }),
}))

vi.mock("@/lib/subscriptions", () => ({
  getOrgFeatures: vi.fn((tier: string) => ({
    tier,
    maxProperties: tier === "STARTER" ? 3 : tier === "PRO" ? 15 : Infinity,
    maxUnits: tier === "STARTER" ? 10 : tier === "PRO" ? 30 : Infinity,
    maxStorageBytes: tier === "STARTER" ? 1_000_000_000 : tier === "PRO" ? 5_000_000_000 : Infinity,
    hasAdvancedAnalytics: tier !== "STARTER",
    hasTeamRoles: tier === "ENTERPRISE",
    hasApiAccess: tier === "ENTERPRISE",
  })),
}))

vi.mock("@/app/actions/api-keys", () => ({
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  listApiKeys: vi.fn(),
}))

afterEach(cleanup)

const mockKeys = [
  {
    id: "key-1",
    name: "Production Key",
    keyPrefix: "lt_live_",
    lastUsedAt: new Date("2024-01-15"),
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "key-2",
    name: "Test Key",
    keyPrefix: "lt_test_",
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: new Date("2024-02-01"),
    createdAt: new Date("2024-01-10"),
  },
  {
    id: "key-3",
    name: "Expired Key",
    keyPrefix: "lt_live_",
    lastUsedAt: new Date("2024-01-05"),
    expiresAt: new Date("2024-01-20"),
    revokedAt: null,
    createdAt: new Date("2024-01-02"),
  },
]

describe("ApiDashboardClient - STARTER tier (no API access)", () => {
  it("shows upgrade card with billing link", () => {
    render(<ApiDashboardClient initialKeys={[]} orgTier="STARTER" />)
    // The upgrade title and description both match, so use getAllByText and check the first one (title)
    expect(screen.getAllByText(/upgrade.*plan|api access.*business/i)[0]).toBeInTheDocument()
    // The link text is "Upgrade to Business" not "billing"
    expect(screen.getByRole("link", { name: /upgrade to business/i })).toBeInTheDocument()
    expect(screen.queryByText(/your keys/i)).not.toBeInTheDocument()
  })

  it("does not show key management UI", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="STARTER" />)
    expect(screen.queryByText(/create.*key|create.*api/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/production key/i)).not.toBeInTheDocument()
  })
})

describe("ApiDashboardClient - ENTERPRISE tier (has API access)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("renders header with title and description", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)
    expect(screen.getByText(/api.*developer|api & developer/i)).toBeInTheDocument()
    expect(screen.getByText(/manage.*api.*key|programmatic.*access/i)).toBeInTheDocument()
  })

  it("renders create key button", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)
    expect(screen.getByRole("button", { name: /create.*key|new.*key/i })).toBeInTheDocument()
  })

  it("renders existing keys with correct status badges", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)

    // Active key - find the badge specifically
    expect(screen.getByText("Production Key")).toBeInTheDocument()
    // The "Active" badge text
    const activeBadges = screen.getAllByText(/active/i)
    expect(activeBadges.length).toBeGreaterThanOrEqual(1)

    // Unused key
    expect(screen.getByText("Test Key")).toBeInTheDocument()
    const unusedBadges = screen.getAllByText(/unused/i)
    expect(unusedBadges.length).toBeGreaterThanOrEqual(1)

    // Revoked key - there are two elements with "revoked" text (badge and error description)
    const revokedBadges = screen.getAllByText(/revoked/i)
    expect(revokedBadges.length).toBeGreaterThanOrEqual(1)

    // Expired key
    const expiredBadges = screen.getAllByText(/expired/i)
    expect(expiredBadges.length).toBeGreaterThanOrEqual(1)
  })

  it("shows key prefix with masked suffix", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)
    // Use more specific selector - the prefix appears in a span with font-mono class
    expect(screen.getAllByText(/lt_live_••••••/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/lt_test_••••••/i).length).toBeGreaterThanOrEqual(1)
  })

  it("shows created and last used dates", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)
    // The text "Created" and "Last used" appear in the key details
    expect(screen.getAllByText(/created/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/last used/i).length).toBeGreaterThanOrEqual(1)
  })

  it("opens create key dialog when button clicked", async () => {
    const user = userEvent.setup()
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)

    const createButton = screen.getByRole("button", { name: /create.*key|new.*key/i })
    await user.click(createButton)

    // The dialog should open - find it by any dialog
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(screen.getByLabelText(/key name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/live key|production key/i)).toBeInTheDocument()
  })

  it("shows empty state when no keys exist", () => {
    render(<ApiDashboardClient initialKeys={[]} orgTier="ENTERPRISE" />)
    expect(screen.getByText(/no.*keys/i)).toBeInTheDocument()
    expect(screen.getByText(/create.*first.*key/i)).toBeInTheDocument()
  })

  it("renders three documentation tabs", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)
    expect(screen.getByRole("tab", { name: /authentication/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /endpoints/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /examples/i })).toBeInTheDocument()
  })

  it("shows authentication tab content by default", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)
    // Header format appears as card title - use getByRole for heading
    expect(screen.getByRole("heading", { name: /header format/i })).toBeInTheDocument()
    // Key Format is a heading (h4), not the description text
    expect(screen.getByRole("heading", { name: /key format/i })).toBeInTheDocument()
    expect(screen.getByText(/best practice/i)).toBeInTheDocument()
    // Error codes - the badge elements have the codes
    expect(screen.getByText("401")).toBeInTheDocument()
    expect(screen.getByText("403")).toBeInTheDocument()
    expect(screen.getByText("429")).toBeInTheDocument()
  })

  it("shows endpoints when endpoints tab clicked", async () => {
    const user = userEvent.setup()
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)

    const endpointsTab = screen.getByRole("tab", { name: /endpoints/i })
    await user.click(endpointsTab)

    // Category titles - use role heading to be more specific
    expect(screen.getByRole("heading", { name: /properties/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /bookings/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /units/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /expenses/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /analytics/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /webhooks/i })).toBeInTheDocument()
    // Method badges - there are multiple GET badges, check at least one exists
    expect(screen.getAllByText(/get/i).length).toBeGreaterThan(0)
  })

  it("shows examples when examples tab clicked", async () => {
    const user = userEvent.setup()
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)

    const examplesTab = screen.getByRole("tab", { name: /examples/i })
    await user.click(examplesTab)

    // Card titles - use heading role
    expect(screen.getByRole("heading", { name: /curl/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /javascript/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /openapi/i })).toBeInTheDocument()
    // The URL appears in the code blocks - there are multiple, check at least one
    expect(screen.getAllByText(/api\.lodgetrack\.com/i).length).toBeGreaterThan(0)
  })
})

describe("ApiDashboardClient - key interactions", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("copies key prefix to clipboard when copy button clicked", async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()

    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)

    // Find copy button for first key
    const copyButtons = screen.getAllByRole("button", { name: /copy.*prefix/i })
    await user.click(copyButtons[0])

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("lt_live_••••••")
  })

  it("shows check icon after successful copy", async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()

    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)

    const copyButtons = screen.getAllByRole("button", { name: /copy.*prefix/i })
    await user.click(copyButtons[0])

    // The Check icon from lucide-react renders an SVG with a checkmark path
    // Wait for the Check icon to appear in the button (it replaces the Copy icon)
    await waitFor(() => {
      // Find the button that now contains the Check icon (green SVG)
      const buttons = screen.getAllByRole("button", { name: /copy.*prefix/i })
      // The first button should now have a Check icon (green) instead of Copy icon
      const checkIcon = buttons[0].querySelector('svg[class*="text-green-500"]')
      expect(checkIcon).toBeInTheDocument()
    })
  })

  it("disables actions for revoked keys", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)

    // The revoked key (Test Key) should have disabled buttons
    // Find the revoked key container by looking for the "Test Key" text and its parent
    const revokedKeyContainer = screen.getByText("Test Key").closest('[class*="p-4 border"]')
    const revokeButton = revokedKeyContainer?.querySelector('button[title*="revoke" i]')
    expect(revokeButton).toBeDisabled()
  })

  it("shows loading state during revoke", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)

    // Mock the fetch for revoke - delay to catch loading state
    let resolveFetch: (value: any) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })
    global.fetch = vi.fn().mockReturnValue(fetchPromise)

    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)

    // Click revoke on active key (first revoke button)
    const revokeButtons = screen.getAllByRole("button", { name: /revoke/i })
    await user.click(revokeButtons[0])

    // Should show loading spinner (Loader2 icon) in the button
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()

    // Resolve the fetch to clean up
    resolveFetch!({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
  })
})

describe("ApiDashboardClient - key status logic", () => {
  it("shows expires badge for keys with expiry", () => {
    render(<ApiDashboardClient initialKeys={mockKeys} orgTier="ENTERPRISE" />)
    expect(screen.getByText(/expires/i)).toBeInTheDocument()
  })

  it("shows never for keys without lastUsedAt", () => {
    const keysWithNever = [{
      ...mockKeys[1],
      lastUsedAt: null,
    }]
    render(<ApiDashboardClient initialKeys={keysWithNever} orgTier="ENTERPRISE" />)
    expect(screen.getByText(/never/i)).toBeInTheDocument()
  })
})