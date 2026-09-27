"use client"

import { useActionState, startTransition } from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { registerUser } from "@/app/actions/auth"
import Link from "next/link"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { initialOnboardingData, type OnboardingData, type OnboardingStep } from "@/lib/onboarding/types"
import type { Locale } from "@/lib/i18n/locales"
import type { ThemePreference } from "@/lib/theme"
import LanguageStep from "./steps/LanguageStep"
import ThemeStep from "./steps/ThemeStep"
import CurrencyStep from "./steps/CurrencyStep"
import PlanStep from "./steps/PlanStep"
import AccountStep from "./steps/AccountStep"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"

export function RegisterForm() {
  const { t } = useI18n()
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registerUser, { error: "", success: "" })
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [formData, setFormData] = useState<OnboardingData>(initialOnboardingData)


  const handleChange = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (state?.error) {
      // We can't directly clear the server action state, but we can track local error
    }
  }

  const handleLocaleChange = (locale: Locale) => handleChange("locale", locale)
  const handleThemeChange = (theme: ThemePreference) => handleChange("theme", theme)
  const handleTierChange = (tier: "STARTER" | "PRO" | "BUSINESS") => handleChange("selectedTier", tier)

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as OnboardingStep)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataToSubmit = new FormData()
    formDataToSubmit.set("name", formData.name)
    formDataToSubmit.set("email", formData.email)
    formDataToSubmit.set("password", formData.password)
    formDataToSubmit.set("confirmPassword", formData.confirmPassword)
    formDataToSubmit.set("termsAccepted", formData.termsAccepted ? "on" : "")
    formDataToSubmit.set("locale", formData.locale)
    formDataToSubmit.set("theme", formData.theme)
    formDataToSubmit.set("currency", formData.currency)
    formDataToSubmit.set("selectedTier", formData.selectedTier)

    startTransition(() => {
      formAction(formDataToSubmit)
    })
  }

  const steps: { step: OnboardingStep; label: string }[] = [
    { step: 1, label: t.onboarding?.step1Title || "Language" },
    { step: 2, label: t.onboarding?.step2Title || "Theme" },
    { step: 3, label: t.onboarding?.step3Title || "Currency" },
    { step: 4, label: t.onboarding?.step4Title || "Plan" },
    { step: 5, label: t.onboarding?.step5Title || "Account" },
  ]

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <LanguageStep
            locale={formData.locale}
            onChange={handleLocaleChange}
          />
        )
      case 2:
        return (
          <ThemeStep
            theme={formData.theme}
            onChange={handleThemeChange}
          />
        )
      case 3:
        return (
          <CurrencyStep
            currency={formData.currency}
            onChange={(currency) => handleChange("currency", currency)}
          />
        )
      case 4:
        return (
          <PlanStep
            selectedTier={formData.selectedTier}
            onChange={handleTierChange}
          />
        )
      case 5:
        return (
          <AccountStep
            name={formData.name}
            onNameChange={(name) => handleChange("name", name)}
            email={formData.email}
            onEmailChange={(email) => handleChange("email", email)}
            password={formData.password}
            onPasswordChange={(password) => handleChange("password", password)}
            confirmPassword={formData.confirmPassword}
            onConfirmPasswordChange={(confirmPassword) => handleChange("confirmPassword", confirmPassword)}
            termsAccepted={formData.termsAccepted}
            onTermsChange={(termsAccepted) => handleChange("termsAccepted", termsAccepted)}
            onSubmit={handleSubmit}
            isSubmitting={isPending}
            error={state?.error}
          />
        )
    }
  }

  return (
    <section className="dark relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      {/* Pure Tailwind/CSS Aurora Background Effect */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#36bfae]/25 to-[#ba87ff]/20 blur-[120px] animate-aurora" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#ba87ff]/20 to-[#36bfae]/25 blur-[100px] animate-aurora [animation-delay:3s]" />
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-start w-full">
            {steps.map((step, index) => (
              <div key={step.step} className="flex items-center flex-1 last:flex-initial">
                {/* Step Circle */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
                      step.step < currentStep
                        ? "bg-blue-600 text-white"
                        : step.step === currentStep
                        ? "bg-blue-600 text-white ring-4 ring-blue-600/20"
                        : "bg-white/10 text-white/50 border border-white/20"
                    }`}
                  >
                    {step.step < currentStep ? (
                      <Check className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      step.step
                    )}
                  </div>
                  <span className="mt-2 text-xs text-white/60 text-center w-[70px]">
                    {step.label}
                  </span>
                </div>

                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 min-w-[16px] mx-2 mt-5 transition-colors ${
                      step.step < currentStep ? "bg-blue-600" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-sm text-white/60">
            {t.onboarding?.progressLabel?.replace("{current}", String(currentStep)).replace("{total}", "5") ||
              `Step ${currentStep} of 5`}
          </p>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6 text-center">{t.auth.registerTitle}</h1>

        {state?.success && (
          <div className="mb-4 p-3 rounded-xl bg-[#36bfae]/10 border border-[#36bfae]/20 text-[#36bfae] text-sm">
            {state.success}
          </div>
        )}

        <div className="space-y-6">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between">
         <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1 ? true : false}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            {t.onboarding?.back || "Back"}
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t.onboarding?.next || "Next"}
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

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