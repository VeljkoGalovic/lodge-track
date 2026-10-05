import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { RegisterFormSingle } from "@/app/register/RegisterFormSingle"
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales"
import { THEMES } from "@/lib/theme"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { useState } from "react"
import { registerUser } from "@/app/actions/auth"
import { useRouter } from "next/navigation"

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

// Test wrapper with LocaleProvider
function renderWithLocale(ui: React.ReactElement, locale: "en" | "sr" = "en") {
  return render(
    <LocaleProvider locale={locale}>
      {ui}
    </LocaleProvider>
  )
}

describe("RegisterFormSingle - Settings Section", () => {
  it("renders the form with all sections", () => {
    renderWithLocale(<RegisterFormSingle />)

    // Check main title (h1)
    expect(screen.getByRole("heading", { name: "Create your account", level: 1 })).toBeInTheDocument()

    // Check Settings section
    expect(screen.getByText("Settings")).toBeInTheDocument()

    // Check Account section (h3)
    expect(screen.getByRole("heading", { name: "Create your account", level: 3 })).toBeInTheDocument()
  })

  describe("Language Selection", () => {
    it("renders language options", () => {
      renderWithLocale(<RegisterFormSingle />)

      // Label uses t.onboarding.step1Title = "Choose your language"
      expect(screen.getByText("Choose your language")).toBeInTheDocument()
      expect(screen.getByText("English")).toBeInTheDocument()
      expect(screen.getByText("Srpski")).toBeInTheDocument()
    })

    it("shows English as selected by default", () => {
      renderWithLocale(<RegisterFormSingle />)

      const englishButton = screen.getByText("English")
      expect(englishButton).toHaveClass("border-blue-500")
      expect(englishButton).toHaveClass("bg-blue-50")
    })

    it("calls onChange when language is selected", () => {
      renderWithLocale(<RegisterFormSingle />)

      fireEvent.click(screen.getByText("Srpski"))

      const srpskiButton = screen.getByText("Srpski")
      expect(srpskiButton).toHaveClass("border-blue-500")
      expect(srpskiButton).toHaveClass("bg-blue-50")
    })

    it("renders in Serbian when locale is sr", () => {
      renderWithLocale(<RegisterFormSingle />, "sr")

      // Serbian label uses t.onboarding.step1Title = "Izaberite svoj jezik"
      expect(screen.getByText("Izaberite svoj jezik")).toBeInTheDocument()
      expect(screen.getByText("Srpski")).toBeInTheDocument()
      expect(screen.getByText("English")).toBeInTheDocument()
    })
  })

  describe("Theme Selection", () => {
    it("renders theme options with icons", () => {
      renderWithLocale(<RegisterFormSingle />)

      // Label uses t.onboarding.step2Title = "Choose your theme"
      expect(screen.getByText("Choose your theme")).toBeInTheDocument()
      expect(screen.getByText("System")).toBeInTheDocument()
      expect(screen.getByText("Light")).toBeInTheDocument()
      expect(screen.getByText("Dark")).toBeInTheDocument()
    })

    it("shows System as selected by default", () => {
      renderWithLocale(<RegisterFormSingle />)

      const systemButton = screen.getByText("System")
      expect(systemButton).toHaveClass("border-blue-500")
      expect(systemButton).toHaveClass("bg-blue-50")
    })

    it("calls onChange when theme is selected", () => {
      renderWithLocale(<RegisterFormSingle />)

      fireEvent.click(screen.getByText("Dark"))

      const darkButton = screen.getByText("Dark")
      expect(darkButton).toHaveClass("border-blue-500")
      expect(darkButton).toHaveClass("bg-blue-50")
    })

    it("renders icons for each theme", () => {
      renderWithLocale(<RegisterFormSingle />)

      // System has monitor icon, Light has sun, Dark has moon
      const svgElements = document.querySelectorAll('svg.lucide')
      expect(svgElements.length).toBe(3)
    })
  })

  describe("Currency Selection", () => {
    it("renders all supported currencies in dropdown", () => {
      renderWithLocale(<RegisterFormSingle />)

      // Label uses t.onboarding.step3Title = "Choose your currency"
      expect(screen.getByText("Choose your currency")).toBeInTheDocument()
      const select = screen.getByRole("combobox")
      expect(select).toHaveValue("USD")
    })

    it("shows all supported currencies", () => {
      renderWithLocale(<RegisterFormSingle />)

      const select = screen.getByRole("combobox")
      expect(select.options.length).toBe(SUPPORTED_CURRENCIES.length)
    })

    it("calls onChange when currency is selected", () => {
      renderWithLocale(<RegisterFormSingle />)

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "EUR" } })
      expect(screen.getByRole("combobox")).toHaveValue("EUR")
    })

    it("shows currency code and label for each option", () => {
      renderWithLocale(<RegisterFormSingle />)

      const select = screen.getByRole("combobox")
      const options = Array.from(select.options)
      expect(options[0].text).toContain("USD")
      expect(options[0].text).toContain("US Dollar")
      expect(options[1].text).toContain("EUR")
      expect(options[1].text).toContain("Euro")
    })
  })
})

describe("RegisterFormSingle - Account Section", () => {
  it("renders all account fields", () => {
    renderWithLocale(<RegisterFormSingle />)

    // Name field (optional) - label is "Full name" (from t.auth.nameLabel)
    expect(screen.getByLabelText(/Full name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute("placeholder", "Full name")

    // Email field (required)
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeRequired()

    // Password field (required)
    expect(screen.getByLabelText(/^Password \*/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password \*/)).toBeRequired()

    // Confirm Password field (required) - lowercase 'p' in 'password' per t.auth.confirmPassword
    expect(screen.getByLabelText(/Confirm password/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirm password/)).toBeRequired()

    // Checkboxes
    expect(screen.getByRole("checkbox", { name: /terms/i })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /over 18/i })).toBeInTheDocument()

    // Submit button
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
  })

  it("shows password strength indicator when typing", async () => {
    renderWithLocale(<RegisterFormSingle />)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    fireEvent.change(passwordInput, { target: { value: "weak" } })

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("Weak"))).toBeInTheDocument()
    })
  })

  it("shows password requirements list", () => {
    renderWithLocale(<RegisterFormSingle />)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    fireEvent.change(passwordInput, { target: { value: "Test" } })

    expect(screen.getByText("At least 8 characters")).toBeInTheDocument()
    expect(screen.getByText("One uppercase letter")).toBeInTheDocument()
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument()
    expect(screen.getByText("One number")).toBeInTheDocument()
    expect(screen.getByText("One special character (!@#$%^&*)")).toBeInTheDocument()
  })

  it("marks requirements as met when satisfied", async () => {
    renderWithLocale(<RegisterFormSingle />)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    fireEvent.change(passwordInput, { target: { value: "Test123!" } })

    await waitFor(() => {
      const checkIcons = document.querySelectorAll('svg.lucide-check')
      expect(checkIcons.length).toBe(5)
    })
  })

  it("shows password match indicator when confirm password matches", async () => {
    renderWithLocale(<RegisterFormSingle />)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    const confirmInput = screen.getByLabelText(/Confirm password/)

    fireEvent.change(passwordInput, { target: { value: "Test123!" } })
    fireEvent.change(confirmInput, { target: { value: "Test123!" } })

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("Passwords match"))).toBeInTheDocument()
    })
  })

  it("shows password mismatch indicator when confirm password differs", async () => {
    renderWithLocale(<RegisterFormSingle />)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    const confirmInput = screen.getByLabelText(/Confirm password/)

    fireEvent.change(passwordInput, { target: { value: "Test123!" } })
    fireEvent.change(confirmInput, { target: { value: "Different456!" } })

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("Passwords do not match"))).toBeInTheDocument()
    })
  })

  it("shows error when server action returns error", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ error: "User already exists" })

    renderWithLocale(<RegisterFormSingle />)

    // Fill form
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

  it("disables submit button when submitting", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    // Use a delayed promise to keep the pending state long enough to test
    let resolveSubmit: (value: { success: string; redirect: string }) => void
    const submitPromise = new Promise<{ success: string; redirect: string }>((resolve) => {
      resolveSubmit = resolve
    })
    mockRegisterUser.mockReturnValue(submitPromise)

    renderWithLocale(<RegisterFormSingle />)

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "Test123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm password/), { target: { value: "Test123!" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /over 18/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    })

    // Button should be disabled while submitting - use waitFor to catch the state change
    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /creating account/i })
      expect(submitButton).toBeDisabled()
    })

    // Resolve the promise to clean up
    resolveSubmit!({ success: "Account created!", redirect: "/signin?verify=pending" })
    await act(async () => {
      await submitPromise
    })
  })

  it("shows Terms of Service and Privacy Policy links", () => {
    renderWithLocale(<RegisterFormSingle />)

    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms")
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy")
  })

  it("renders in Serbian when locale is sr", () => {
    renderWithLocale(<RegisterFormSingle />, "sr")

    // Main title (h1)
    expect(screen.getByRole("heading", { name: "Napravite svoj nalog", level: 1 })).toBeInTheDocument()
    expect(screen.getByText("Podešavanja")).toBeInTheDocument()
    // Theme options in Serbian - use function to match text that might be broken up by icon
    expect(screen.getByText((content) => content.includes("Sistemska"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("Svetla"))).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes("Tamna"))).toBeInTheDocument()
  })
})

describe("RegisterFormSingle - Form Submission", () => {
  it("calls registerUser with all preferences on final submit", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ success: "Account created!", redirect: "/signin?verify=pending" })

    renderWithLocale(<RegisterFormSingle />)

    // Fill settings
    fireEvent.click(screen.getByText("English"))
    fireEvent.click(screen.getByText("Light"))
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "EUR" } })

    // Fill account details - label is "Full name" (from t.auth.nameLabel)
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

  it("shows success message and redirects on successful registration", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ success: "Account created!", redirect: "/signin?verify=pending" })

    renderWithLocale(<RegisterFormSingle />)

    // Fill form
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

  it("shows error if terms not accepted", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ error: "You must accept the Terms of Service and Privacy Policy to register." })

    renderWithLocale(<RegisterFormSingle />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm password/), { target: { value: "SecurePass123!" } })
    // Don't check terms
    fireEvent.click(screen.getByRole("checkbox", { name: /over 18/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    })

    await waitFor(() => {
      expect(screen.getByText("You must accept the Terms of Service and Privacy Policy to register.")).toBeInTheDocument()
    })
  })

  it("shows error if not over 18", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ error: "You must confirm that you are over 18 years old to register." })

    renderWithLocale(<RegisterFormSingle />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm password/), { target: { value: "SecurePass123!" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }))
    // Don't check over 18

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    })

    await waitFor(() => {
      expect(screen.getByText("You must confirm that you are over 18 years old to register.")).toBeInTheDocument()
    })
  })
})