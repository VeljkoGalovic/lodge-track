"use client"

import * as React from "react"
import { useActionState, startTransition } from "react"
import { completeSetupWizard } from "@/app/actions/onboarding"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { useDictionary } from "@/components/i18n/LocaleProvider"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { SUPPORTED_TIMEZONES, TIMEZONE_LABELS } from "@/lib/timezones"
import { getOrgFeatures, getTierBadgeColor, TIER_PRICE_STRINGS } from "@/lib/subscriptions"
import type { Tier } from "@/lib/subscriptions"
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
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Check, Home, Calendar, BookOpen, DollarSign, Crown, Sparkles, ArrowUpRight, Building2, CreditCard, Receipt, LayoutGrid } from "lucide-react"
import { clsx } from "clsx"
import { format } from "date-fns"

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

interface SetupWizardProps {
  onComplete: () => void
  subscriptionTier?: Tier
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
  // Step 8
  walkthroughCompleted: boolean
}

const INITIAL_DATA: WizardFormData = {
  organizationName: "",
  currency: "USD",
  timeZone: "UTC",
  checkInTime: "15:00",
  checkOutTime: "11:00",
  walkthroughCompleted: false,
}

const WALKTHROUGH_STEPS = [
  {
    step: 4,
    icon: Home,
    titleKey: "step4Title",
    descKey: "step4Description",
    featureKey: "step5Title",
  },
  {
    step: 5,
    icon: BookOpen,
    titleKey: "step5Title",
    descKey: "step5Description",
    featureKey: "step6Title",
  },
  {
    step: 6,
    icon: Calendar,
    titleKey: "step6Title",
    descKey: "step6Description",
    featureKey: "step7Title",
  },
  {
    step: 7,
    icon: DollarSign,
    titleKey: "step7Title",
    descKey: "step7Description",
    featureKey: "step8Title",
  },
] as const

export function SetupWizard({ onComplete, subscriptionTier = "STARTER" }: SetupWizardProps) {
  const t = useDictionary()
  const [step, setStep] = React.useState<WizardStep>(1)
  const [formData, setFormData] = React.useState<WizardFormData>(INITIAL_DATA)
  const [state, formAction, isPending] = useActionState(completeSetupWizard, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  // Handle Enter key to advance steps instead of submitting form
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLastStep) {
      // Don't advance if we're in a textarea or if the input is a submit button
      const target = e.target as HTMLElement
      if (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && (target as HTMLInputElement).type === "submit")) {
        return
      }
      e.preventDefault()
      if (canProceed) {
        goNext()
      }
    }
  }

  const features = getOrgFeatures(subscriptionTier)
  const tierBadgeColor = getTierBadgeColor(subscriptionTier)
  const tierLabel = subscriptionTier.charAt(0) + subscriptionTier.slice(1).toLowerCase()
  const tierPrice = TIER_PRICE_STRINGS[subscriptionTier]

  // Pre-compute upsell data for STARTER/PRO tiers
  const nextTier = subscriptionTier === "STARTER" ? "PRO" : "BUSINESS"
  const nextFeatures = getOrgFeatures(nextTier as Tier)
  const nextTierBadgeColor = getTierBadgeColor(nextTier as Tier)
  const nextTierLabel = nextTier.charAt(0) + nextTier.slice(1).toLowerCase()
  const nextTierPrice = TIER_PRICE_STRINGS[nextTier as Tier]

  const handleChange = <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formDataToSubmit = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSubmit.set(key, value)
    })
    startTransition(() => {
      formAction(formDataToSubmit)
    })
  }

  const goNext = () => setStep((s) => (s < 8 ? (s + 1 as WizardStep) : 8))
  const goBack = () => setStep((s) => (s > 1 ? (s - 1 as WizardStep) : 1))

  const isLastStep = step === 8
  const isFirstStep = step === 1

  // Disable next on step 1 if name empty, step 2 if timezone empty
  const canProceed = step === 1
    ? formData.organizationName.trim().length > 0
    : step === 2
    ? formData.timeZone.length > 0
    : true

  const walkthroughStep = WALKTHROUGH_STEPS.find((s) => s.step === step)

  // Controlled open, never closes until complete
  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-xl sm:max-w-2xl max-md:p-4">
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
          {/* Progress Indicator. Stays pinned while the dialog scrolls so the
              indicator is not carried off by the content it tracks; on phones
              it is compact, because every pixel of top chrome competes with
              the walkthrough demo the user is meant to read — the footer is
              what scrolling is for. */}
          <nav
            aria-label={t.onboarding.setupWizard?.progress || "Setup wizard steps"}
            className="mb-6 sticky top-0 z-10 bg-popover/95 backdrop-blur-xl max-md:-mx-6 max-md:-mt-6 max-md:px-6 max-md:pt-6 max-md:mb-2"
          >
            <ol className="flex items-center justify-between" role="list">
              {([1, 2, 3, 4, 5, 6, 7, 8] as WizardStep[]).map((s) => (
                <React.Fragment key={s}>
                  <li aria-current={s === step ? "step" : undefined} className="flex items-center">
                    <div className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors max-md:h-6 max-md:w-6 max-md:text-xs",
                      s < step
                        ? "bg-primary text-primary-foreground"
                        : s === step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {s < step ? <Check className="h-4 w-4" /> : s}
                    </div>
                    {s < 8 && (
                      <div className={clsx(
                        "hidden flex-1 h-0.5 mx-2 transition-colors",
                        s < step ? "bg-primary" : "bg-muted"
                      )} />
                    )}
                  </li>
                </React.Fragment>
              ))}
            </ol>
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {t.onboarding.setupWizard?.stepAnnouncement?.replace("{current}", String(step)).replace("{total}", "8") || `Step ${step} of 8`}
            </div>
          </nav>

          {/* Step Content */}
          <div role="region" aria-label={t.onboarding.setupWizard?.progress || "Setup wizard progress"} aria-live="polite" className="space-y-6">
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

            {/* Steps 4-7: Walkthrough Steps */}
            {walkthroughStep && (
              <div className="space-y-6" data-step={walkthroughStep.step}>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <walkthroughStep.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg">{t.onboarding.setupWizard?.[walkthroughStep.titleKey] || walkthroughStep.titleKey}</DialogTitle>
                      <DialogDescription className="mt-1">{t.onboarding.setupWizard?.[walkthroughStep.descKey] || walkthroughStep.descKey}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <FormMessage error={state.error} success={state.success} />

                <div className="rounded-xl border border-border/50 bg-popover/50 p-6 space-y-4 max-md:p-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t.onboarding.setupWizard?.walkthroughNext?.replace("{feature}", t.onboarding.setupWizard?.[walkthroughStep.featureKey] || walkthroughStep.featureKey) || `Next: ${walkthroughStep.featureKey}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-subtle-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>This is a guided preview — no action needed. Click &quot;Next&quot; to continue.</span>
                    </div>
                  </div>

                  {/* Visual preview for each walkthrough */}
                  <div className="relative aspect-video rounded-lg bg-muted/50 overflow-hidden">
                    <div className="absolute inset-0 flex flex-col p-4 overflow-auto">
                      {walkthroughStep.step === 4 && (
                        // Step 4: Properties Preview
                        <PropertiesPreview />
                      )}
                      {walkthroughStep.step === 5 && (
                        // Step 5: Bookings Preview
                        <BookingsPreview />
                      )}
                      {walkthroughStep.step === 6 && (
                        // Step 6: Calendar Preview
                        <CalendarPreview />
                      )}
                      {walkthroughStep.step === 7 && (
                        // Step 7: Expenses Preview
                        <ExpensesPreview />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Plan-Aware Tier Upgrade / Celebration */}
            {step === 8 && (
              <div className="space-y-6" data-step="8">
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      subscriptionTier === "BUSINESS"
                        ? "bg-[#BA87FF]/10 text-[#BA87FF]"
                        : "bg-primary/10 text-primary"
                    )}>
                      {subscriptionTier === "BUSINESS" ? (
                        <Crown className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <DialogTitle className="text-lg">
                        {subscriptionTier === "BUSINESS"
                          ? (t.onboarding.setupWizard?.businessTitle || "Welcome to Business!")
                          : (t.onboarding.setupWizard?.step8Title || "Choose Your Plan")}
                      </DialogTitle>
                      <DialogDescription className="mt-1">
                        {subscriptionTier === "BUSINESS"
                          ? (t.onboarding.setupWizard?.businessDescription || "You have unlimited properties and all features.")
                          : (t.onboarding.setupWizard?.step8Description || "Unlock more properties and features.")}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <FormMessage error={state.error} success={state.success} />

                {subscriptionTier === "BUSINESS" ? (
                  // BUSINESS Tier: Celebration
                  <div className="space-y-4">
                    <div className={clsx(
                      "rounded-xl border p-6 text-center max-md:p-4",
                      tierBadgeColor
                    )}>
                      <Crown className={clsx("mx-auto h-12 w-12 mb-4", tierBadgeColor.replace("border-", "").replace("bg-", "").replace("text-", "text-"))} />
                      <h3 className="text-xl font-semibold mb-2">
                        {t.onboarding.setupWizard?.businessTitle || "Welcome to Business!"}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {t.onboarding.setupWizard?.businessDescription || "You have unlimited properties and all features."}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                        <Badge className={tierBadgeColor}>{tierLabel} {tierPrice}/mo</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{t.onboarding.setupWizard?.upsellDescription?.replace("{maxProperties}", "∞").replace("{features}", "all features") || "Unlimited properties, all features"}</p>
                        <p className="mt-1">Dedicated account manager: veljko@lodgetrack.com</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { icon: Home, label: "Unlimited Properties" },
                        { icon: BookOpen, label: "Advanced Analytics" },
                        { icon: Calendar, label: "Team Roles (RBAC)" },
                        { icon: DollarSign, label: "API Access & Webhooks" },
                        { icon: Crown, label: "SSO Configuration" },
                        { icon: Sparkles, label: "24/7 Priority Support" },
                      ].map((feature) => (
                        <div key={feature.label} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                          <feature.icon className="h-5 w-5 text-primary" />
                          <span className="text-sm font-medium">{feature.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // STARTER/PRO Tiers: Upsell
                  <div className="space-y-4">
                    <div className={clsx(
                      "rounded-xl border p-6 max-md:p-4",
                      nextTierBadgeColor
                    )}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold">
                          {t.onboarding.setupWizard?.upsellTitle?.replace("{tier}", nextTierLabel) || `Upgrade to ${nextTierLabel}`}
                        </h3>
                        <Badge className={nextTierBadgeColor}>{nextTierLabel} {nextTierPrice}/mo</Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">
                        {t.onboarding.setupWizard?.upsellDescription
                          ?.replace("{maxProperties}", String(nextFeatures.maxProperties === Infinity ? "∞" : nextFeatures.maxProperties))
                          ?.replace("{features}", [
                            nextFeatures.hasAdvancedAnalytics && "advanced analytics",
                            nextFeatures.hasTeamRoles && "team roles",
                            nextFeatures.hasApiAccess && "API access",
                          ].filter(Boolean).join(", ")) || `${nextFeatures.maxProperties === Infinity ? "Unlimited" : nextFeatures.maxProperties} properties`}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { label: `${features.maxProperties === Infinity ? "∞" : features.maxProperties} → ${nextFeatures.maxProperties === Infinity ? "∞" : nextFeatures.maxProperties} properties`, current: false },
                          { label: "Advanced analytics", current: features.hasAdvancedAnalytics, next: nextFeatures.hasAdvancedAnalytics },
                          { label: "Team roles", current: features.hasTeamRoles, next: nextFeatures.hasTeamRoles },
                          { label: "API access", current: features.hasApiAccess, next: nextFeatures.hasApiAccess },
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{feature.label}</span>
                            <span className={clsx("font-medium", feature.next ? "text-green-400" : "text-muted-foreground")}>
                              {feature.current ? "✓" : feature.next ? "✨ New" : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <p className="text-sm text-muted-foreground">
                        {subscriptionTier === "STARTER"
                          ? "You're on the Starter plan. Upgrade to unlock more properties and advanced features."
                          : "You're on the Pro plan. Upgrade to Business for unlimited properties, API access, and a dedicated account manager."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mock Data Options */}
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                  <p className="text-sm font-medium">Walkthrough Sample Data</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer hover:bg-muted/50 transition-colors min-h-[44px] touch-manipulation">
                      <input
                        type="radio"
                        name="mockDataChoice"
                        value="keep"
                        checked={formData.walkthroughCompleted}
                        onChange={() => handleChange("walkthroughCompleted", true)}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer min-w-[44px] min-h-[44px]"
                      />
                      <div>
                        <p className="font-medium text-sm">{t.onboarding.setupWizard?.keepMockData || "Keep sample data"}</p>
                        <p className="text-xs text-muted-foreground">{t.onboarding.setupWizard?.keepMockDataHelp || "Save the sample properties, bookings, and expenses created during the walkthrough."}</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-lg border border-border bg-background p-3 cursor-pointer hover:bg-muted/50 transition-colors min-h-[44px] touch-manipulation">
                      <input
                        type="radio"
                        name="mockDataChoice"
                        value="discard"
                        checked={!formData.walkthroughCompleted}
                        onChange={() => handleChange("walkthroughCompleted", false)}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer min-w-[44px] min-h-[44px]"
                      />
                      <div>
                        <p className="font-medium text-sm">{t.onboarding.setupWizard?.discardMockData || "Start fresh"}</p>
                        <p className="text-xs text-muted-foreground">{t.onboarding.setupWizard?.discardMockDataHelp || "Remove sample data and begin with a clean dashboard."}</p>
                      </div>
                    </label>
                  </div>
                </div>
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

// Preview Components
function PropertiesPreview() {
  const t = useDictionary()
  const mockProperties = [
    { name: "Sunset Villa", location: "Malibu, CA", units: 3, status: "Active" },
    { name: "Mountain Cabin", location: "Aspen, CO", units: 1, status: "Active" },
    { name: "Downtown Loft", location: "Austin, TX", units: 2, status: "Pending" },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>{t.pages.properties?.allProperties || "Properties"}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{mockProperties.length}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {mockProperties.map((prop, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{prop.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{prop.location}</p>
              </div>
              <Badge variant={prop.status === "Active" ? "default" : "secondary"} className="text-xs">
                {prop.status}
              </Badge>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{prop.units} {prop.units === 1 ? "unit" : "units"}</span>
              <span className="text-primary font-medium">$0</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground mt-4">
        {t.onboarding.setupWizard?.step4Description || "Create and manage your property portfolio"}
      </p>
    </div>
  )
}

function BookingsPreview() {
  const t = useDictionary()
  const today = new Date()
  const mockBookings = [
    { guest: "John Smith", property: "Sunset Villa", checkIn: today, checkOut: new Date(today.getTime() + 3 * 86400000), status: "CONFIRMED", amount: 1200 },
    { guest: "Maria Garcia", property: "Mountain Cabin", checkIn: new Date(today.getTime() + 5 * 86400000), checkOut: new Date(today.getTime() + 7 * 86400000), status: "PENDING", amount: 800 },
    { guest: "David Chen", property: "Downtown Loft", checkIn: new Date(today.getTime() - 2 * 86400000), checkOut: today, status: "CHECKED_IN", amount: 450 },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>{t.pages.bookings?.allBookings || "Bookings"}</span>
        <Badge variant="outline" className="text-xs">
          <Calendar className="h-3 w-3 mr-1" />
          {format(today, "MMM d")}
        </Badge>
      </div>
      <div className="space-y-2">
        {mockBookings.map((booking, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{booking.guest}</p>
                <p className="text-xs text-muted-foreground">{booking.property}</p>
              </div>
              <Badge variant={booking.status === "CONFIRMED" ? "default" : booking.status === "PENDING" ? "secondary" : "outline"} className="text-xs whitespace-nowrap">
                {t.pages.bookings?.statuses?.[booking.status as keyof typeof t.pages.bookings.statuses] || booking.status}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <Calendar className="h-3 w-3 inline mr-1" />
                {format(booking.checkIn, "MMM d")} – {format(booking.checkOut, "MMM d")}
              </span>
              <span className="font-medium text-primary">${booking.amount}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground mt-4">
        {t.onboarding.setupWizard?.step5Description || "Add and manage guest bookings"}
      </p>
    </div>
  )
}

function CalendarPreview() {
  const t = useDictionary()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const daysInMonth = monthEnd.getDate()
  const firstDayOfWeek = monthStart.getDay()

  const mockOccupancy: Record<number, number> = {
    1: 2, 2: 3, 3: 1, 4: 0, 5: 2, 6: 3, 7: 2,
    8: 1, 9: 0, 10: 2, 11: 3, 12: 2, 13: 1, 14: 0,
    15: 1, 16: 2, 17: 3, 18: 2, 19: 1, 20: 0, 21: 1,
    22: 2, 23: 3, 24: 2, 25: 1, 26: 0, 27: 1, 28: 2, 29: 1, 30: 0,
  }

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>{format(today, "MMMM yyyy")}</span>
        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
          {Object.values(mockOccupancy).filter(v => v > 0).length} / {daysInMonth} days occupied
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {dayNames.map((day, i) => (
          <div key={i} className="text-xs font-medium text-muted-foreground py-1">{day}</div>
        ))}
        {/* Empty cells before month start */}
        {[...Array(firstDayOfWeek)].map((_, i) => (
          <div key={i} className="aspect-square" />
        ))}
        {/* Days of month */}
        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1
          const occupancy = mockOccupancy[day] || 0
          const isToday = day === today.getDate()
          return (
            <div
              key={day}
              className={`relative aspect-square rounded text-xs flex items-center justify-center ${
                isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
              }`}
            >
              {day}
              {occupancy > 0 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {[...Array(Math.min(occupancy, 3))].map((_, j) => (
                    <div key={j} className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ))}
                  {occupancy > 3 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50" title="+{occupancy - 3} more" />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-center text-muted-foreground mt-4">
        {t.onboarding.setupWizard?.step6Description || "Explore the calendar view for occupancy overview"}
      </p>
    </div>
  )
}

/**
 * Demonstration rows for the walkthrough preview. Computed once at module load
 * instead of on every render — `Date.now()` inside the component body violates
 * React's purity rules (react-hooks/purity).
 */
const mockExpenses = [
  { date: new Date(), property: "Sunset Villa", category: "MAINTENANCE", description: "AC unit repair", amount: 350, hasReceipt: true },
  { date: new Date(Date.now() - 2 * 86400000), property: "Mountain Cabin", category: "UTILITIES", description: "Electric bill", amount: 120, hasReceipt: true },
  { date: new Date(Date.now() - 5 * 86400000), property: "Downtown Loft", category: "CLEANING", description: "Deep clean between guests", amount: 85, hasReceipt: false },
  { date: new Date(Date.now() - 10 * 86400000), property: "Sunset Villa", category: "SUPPLIES", description: "Toiletries restock", amount: 45, hasReceipt: true },
]

function ExpensesPreview() {
  const t = useDictionary()

  const categoryColors: Record<string, string> = {
    MAINTENANCE: "bg-amber-500",
    UTILITIES: "bg-blue-500",
    SUPPLIES: "bg-green-500",
    CLEANING: "bg-purple-500",
    TAXES: "bg-red-500",
    INSURANCE: "bg-indigo-500",
    OTHER: "bg-gray-500",
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>{t.pages.expenses?.loggedCosts || "Expenses"}</span>
        <span className="font-medium text-primary">
          ${mockExpenses.reduce((sum, e) => sum + e.amount, 0)}
        </span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {mockExpenses.map((expense, i) => (
          <div key={i} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryColors[expense.category] || "bg-gray-500"} text-white`}>
                    {expense.category}
                  </span>
                  {expense.hasReceipt && (
                    <Receipt className="h-3 w-3 text-muted-foreground" aria-label="Has receipt" />
                  )}
                </div>
                <p className="text-sm font-medium mt-1 truncate">{expense.description}</p>
                <p className="text-xs text-muted-foreground">{expense.property}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-primary">${expense.amount}</p>
                <p className="text-xs text-muted-foreground">{format(expense.date, "MMM d")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground mt-4">
        {t.onboarding.setupWizard?.step7Description || "Track maintenance, utilities, and other costs"}
      </p>
    </div>
  )
}