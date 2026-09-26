"use client"

import { useI18n } from "@/components/i18n/LocaleProvider"
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales"
import type { Locale } from "@/lib/i18n/locales"

interface LanguageStepProps {
  locale: Locale
  onChange: (locale: Locale) => void
}

export default function LanguageStep({ locale, onChange }: LanguageStepProps) {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t.onboarding?.step1Title || "Choose your language"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.onboarding?.step1Description || "This applies to your account only."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t.onboarding?.step1Title || "Choose your language"}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={locale === l}
            onClick={() => onChange(l)}
            className={`relative px-5 py-3 rounded-lg border-2 transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              locale === l
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
      </div>
    </div>
  )
}