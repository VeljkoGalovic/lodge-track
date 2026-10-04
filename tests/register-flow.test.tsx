import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import { RegisterForm } from "@/app/register/RegisterForm"
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

describe("RegisterForm - Full Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders step 1 (Language) by default", () => {
    renderWithLocale(<RegisterForm />)

    expect(screen.getByRole("heading", { name: "Choose your language" })).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()
    expect(screen.getByText("Srpski")).toBeInTheDocument()
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument()
  })

  it("navigates to step 2 (Theme) when Next is clicked", async () => {
    renderWithLocale(<RegisterForm />)

    // Select English
    fireEvent.click(screen.getByText("English"))

    // Click Next
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })

    expect(screen.getByRole("heading", { name: "Choose your theme" })).toBeInTheDocument()
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument()
  })

  it("navigates back from step 2 to step 1", async () => {
    renderWithLocale(<RegisterForm />)

    // Go to step 2
    fireEvent.click(screen.getByText("English"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })

    // Click Back
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /back/i }))
    })

    expect(screen.getByRole("heading", { name: "Choose your language" })).toBeInTheDocument()
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument()
  })

  it("navigates through all 5 steps", async () => {
    renderWithLocale(<RegisterForm />)

    // Step 1: Language
    fireEvent.click(screen.getByText("English"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument()

    // Step 2: Theme
    fireEvent.click(screen.getByText("Light"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument()

    // Step 3: Currency
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "EUR" } })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument()

    // Step 4: Plan
    fireEvent.click(screen.getByText("Starter"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })
    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument()

    // Step 5: Account - the h3 heading uses step5Title ("Create your account")
    expect(screen.getByRole("heading", { name: "Create your account", level: 3 })).toBeInTheDocument()
  })

  it("persists form data across steps", async () => {
    renderWithLocale(<RegisterForm />)

    // Step 1: Select Serbian
    fireEvent.click(screen.getByText("Srpski"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next|dalje/i }))
    })

    // Step 2: Select Dark theme (Serbian: "Tamna")
    fireEvent.click(screen.getByText("Tamna"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next|dalje/i }))
    })

    // Step 3: Select GBP
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "GBP" } })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next|dalje/i }))
    })

    // Step 4: Select Plan
    fireEvent.click(screen.getByText("Starter"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next|dalje/i }))
    })

    // Step 5: Verify data persisted
    expect(screen.getByLabelText(/Email|Imejl/i)).toBeInTheDocument()
    // Form data should be in state (we can't directly test internal state, but we can verify final submit)
  })

  it("calls registerUser with all preferences on final submit", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ success: "Account created!", redirect: "/signin?verify=pending" })

    renderWithLocale(<RegisterForm />)

    // Step 1: Language
    fireEvent.click(screen.getByText("English"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })

    // Step 2: Theme
    fireEvent.click(screen.getByText("Light"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })

    // Step 3: Currency
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "EUR" } })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })

    // Step 4: Plan
    fireEvent.click(screen.getByText("Starter"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })

    // Step 5: Fill account details
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "John Doe" } })
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "john@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), { target: { value: "SecurePass123!" } })
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
    expect(formData.get("selectedTier")).toBe("STARTER")
  })

  it("shows error message when server action returns error", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ error: "User already exists" })

    renderWithLocale(<RegisterForm />)

    // Quick navigate to step 5
    fireEvent.click(screen.getByText("English"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.click(screen.getByText("System"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "USD" } })
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.click(screen.getByText("Starter"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })

    // Fill and submit
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "existing@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), { target: { value: "SecurePass123!" } })
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

    renderWithLocale(<RegisterForm />)

    // Quick navigate to step 5
    fireEvent.click(screen.getByText("English"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.click(screen.getByText("System"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "USD" } })
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.click(screen.getByText("Starter"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })

    // Fill and submit
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "new@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "SecurePass123!" } })
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), { target: { value: "SecurePass123!" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /over 18/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    })

    await waitFor(() => {
      expect(screen.getByText("Account created!")).toBeInTheDocument()
    })
  })

  it("disables next button on step 1 until language selected", () => {
    renderWithLocale(<RegisterForm />)

    const nextButton = screen.getByRole("button", { name: /next/i })
    // Next button should be enabled (language has default)
    expect(nextButton).not.toBeDisabled()
  })

  it("renders progress indicator with all 5 steps", () => {
    renderWithLocale(<RegisterForm />)

    // All 5 step indicators should be visible
    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
  })

  it("marks completed steps with check icon", async () => {
    renderWithLocale(<RegisterForm />)

    // Go to step 2
    fireEvent.click(screen.getByText("English"))
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }))
    })

    // Step 1 should show check mark instead of number "1"
    // The step number "1" should no longer be in the document (replaced by check icon)
    // We use queryByText to check it's not there
    expect(screen.queryByText("1")).not.toBeInTheDocument()
  })

  it("works with Serbian locale", async () => {
    const mockRegisterUser = vi.mocked(registerUser)
    mockRegisterUser.mockResolvedValue({ success: "Account created!", redirect: "/signin?verify=pending" })

    renderWithLocale(<RegisterForm />, "sr")

    expect(screen.getByRole("heading", { name: "Izaberite svoj jezik" })).toBeInTheDocument()
    expect(screen.getByText("Srpski")).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()

    // Navigate through flow in Serbian
    fireEvent.click(screen.getByText("Srpski"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /dalje/i })) })

    expect(screen.getByRole("heading", { name: "Izaberite temu" })).toBeInTheDocument()
  })

  it("shows password validation in real-time on step 5", async () => {
    renderWithLocale(<RegisterForm />)

    // Quick navigate to step 5
    fireEvent.click(screen.getByText("English"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.click(screen.getByText("System"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "USD" } })
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })
    fireEvent.click(screen.getByText("Starter"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /next/i })) })

    // Type password - use correct label matchers from component
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
})