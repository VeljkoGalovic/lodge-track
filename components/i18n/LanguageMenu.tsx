"use client"

import { useTransition } from "react"
import { Languages } from "lucide-react"
import { setLocalePreference } from "@/app/actions/preferences"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales"
import type { Locale } from "@/lib/i18n/locales"
import { Button } from "@/components/ui/Button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * The header's compact language control.
 *
 * Each option is labelled with the language's own autonym — "Srpski", not
 * "Serbian" — since someone who reads only Serbian cannot find their language in
 * a list written in English.
 *
 * The choice is a server round trip through `setLocalePreference`, exactly as
 * the settings page's segmented control: the preference is persisted, then the
 * dashboard segment re-renders from the server so every translated string on
 * the page is produced in the new language at once. Swapping the dictionary
 * client-side would leave server-rendered copy in the old language until
 * a reload.
 */
export function LanguageMenu() {
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()

  function choose(next: string) {
    const value = next as Locale
    if (value === locale) return
    startTransition(async () => {
      await setLocalePreference(value)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.language.label}
          className={pending ? "opacity-60" : undefined}
        >
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t.language.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={locale} onValueChange={choose}>
          {LOCALES.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {LOCALE_LABELS[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
