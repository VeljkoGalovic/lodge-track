import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { RegisterFormSingle } from "@/app/register/RegisterFormSingle"
import { registerUser } from "@/app/actions/auth"

// Mock the server action
vi.mock("@/app/actions/auth", () => ({
  registerUser: vi.fn(),
}))

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

function renderWithLocale(ui: React.ReactElement, locale: "en" | "sr" = "en") {
  return render(
    <LocaleProvider locale={locale}>
      {ui}
    </LocaleProvider>
  )
}

describe("RegisterFormSingle - Full Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders single-screen form with all sections", () => {
    renderWithLocale(<RegisterFormSingle />)

    // Main title (h1)
    expect(screen.getByRole("heading", { name: "Create your account", level: 1 })).toBeInTheDocument()
    // Settings section
    expect(screen.getByText("Settings")).toBeInTheDocument()
    // Settings field labels use t.onboarding.step1Title/step2Title/step3Title
    expect(screen.getByText("Choose your language")).toBeInTheDocument()
    expect(screen.getByText("Choose your theme")).toBeInTheDocument()
    expect(screen.getByText("Choose your currency")).toBeInTheDocument()
    // Account section (h3)
    expect(screen.getByRole("heading", { name: "Create your account", level: 3 })).toBeInTheDocument()
  })

  it("allows filling all settings and account fields in one screen", async () => {
    renderWithLocale(<RegisterFormSingle />)

    // Fill Settings
    fireEvent.click(screen.getByText("English"))
    fireEvent.click(screen.getByText("Light"))
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "EUR" } })

    // Fill Account - label is "Full name" (from t.auth.nameLabel)
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "John Doe" } })
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "john@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm password/), { target: { value: "SecurePass123!" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /over 18/i }))

    // All fields should be filled
    expect(screen.getByRole("combobox")).toHaveValue("EUR")
    expect(screen.getByLabelText(/Email/)).toHaveValue("john@example.com")
  })

  it("persists form data when switching between fields", async () => {
    renderWithLocale(<RegisterFormSingle />)

    // Fill Theme first (before changing locale) - use role="radio" since text is broken up by SVG icon
    const darkRadio = screen.getByRole("radio", { name: /Dark/ })
    fireEvent.click(darkRadio)
    expect(darkRadio).toHaveClass("border-blue-500")

    // Fill Account - verify data persisted (do this before changing locale)
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Full name/)).toBeInTheDocument()

    // Fill Language
    fireEvent.click(screen.getByText("Srpski"))
    expect(screen.getByText("Srpski")).toHaveClass("border-blue-500")

    // Fill Currency
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "GBP" } })
    expect(screen.getByRole("combobox")).toHaveValue("GBP")
  })

  it("persists form data when switching between fields in Serbian", async () => {
    renderWithLocale(<RegisterFormSingle />, "sr")

    // Fill Theme first - use role="radio" since text is broken up by SVG icon
    const darkRadio = screen.getByRole("radio", { name: /Tamna/ })
    fireEvent.click(darkRadio)
    expect(darkRadio).toHaveClass("border-blue-500")

    // Fill Account - verify data persisted (Serbian labels)
    expect(screen.getByLabelText(/Imejl/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Ime i prezime/)).toBeInTheDocument()

    // Fill Language (already Srpski by default in Serbian)
    expect(screen.getByText("Srpski")).toHaveClass("border-blue-500")

    // Fill Currency
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "GBP" } })
    expect(screen.getByRole("combobox")).toHaveValue("GBP")
  })

  it("calls registerUser with all preferences on final submit", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ success: "Account created!", redirect: "/signin?verify=pending" })

    renderWithLocale(<RegisterFormSingle />)

    // Fill Settings
    fireEvent.click(screen.getByText("English"))
    fireEvent.click(screen.getByText("Light"))
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "EUR" } })

    // Fill Account - label is "Full name" (from t.auth.nameLabel)
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "John Doe" } })
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "john@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm password/), { target: { value: "SecurePass123!" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /over 18/i }))

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    })

    // Verify server action called with all data
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalled()
    })

    const formData = mockRegisterUser.mock.calls[0][1] as FormData
    expect(formData.get("name")).toBe("John Doe")
    expect(formData.get("email")).toBe("john@example.com")
    expect(formData.get("password")).toBe("SecurePass123!")
    expect(formData.get("confirmPassword")).toBe("SecurePass123!")
    expect(formData.get("termsAccepted")).toBe("on")
    expect(formData.get("isOver18")).toBe("on")
    expect(formData.get("locale")).toBe("en")
    expect(formData.get("theme")).toBe("LIGHT")
    expect(formData.get("currency")).toBe("EUR")
    // No selectedTier - defaults to STARTER server-side
    expect(formData.get("selectedTier")).toBeNull()
  })

  it("shows error message when server action returns error", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ error: "User already exists" })

    renderWithLocale(<RegisterFormSingle />)

    // Fill and submit
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "existing@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm password/), { target: { value: "SecurePass123!" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /over 18/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    })

    await waitFor(() => {
      expect(screen.getByText("User already exists")).toBeInTheDocument()
    })
  })

  it("shows success message and redirects on successful registration", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ success: "Account created!", redirect: "/signin?verify=pending" })

    renderWithLocale(<RegisterFormSingle />)

    // Fill and submit
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "new@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm password/), { target: { value: "SecurePass123!" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /over 18/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    })

    await waitFor(() => {
      expect(screen.getByText("Account created!")).toBeInTheDocument()
    })
  })

  it("shows password validation in real-time", async () => {
    renderWithLocale(<RegisterFormSingle />)

    // Type password
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "weak" } })

    expect(screen.getByText("Weak")).toBeInTheDocument()
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument()

    // Strong password
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "StrongPass123!" } })

    expect(screen.getByText("Very Strong")).toBeInTheDocument()
    // All requirements should be met (green checks)
    const checks = document.querySelectorAll('svg.lucide-check')
    expect(checks.length).toBeGreaterThanOrEqual(5)
  })

  it("works with Serbian locale", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ success: "Account created!", redirect: "/signin?verify=pending" })

    renderWithLocale(<RegisterFormSingle />, "sr")

    // Main title (h1)
    expect(screen.getByRole("heading", { name: "Napravite svoj nalog", level: 1 })).toBeInTheDocument()
    expect(screen.getByText("Podešavanja")).toBeInTheDocument()
    expect(screen.getByText("Izaberite svoj jezik")).toBeInTheDocument()
    expect(screen.getByText("Srpski")).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()

    // Navigate through flow in Serbian
    fireEvent.click(screen.getByText("Srpski"))
    expect(screen.getByText("Srpski")).toHaveClass("border-blue-500")
  })

  it("validates password requirements", async () => {
    renderWithLocale(<RegisterFormSingle />)

    // Test each requirement
    const passwordInput = screen.getByLabelText(/^Password \*/)

    // Length
    fireEvent.change(passwordInput, { target: { value: "Test123!" } })
    await waitFor(() => {
      expect(screen.getByText("At least 8 characters")).toHaveClass("text-green-600")
    })

    // Uppercase
    fireEvent.change(passwordInput, { target: { value: "test123!" } })
    expect(screen.getByText("One uppercase letter")).toHaveClass("text-gray-500")

    fireEvent.change(passwordInput, { target: { value: "Test123!" } })
    expect(screen.getByText("One uppercase letter")).toHaveClass("text-green-600")
  })

  it("does not include tier/plan selection", () => {
    renderWithLocale(<RegisterFormSingle />)

    // Should NOT have tier/plan selection
    expect(screen.queryByText("Starter")).not.toBeInTheDocument()
    expect(screen.queryByText("Professional")).not.toBeInTheDocument()
    expect(screen.queryByText("Business")).not.toBeInTheDocument()
    expect(screen.queryByText("Choose your plan")).not.toBeInTheDocument()
    expect(screen.queryByText("Plan")).not.toBeInTheDocument()
  })

  it("shows sign in link at bottom", () => {
    renderWithLocale(<RegisterFormSingle />)

    expect(screen.getByText("Already have an account?")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/signin")
  })
})