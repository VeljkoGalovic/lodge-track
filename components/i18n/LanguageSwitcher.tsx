"use client"

import { useTransition } from "react"
import { Languages } from "lucide-react"
import { setLocalePreference } from "@/app/actions/preferences"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils"

/**
 * A segmented control over the shipped languages.
 *
 * Each option is labelled with the language's own name — "Srpski", not
 * "Serbian". Someone who reads only Serbian cannot find their language in a list
 * written in English, which is the one mistake a language picker has to avoid.
 *
 * The switch is a server round trip: the choice is persisted, then the dashboard
 * segment re-renders from the server so every translated string on the page is
 * produced in the new language at once. Translating client-side instead would
 * leave any server-rendered copy in the old language until a reload.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()

  function choose(next: (typeof LOCALES)[number]) {
    if (next === locale) return
    startTransition(async () => {
      await setLocalePreference(next)
    })
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.language.label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1",
        pending && "opacity-80",
        className
      )}
    >
      {LOCALES.map((option) => {
        const selected = option === locale
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(option)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Languages className="h-3.5 w-3.5" />
            {LOCALE_LABELS[option]}
          </button>
        )
      })}
    </div>
  )
}
