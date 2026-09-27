"use client"

import { useI18n } from "@/components/i18n/LocaleProvider"
import { Check } from "lucide-react"
import type { SubscriptionTier } from "@/lib/onboarding/types"

interface PlanStepProps {
  selectedTier: SubscriptionTier
  onChange: (tier: SubscriptionTier) => void
}

const PLANS = [
  {
    id: "STARTER" as SubscriptionTier,
    nameKey: "starterPlan",
    price: "free",
    priceKey: "free",
    periodKey: "perMonth",
    popular: false,
    featuresKey: "starterFeatures",
  },
  {
    id: "PRO" as SubscriptionTier,
    nameKey: "proPlan",
    price: "$29",
    priceKey: "proPrice",
    periodKey: "perMonth",
    popular: true,
    featuresKey: "proFeatures",
  },
  {
    id: "BUSINESS" as SubscriptionTier,
    nameKey: "businessPlan",
    price: "$79",
    priceKey: "businessPrice",
    periodKey: "perMonth",
    popular: false,
    featuresKey: "businessFeatures",
  },
] as const

export default function PlanStep({ selectedTier, onChange }: PlanStepProps) {
  const { t } = useI18n()

  const handleSelectPlan = (tier: SubscriptionTier) => {
    onChange(tier)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t.onboarding?.planTitle || "Choose your plan"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.onboarding?.planSubtitle || "All plans include a 14-day free trial. No credit card required."}
        </p>
      </div>

      <div className="space-y-4" role="radiogroup" aria-label={t.onboarding?.planTitle || "Choose your plan"}>
        {PLANS.map((plan) => {
          const isSelected = selectedTier === plan.id
          const features = t.onboarding?.[plan.featuresKey as keyof typeof t.onboarding] as string[] || []

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => handleSelectPlan(plan.id)}
              role="radio"
              aria-checked={isSelected}
              className={`relative w-full p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <span className="absolute -top-2 right-4 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500 text-white">
                  {t.onboarding?.mostPopular || "Most popular"}
                </span>
              )}

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Radio indicator */}
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 dark:border-gray-600"
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {t.onboarding?.[plan.nameKey as keyof typeof t.onboarding] || plan.id}
                    </h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {plan.price === "free"
                          ? (t.onboarding?.[plan.priceKey as keyof typeof t.onboarding] || "Free")
                          : plan.price}
                      </span>
                      {plan.price !== "free" && (
                        <span className="text-gray-500 dark:text-gray-400">
                          {t.onboarding?.[plan.periodKey as keyof typeof t.onboarding] || "/month"}
                        </span>
                      )}
                      {plan.price === "free" && (
                        <span className="text-green-600 dark:text-green-400 text-sm font-medium ml-2">
                          {t.onboarding?.[plan.priceKey as keyof typeof t.onboarding] || "Free"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Select button */}
                <span className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}>
                  {t.onboarding?.choosePlan?.replace("{plan}", String(t.onboarding?.[plan.nameKey as keyof typeof t.onboarding] || plan.id)) || `Choose ${plan.id}`}
                </span>
              </div>

              {/* Features list */}
              <ul className="mt-4 space-y-2 pl-10" role="list">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}