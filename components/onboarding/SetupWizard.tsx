"use client"

import * as React from "react"
import { useActionState } from "react"
import { completeSetupWizard } from "@/app/actions/onboarding"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { SUPPORTED_TIMEZONES, TIMEZONE_LABELS } from "@/lib/timezones"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { clsx } from "clsx"

export type WizardStep = 1 | 2 | 3

interface SetupWizardProps {
  onComplete: () => void
}

interface WizardFormData {
  // Step 1
  organizationName: string
  currency: string
  // Step 2
  timeZone: string
  // Step 3
  checkInTime: string
  checkOutTime: string
}

const INITIAL_DATA: WizardFormData = {
  organizationName: "",
  currency: "USD",
  timeZone: "UTC",
  checkInTime: "15:00",
  checkOutTime: "11:00",
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { t } = useI18n()
  const [step, setStep] = React.useState<WizardStep>(1)
  const [formData, setFormData] = React.useState<WizardFormData>(INITIAL_DATA)
  const [state, formAction, isPending] = useActionState(completeSetupWizard, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  const handleChange = <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formDataToSubmit = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSubmit.set(key, value)
    })
    formAction(formDataToSubmit)
  }

  const goNext = () => setStep((s) => (s < 3 ? (s + 1 as WizardStep) : 3))
  const goBack = () => setStep((s) => (s > 1 ? (s - 1 as WizardStep) : 1))

  const isLastStep = step === 3
  const isFirstStep = step === 1

  // Disable next on step 1 if name empty, step 2 if timezone empty
  const canProceed = step === 1
    ? formData.organizationName.trim().length > 0
    : step === 2
    ? formData.timeZone.length > 0
    : true

  return (
    <Dialog open onOpenChange={() => {}}>  // Controlled open, never closes until complete
      <DialogContent className="max-w-xl sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-6">
            {([1, 2, 3] as WizardStep[]).map((s) => (
              <React.Fragment key={s}>
                <div className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  s < step
                    ? "bg-primary text-primary-foreground"
                    : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={clsx(
                    "hidden flex-1 h-0.5 mx-2 transition-colors",
                    s < step ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step Content */}
          <div className="space-y-6">
            {/* Step 1: Organization Basics */}
            {step === 1 && (
              <div className="space-y-6" data-step="1">
                <DialogHeader>
                  <DialogTitle>{t.onboarding.setupWizard?.step1Title || "Organization Basics"}</DialogTitle>
                  <DialogDescription>{t.onboarding.setupWizard?.step1Description || "Set your organization name and default currency."}</DialogDescription>
                </DialogHeader>

                <FormMessage error={state.error} success={state.success} />

                <div className="space-y-2">
                  <label htmlFor="organizationName" className="text-sm font-medium text-muted-foreground">
                    {t.onboarding.organizationName}
                  </label>
                  <Input
                    id="organizationName"
                    value={formData.organizationName}
                    onChange={(e) => handleChange("organizationName", e.target.value)}
                    placeholder={t.onboarding.organizationNameHelp || "Acme Properties"}
                    required
                    autoFocus
                  />
                  <p className="text-xs text-subtle-foreground">{t.onboarding.organizationNameHelp}</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="currency" className="text-sm font-medium text-muted-foreground">
                    {t.onboarding.currency}
                  </label>
                  <Select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    aria-label={t.onboarding.currency}
                  >
                    {SUPPORTED_CURRENCIES.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} — {option.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-subtle-foreground">{t.onboarding.currencyHelp}</p>
                </div>
              </div>
            )}

            {/* Step 2: Time Zone */}
            {step === 2 && (
              <div className="space-y-6" data-step="2">
                <DialogHeader>
                  <DialogTitle>{t.onboarding.setupWizard?.step2Title || "Time Zone"}</DialogTitle>
                  <DialogDescription>{t.onboarding.setupWizard?.step2Description || "Select your local time zone. This affects calendar display and check-in/out times."}</DialogDescription>
                </DialogHeader>

                <FormMessage error={state.error} success={state.success} />

                <div className="space-y-2">
                  <label htmlFor="timeZone" className="text-sm font-medium text-muted-foreground">
                    {t.onboarding.setupWizard?.timeZoneLabel || "Time Zone"}
                  </label>
                  <Select
                    id="timeZone"
                    value={formData.timeZone}
                    onChange={(e) => handleChange("timeZone", e.target.value)}
                    aria-label={t.onboarding.setupWizard?.timeZoneLabel || "Time Zone"}
                  >
                    {SUPPORTED_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {TIMEZONE_LABELS[tz] || tz}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-subtle-foreground">{t.onboarding.setupWizard?.timeZoneHelp || "All dates and times will display in this time zone."}</p>
                </div>
              </div>
            )}

            {/* Step 3: Check-in/Check-out Times */}
            {step === 3 && (
              <div className="space-y-6" data-step="3">
                <DialogHeader>
                  <DialogTitle>{t.onboarding.setupWizard?.step3Title || "Check-in / Check-out"}</DialogTitle>
                  <DialogDescription>{t.onboarding.setupWizard?.step3Description || "Set default check-in and check-out times for new bookings."}</DialogDescription>
                </DialogHeader>

                <FormMessage error={state.error} success={state.success} />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="checkInTime" className="text-sm font-medium text-muted-foreground">
                      {t.onboarding.setupWizard?.checkInLabel || "Default Check-in Time"}
                    </label>
                    <Input
                      id="checkInTime"
                      type="time"
                      value={formData.checkInTime}
                      onChange={(e) => handleChange("checkInTime", e.target.value)}
                      required
                    />
                    <p className="text-xs text-subtle-foreground">{t.onboarding.setupWizard?.checkInHelp || "Guests can check in from this time."}</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="checkOutTime" className="text-sm font-medium text-muted-foreground">
                      {t.onboarding.setupWizard?.checkOutLabel || "Default Check-out Time"}
                    </label>
                    <Input
                      id="checkOutTime"
                      type="time"
                      value={formData.checkOutTime}
                      onChange={(e) => handleChange("checkOutTime", e.target.value)}
                      required
                    />
                    <p className="text-xs text-subtle-foreground">{t.onboarding.setupWizard?.checkOutHelp || "Guests must check out by this time."}</p>
                  </div>
                </div>

                <p className="text-xs text-subtle-foreground">
                  {t.onboarding.setupWizard?.timesNote || "These are defaults — you can override them per booking."}
                </p>
              </div>
            )}
          </div>

          {/* Navigation / Submit */}
          <DialogFooter className="gap-3">
            {!isFirstStep && (
              <Button type="button" variant="outline" onClick={goBack} disabled={isPending}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t.common.back}
              </Button>
            )}

            <div className="flex-1" />

            {isLastStep ? (
              <SubmitButton pendingLabel={t.common.saving} disabled={isPending}>
                {t.onboarding.setupWizard?.completeButton || "Complete Setup"}
              </SubmitButton>
            ) : (
              <Button type="button" onClick={goNext} disabled={isPending || !canProceed}>
                {t.common.next}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}