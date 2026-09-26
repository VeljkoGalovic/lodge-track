"use client"

import { useI18n } from "@/components/i18n/LocaleProvider"
import { THEMES, type ThemePreference } from "@/lib/theme"
import { Sun, Moon, Monitor } from "lucide-react"

interface ThemeStepProps {
  theme: ThemePreference
  onChange: (theme: ThemePreference) => void
}

export default function ThemeStep({ theme, onChange }: ThemeStepProps) {
  const { t } = useI18n()

  const themeOptions = [
    { value: "SYSTEM" as ThemePreference, icon: Monitor, label: t.theme?.SYSTEM || "System" },
    { value: "LIGHT" as ThemePreference, icon: Sun, label: t.theme?.LIGHT || "Light" },
    { value: "DARK" as ThemePreference, icon: Moon, label: t.theme?.DARK || "Dark" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t.onboarding?.step2Title || "Choose your theme"}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t.onboarding?.step2Description || "Applies to the dashboard and sign-in screens."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t.onboarding?.step2Title || "Choose your theme"}>
        {themeOptions.map((option) => {
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              onClick={() => onChange(option.value)}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-lg border-2 transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                theme === option.value
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
  )
}