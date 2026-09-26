"use client"

import { useI18n } from "@/components/i18n/LocaleProvider"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import type { CurrencyOption } from "@/lib/currency"

interface CurrencyStepProps {
  currency: CurrencyOption["code"]
  onChange: (currency: CurrencyOption["code"]) => void
}

export default function CurrencyStep({ currency, onChange }: CurrencyStepProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t.onboarding?.step3Title || "Choose your currency"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.onboarding?.step3Description || "Booking rates are stored and displayed in this currency."}
        </p>
      </div>

      <div>
        <label htmlFor="currency" className="sr-only">
          {t.onboarding?.step3Title || "Choose your currency"}
        </label>
        <select
          id="currency"
          value={currency}
          onChange={(e) => onChange(e.target.value)}
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
  )
}