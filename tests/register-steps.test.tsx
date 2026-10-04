import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import { LocaleProvider } from "@/components/i18n/LocaleProvider"
import LanguageStep from "@/app/register/steps/LanguageStep"
import ThemeStep from "@/app/register/steps/ThemeStep"
import CurrencyStep from "@/app/register/steps/CurrencyStep"
import AccountStep from "@/app/register/steps/AccountStep"
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales"
import { THEMES } from "@/lib/theme"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { useState } from "react"

// Test wrapper with LocaleProvider
function renderWithLocale(ui: React.ReactElement, locale: "en" | "sr" = "en") {
  return render(
    <LocaleProvider locale={locale}>
      {ui}
    </LocaleProvider>
  )
}

// Stateful wrapper component for AccountStep that manages form state
// This mimics how RegisterForm manages form state
interface AccountStepTestWrapperProps {
  onNameChange?: (name: string) => void
  onEmailChange?: (email: string) => void
  onPasswordChange?: (password: string) => void
  onConfirmPasswordChange?: (confirmPassword: string) => void
  onTermsChange?: (accepted: boolean) => void
  onOver18Change?: (accepted: boolean) => void
  onSubmit?: (e: React.FormEvent) => void
  isSubmitting?: boolean
  error?: string
  initialValues?: {
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
    termsAccepted?: boolean
    isOver18?: boolean
  }
}

function AccountStepTestWrapper({
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onTermsChange,
  onOver18Change,
  onSubmit,
  isSubmitting = false,
  error,
  initialValues = {},
}: AccountStepTestWrapperProps) {
  const [name, setName] = useState(initialValues.name ?? "")
  const [email, setEmail] = useState(initialValues.email ?? "")
  const [password, setPassword] = useState(initialValues.password ?? "")
  const [confirmPassword, setConfirmPassword] = useState(initialValues.confirmPassword ?? "")
  const [termsAccepted, setTermsAccepted] = useState(initialValues.termsAccepted ?? false)
  const [isOver18, setIsOver18] = useState(initialValues.isOver18 ?? false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit?.(e)
  }

  const handleNameChange = (value: string) => {
    setName(value)
    onNameChange?.(value)
  }
  const handleEmailChange = (value: string) => {
    setEmail(value)
    onEmailChange?.(value)
  }
  const handlePasswordChange = (value: string) => {
    setPassword(value)
    onPasswordChange?.(value)
  }
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value)
    onConfirmPasswordChange?.(value)
  }
  const handleTermsChange = (value: boolean) => {
    setTermsAccepted(value)
    onTermsChange?.(value)
  }
  const handleOver18Change = (value: boolean) => {
    setIsOver18(value)
    onOver18Change?.(value)
  }

  return (
    <AccountStep
      name={name}
      onNameChange={handleNameChange}
      email={email}
      onEmailChange={handleEmailChange}
      password={password}
      onPasswordChange={handlePasswordChange}
      confirmPassword={confirmPassword}
      onConfirmPasswordChange={handleConfirmPasswordChange}
      termsAccepted={termsAccepted}
      onTermsChange={handleTermsChange}
      isOver18={isOver18}
      onOver18Change={handleOver18Change}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
    />
  )
}

function renderAccountStep(props: AccountStepTestWrapperProps = {}) {
  return renderWithLocale(<AccountStepTestWrapper {...props} />)
}

describe("LanguageStep", () => {
  it("renders language options", () => {
    renderWithLocale(<LanguageStep locale="en" onChange={vi.fn()} />)

    expect(screen.getByText("Choose your language")).toBeInTheDocument()
    expect(screen.getByText("English")).toBeInTheDocument()
    expect(screen.getByText("Srpski")).toBeInTheDocument()
  })

  it("shows selected language as active", () => {
    renderWithLocale(<LanguageStep locale="en" onChange={vi.fn()} />)

    const englishButton = screen.getByText("English")
    // Active state uses border-blue-500 and bg-blue-50
    expect(englishButton).toHaveClass("border-blue-500")
    expect(englishButton).toHaveClass("bg-blue-50")
  })

  it("calls onChange when language is selected", () => {
    const onChange = vi.fn()
    renderWithLocale(<LanguageStep locale="en" onChange={onChange} />)

    fireEvent.click(screen.getByText("Srpski"))
    expect(onChange).toHaveBeenCalledWith("sr")
  })

  it("renders in Serbian when locale is sr", () => {
    renderWithLocale(<LanguageStep locale="sr" onChange={vi.fn()} />, "sr")

    expect(screen.getByText("Izaberite svoj jezik")).toBeInTheDocument()
  })
})

describe("ThemeStep", () => {
  it("renders theme options", () => {
    renderWithLocale(<ThemeStep theme="SYSTEM" onChange={vi.fn()} />)

    expect(screen.getByText("Choose your theme")).toBeInTheDocument()
    expect(screen.getByText("System")).toBeInTheDocument()
    expect(screen.getByText("Light")).toBeInTheDocument()
    expect(screen.getByText("Dark")).toBeInTheDocument()
  })

  it("shows selected theme as active", () => {
    renderWithLocale(<ThemeStep theme="LIGHT" onChange={vi.fn()} />)

    const lightButton = screen.getByText("Light")
    // Active state uses border-blue-500 and bg-blue-50
    expect(lightButton).toHaveClass("border-blue-500")
    expect(lightButton).toHaveClass("bg-blue-50")
  })

  it("calls onChange when theme is selected", () => {
    const onChange = vi.fn()
    renderWithLocale(<ThemeStep theme="SYSTEM" onChange={onChange} />)

    fireEvent.click(screen.getByText("Dark"))
    expect(onChange).toHaveBeenCalledWith("DARK")
  })

  it("renders icons for each theme", () => {
    renderWithLocale(<ThemeStep theme="SYSTEM" onChange={vi.fn()} />)

    // System has monitor icon, Light has sun, Dark has moon
    // Icons are inline SVGs with lucide class
    const svgElements = document.querySelectorAll('svg.lucide')
    expect(svgElements.length).toBe(3) // 3 theme options each with an icon
  })
})

describe("CurrencyStep", () => {
  it("renders all supported currencies in dropdown", () => {
    renderWithLocale(<CurrencyStep currency="USD" onChange={vi.fn()} />)

    // The h3 heading has the text "Choose your currency"
    expect(screen.getByRole("heading", { name: "Choose your currency" })).toBeInTheDocument()
    // The select shows the selected option
    const select = screen.getByRole("combobox")
    expect(select).toHaveValue("USD")
  })

  it("shows all 17 supported currencies", () => {
    renderWithLocale(<CurrencyStep currency="USD" onChange={vi.fn()} />)

    const select = screen.getByRole("combobox")
    expect(select.options.length).toBe(SUPPORTED_CURRENCIES.length)
  })

  it("calls onChange when currency is selected", () => {
    const onChange = vi.fn()
    renderWithLocale(<CurrencyStep currency="USD" onChange={onChange} />)

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "EUR" } })
    expect(onChange).toHaveBeenCalledWith("EUR")
  })

  it("shows currency code and label for each option", () => {
    renderWithLocale(<CurrencyStep currency="USD" onChange={vi.fn()} />)

    const select = screen.getByRole("combobox")
    const options = Array.from(select.options)
    expect(options[0].text).toContain("USD")
    expect(options[0].text).toContain("US Dollar")
    expect(options[1].text).toContain("EUR")
    expect(options[1].text).toContain("Euro")
  })
})

describe("AccountStep", () => {
  const defaultHandlers = {
    onNameChange: vi.fn(),
    onEmailChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onConfirmPasswordChange: vi.fn(),
    onTermsChange: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
  }

  it("renders all account fields", () => {
    renderAccountStep(defaultHandlers)

    // Component uses step5Title for the heading (step 5 is "Create your account")
    expect(screen.getByText("Create your account")).toBeInTheDocument()
    // Label says "Full name" not "Name"
    expect(screen.getByLabelText(/Full name/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    // Password label includes asterisk "Password *"
    expect(screen.getByLabelText(/^Password \*/)).toBeInTheDocument()
    // Component uses "Confirm New Password" label with asterisk
    expect(screen.getByLabelText(/Confirm New Password/)).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /terms/i })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /over 18/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument()
  })

  it("shows password strength indicator when typing", async () => {
    renderAccountStep(defaultHandlers)

    // Use getByLabelText with exact match for "Password *"
    const passwordInput = screen.getByLabelText(/^Password \*/)
    // "weak" has only lowercase, length < 8, so strength = 1 → "Weak"
    fireEvent.change(passwordInput, { target: { value: "weak" } })

    // Text might be split across elements, use flexible matcher with waitFor
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("Weak"))).toBeInTheDocument()
    })
  })

  it("shows password requirements list", () => {
    renderAccountStep(defaultHandlers)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    fireEvent.change(passwordInput, { target: { value: "Test" } })

    expect(screen.getByText("At least 8 characters")).toBeInTheDocument()
    expect(screen.getByText("One uppercase letter")).toBeInTheDocument()
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument()
    expect(screen.getByText("One number")).toBeInTheDocument()
    expect(screen.getByText("One special character (!@#$%^&*)")).toBeInTheDocument()
  })

  it("marks requirements as met when satisfied", async () => {
    renderAccountStep(defaultHandlers)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    fireEvent.change(passwordInput, { target: { value: "Test123!" } })

    // All requirements should show green check marks - Check icons are SVG elements
    // The Check component from lucide-react renders SVG with class "lucide lucide-check"
    await waitFor(() => {
      const checkIcons = document.querySelectorAll('svg.lucide-check')
      expect(checkIcons.length).toBe(5)
    })
  })

  it("shows password match indicator when confirm password matches", async () => {
    renderAccountStep(defaultHandlers)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    const confirmInput = screen.getByLabelText(/Confirm New Password/)

    fireEvent.change(passwordInput, { target: { value: "Test123!" } })
    fireEvent.change(confirmInput, { target: { value: "Test123!" } })

    // Text might be split across elements, use flexible matcher with waitFor
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("Passwords match"))).toBeInTheDocument()
    })
  })

  it("shows password mismatch indicator when confirm password differs", async () => {
    renderAccountStep(defaultHandlers)

    const passwordInput = screen.getByLabelText(/^Password \*/)
    const confirmInput = screen.getByLabelText(/Confirm New Password/)

    fireEvent.change(passwordInput, { target: { value: "Test123!" } })
    fireEvent.change(confirmInput, { target: { value: "Different456!" } })

    // Text might be split across elements, use flexible matcher with waitFor
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("Passwords do not match"))).toBeInTheDocument()
    })
  })

  it("shows error when provided", () => {
    renderAccountStep({ ...defaultHandlers, error: "Registration failed" })

    expect(screen.getByText("Registration failed")).toBeInTheDocument()
  })

  it("disables submit button when submitting", () => {
    renderAccountStep({ ...defaultHandlers, isSubmitting: true })

    const submitButton = screen.getByRole("button", { name: /creating account/i })
    expect(submitButton).toBeDisabled()
  })

  it("calls onSubmit when form is submitted", async () => {
    const handlers = { ...defaultHandlers }
    renderAccountStep(handlers)

    // Fill required fields - use getByLabelText with exact match for password
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "test@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Password \*/), { target: { value: "Test123!" } })
    // Use getByLabelText for confirm password since it has unique label
    fireEvent.change(screen.getByLabelText(/Confirm New Password/), { target: { value: "Test123!" } })
    fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }))
    fireEvent.click(screen.getByRole("checkbox", { name: /over 18/i }))

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create account/i }))
    })

    expect(handlers.onSubmit).toHaveBeenCalled()
  })

  it("renders Terms of Service and Privacy Policy links", () => {
    renderAccountStep(defaultHandlers)

    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute("href", "/terms")
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute("href", "/privacy")
  })
})