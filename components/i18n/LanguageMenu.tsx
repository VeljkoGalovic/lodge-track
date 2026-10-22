"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
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
 * Like the theme switcher, we apply the locale to the client context immediately
 * so the UI updates instantly (including the dropdown selection), then persist
 * to the server. We use router.refresh() to re-fetch server components without
 * a full page reload, avoiding the "destination stream closed early" error.
 */
export function LanguageMenu() {
  const { locale, t, setLocale } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(next: string) {
    const value = next as Locale
    if (value === locale) return
    // Update client context immediately so the dropdown and all client components
    // reflect the new language instantly (fixes the "stuck on original language" bug)
    setLocale(value)
    startTransition(async () => {
      const result = await setLocalePreference(value)
      if (!result.error) {
        // Re-fetch server components to update server-rendered content
        // without a full page reload (avoids "destination stream closed early")
        router.refresh()
      }
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
