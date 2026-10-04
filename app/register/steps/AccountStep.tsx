"use client"

import { useI18n } from "@/components/i18n/LocaleProvider"
import { validatePassword, getPasswordStrength, getUnmetRequirements } from "@/lib/password-validation"
import { Check, X } from "lucide-react"

interface AccountStepProps {
  name: string
  onNameChange: (name: string) => void
  email: string
  onEmailChange: (email: string) => void
  password: string
  onPasswordChange: (password: string) => void
  confirmPassword: string
  onConfirmPasswordChange: (confirmPassword: string) => void
  termsAccepted: boolean
  onTermsChange: (accepted: boolean) => void
  isOver18: boolean
  onOver18Change: (accepted: boolean) => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  error?: string
}

export default function AccountStep({
  name,
  onNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  termsAccepted,
  onTermsChange,
  isOver18,
  onOver18Change,
  onSubmit,
  isSubmitting,
  error,
}: AccountStepProps) {
  const { t } = useI18n()
  const strength = getPasswordStrength(password)
  const unmetRequirements = getUnmetRequirements(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword

  const requirementChecks = [
    { label: t.onboarding?.reqLength || "At least 8 characters", met: password.length >= 8 },
    { label: t.onboarding?.reqUppercase || "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: t.onboarding?.reqLowercase || "One lowercase letter", met: /[a-z]/.test(password) },
    { label: t.onboarding?.reqNumber || "One number", met: /[0-9]/.test(password) },
    { label: t.onboarding?.reqSpecial || "One special character (!@#$%^&*)", met: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password) },
  ]

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t.onboarding?.step5Title || "Create your account"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.onboarding?.step5Description || "Start tracking your properties in a few seconds."}
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.auth?.nameLabel || "Name"} <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder={t.auth?.nameLabel || "Name"}
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.auth?.emailLabel || "Email"} <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder={t.auth?.emailLabel || "Email"}
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.auth?.passwordLabel || "Password"} <span className="text-red-500">*</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          placeholder={t.auth?.passwordLabel || "Password"}
          autoComplete="new-password"
          aria-describedby="password-requirements"
        />

        {password.length > 0 && (
          <div id="password-requirements" className="mt-3 space-y-2" role="list" aria-label={t.onboarding?.passwordRequirements || "Password requirements"}>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    strength <= 1 ? "bg-red-500" : strength <= 3 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${(strength / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {strength === 0
                  ? ""
                  : strength <= 1
                  ? "Weak"
                  : strength <= 2
                  ? "Fair"
                  : strength <= 3
                  ? "Good"
                  : strength === 4
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
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t.auth?.confirmPasswordLabel || "Confirm Password"} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-10"
            placeholder={t.auth?.confirmPasswordLabel || "Confirm Password"}
            autoComplete="new-password"
          />
          {confirmPassword.length > 0 && (
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
            checked={termsAccepted}
            onChange={(e) => onTermsChange(e.target.checked)}
            required
            className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          />
          <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300">
            {t.onboarding?.termsLabelPrefix || t.auth?.termsLabelPrefix || "I agree to the "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {t.auth?.termsLink || "Terms of Service"}
            </a>
            {t.onboarding?.and || t.auth?.and || " and "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {t.auth?.privacyLink || "Privacy Policy"}
            </a>
            <span className="text-red-500">*</span>
          </label>
        </div>

        <div className="flex items-start gap-3">
          <input
            id="isOver18"
            type="checkbox"
            checked={isOver18}
            onChange={(e) => onOver18Change(e.target.checked)}
            required
            className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          />
          <label htmlFor="isOver18" className="text-sm text-gray-700 dark:text-gray-300">
            {t.onboarding?.over18Label || "I confirm that I am over 18 years old"}
            <span className="text-red-500">*</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting
          ? t.onboarding?.creatingAccount || t.auth?.creatingAccount || "Creating account..."
          : t.onboarding?.createAccount || t.auth?.createAccount || "Create account"}
      </button>
    </form>
  )
}