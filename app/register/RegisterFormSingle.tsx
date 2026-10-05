"use client"

import { useActionState, startTransition } from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { registerUser } from "@/app/actions/auth"
import Link from "next/link"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { initialOnboardingData, type OnboardingData } from "@/lib/onboarding/types"
import type { Locale } from "@/lib/i18n/locales"
import type { ThemePreference } from "@/lib/theme"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import type { CurrencyOption } from "@/lib/currency"
import { validatePassword, getPasswordStrength, getUnmetRequirements } from "@/lib/password-validation"
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales"
import { THEMES } from "@/lib/theme"
import { Check, X, Sun, Moon, Monitor, Loader2 } from "lucide-react"

export function RegisterFormSingle() {
  const { t, setLocale, locale: providerLocale } = useI18n()
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registerUser, { error: "", success: "" })
  const [formData, setFormData] = useState<OnboardingData>({
    ...initialOnboardingData,
    locale: providerLocale,
  })
  const [passwordStrength, setPasswordStrength] = useState(0)

  const handleChange = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLocaleChange = (locale: Locale) => {
    handleChange("locale", locale)
    setLocale(locale)
  }

  const handleThemeChange = (theme: ThemePreference) => handleChange("theme", theme)

  const handlePasswordChange = (password: string) => {
    handleChange("password", password)
    setPasswordStrength(getPasswordStrength(password))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataToSubmit = new FormData()
    formDataToSubmit.set("name", formData.name)
    formDataToSubmit.set("email", formData.email)
    formDataToSubmit.set("password", formData.password)
    formDataToSubmit.set("confirmPassword", formData.confirmPassword)
    formDataToSubmit.set("termsAccepted", formData.termsAccepted ? "on" : "")
    formDataToSubmit.set("isOver18", formData.isOver18 ? "on" : "")
    formDataToSubmit.set("locale", formData.locale)
    formDataToSubmit.set("theme", formData.theme)
    formDataToSubmit.set("currency", formData.currency)
    // No selectedTier - defaults to STARTER server-side

    startTransition(() => {
      formAction(formDataToSubmit)
    })
  }

  const unmetRequirements = getUnmetRequirements(formData.password)
  const passwordsMatch = formData.password.length > 0 && formData.password === formData.confirmPassword

  const requirementChecks = [
    { label: t.onboarding?.reqLength || "At least 8 characters", met: formData.password.length >= 8 },
    { label: t.onboarding?.reqUppercase || "One uppercase letter", met: /[A-Z]/.test(formData.password) },
    { label: t.onboarding?.reqLowercase || "One lowercase letter", met: /[a-z]/.test(formData.password) },
    { label: t.onboarding?.reqNumber || "One number", met: /[0-9]/.test(formData.password) },
    { label: t.onboarding?.reqSpecial || "One special character (!@#$%^&*)", met: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(formData.password) },
  ]

  const themeOptions = [
    { value: "SYSTEM" as ThemePreference, icon: Monitor, label: t.theme?.SYSTEM || "System" },
    { value: "LIGHT" as ThemePreference, icon: Sun, label: t.theme?.LIGHT || "Light" },
    { value: "DARK" as ThemePreference, icon: Moon, label: t.theme?.DARK || "Dark" },
  ]

  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      {/* Pure Tailwind/CSS Aurora Background Effect */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/25 to-[#ba87ff]/20 blur-[120px] animate-aurora" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/20 to-[#36bfae]/25 blur-[100px] animate-aurora [animation-delay:3s]" />
      </div>

      <div className="glass-card w-full max-w-3xl p-8 relative z-10">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">{t.auth.registerTitle}</h1>

        {state?.success && (
          <div className="mb-4 p-3 rounded-xl bg-[#36bfae]/10 border border-[#36bfae]/20 text-[#36bfae] text-sm">
            {state.success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {state?.error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm" role="alert">
              {state.error}
            </div>
          )}

          {/* Settings Section */}
          <div className="space-y-6">
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">{t.settings?.title || "Settings"}</h3>

              {/* Language */}
              <div>
                <label htmlFor="locale" className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
                  {t.onboarding?.step1Title || "Language"}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {t.onboarding?.step1Description || "This applies to your account only."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3" role="radiogroup" aria-label={t.onboarding?.step1Title || "Choose your language"}>
                  {LOCALES.map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={formData.locale === l}
                      onClick={() => handleLocaleChange(l)}
                      className={`relative px-5 py-3 rounded-lg border-2 transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        formData.locale === l
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {LOCALE_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
                  {t.onboarding?.step2Title || "Theme"}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {t.onboarding?.step2Description || "Applies to the dashboard and sign-in screens."}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3" role="radiogroup" aria-label={t.onboarding?.step2Title || "Choose your theme"}>
                  {themeOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={formData.theme === option.value}
                        onClick={() => handleThemeChange(option.value)}
                        className={`relative flex items-center gap-2 px-5 py-3 rounded-lg border-2 transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          formData.theme === option.value
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Currency */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-2">
                  {t.onboarding?.step3Title || "Currency"}
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {t.onboarding?.step3Description || "Booking rates are stored and displayed in this currency."}
                </p>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  aria-label={t.onboarding?.step3Title || "Choose your currency"}
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="space-y-6 pt-4 border-t border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">{t.onboarding?.step5Title || "Create your account"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.onboarding?.step5Description || "Start tracking your properties in a few seconds."}
            </p>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1">
                {t.auth?.nameLabel || "Name"} <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder={t.auth?.nameLabel || "Name"}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1">
                {t.auth?.emailLabel || "Email"} <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder={t.auth?.emailLabel || "Email"}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1">
                {t.auth?.passwordLabel || "Password"} <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder={t.auth?.passwordLabel || "Password"}
                autoComplete="new-password"
                aria-describedby="password-requirements"
              />

              {formData.password.length > 0 && (
                <div id="password-requirements" className="mt-3 space-y-2" role="list" aria-label={t.onboarding?.passwordRequirements || "Password requirements"}>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength <= 1 ? "bg-red-500" : passwordStrength <= 3 ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {passwordStrength === 0
                        ? ""
                        : passwordStrength <= 1
                        ? "Weak"
                        : passwordStrength <= 2
                        ? "Fair"
                        : passwordStrength <= 3
                        ? "Good"
                        : passwordStrength === 4
                        ? "Strong"
                        : "Very Strong"}
                    </span>
                  </div>

                  <ul className="space-y-1" role="list">
                    {requirementChecks.map((req, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        {req.met ? (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <X className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" aria-hidden="true" />
                        )}
                        <span className={`${req.met ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1">
                {t.auth?.confirmPassword || "Confirm password"} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10"
                  placeholder={t.auth?.confirmPassword || "Confirm password"}
                  autoComplete="new-password"
                />
                {formData.confirmPassword.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm">
                    {passwordsMatch ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                        <span className="text-green-600 dark:text-green-400">{t.onboarding?.passwordMatch || "Passwords match"}</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-red-500" aria-hidden="true" />
                        <span className="text-red-600 dark:text-red-400">{t.onboarding?.passwordMismatch || "Passwords do not match"}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={formData.termsAccepted}
                  onChange={(e) => handleChange("termsAccepted", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                />
                <label htmlFor="terms" className="text-sm text-gray-300 dark:text-gray-400">
                  {t.onboarding?.termsLabelPrefix || t.auth?.termsLabelPrefix || "I agree to the "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {t.auth?.termsLink || "Terms of Service"}
                  </a>
                  {t.onboarding?.and || t.auth?.and || " and "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {t.auth?.privacyLink || "Privacy Policy"}
                  </a>
                  <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="isOver18"
                  type="checkbox"
                  checked={formData.isOver18}
                  onChange={(e) => handleChange("isOver18", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                />
                <label htmlFor="isOver18" className="text-sm text-gray-300 dark:text-gray-400">
                  {t.onboarding?.over18Label || "I confirm that I am over 18 years old"}
                  <span className="text-red-500">*</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{t.onboarding?.creatingAccount || t.auth?.creatingAccount || "Creating account..."}</span>
                </>
              ) : (
                t.onboarding?.createAccount || t.auth?.createAccount || "Create account"
              )}
            </button>
          </div>
        </form>

        <p className="text-sm text-white/50 text-center mt-6">
          {t.auth.alreadyHaveAccount}{" "}
          <Link href="/signin" className="text-[#36bfae] hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </div>
    </section>
  )
}