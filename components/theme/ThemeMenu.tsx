"use client"

import * as React from "react"
import { useTransition } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { setThemePreference } from "@/app/actions/preferences"
import { useTheme } from "@/components/theme/ThemeProvider"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { THEMES, type ThemePreference } from "@/lib/theme"
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

const ICONS: Record<ThemePreference, React.ComponentType<{ className?: string }>> = {
  SYSTEM: Monitor,
  LIGHT: Sun,
  DARK: Moon,
}

/**
 * The header's compact theme control.
 *
 * The trigger shows the icon of the *chosen* preference rather than the theme
 * currently painted: on SYSTEM the two can differ, and showing a sun while the
 * page is dark because the operating system says so would misreport what is
 * stored.
 *
 * Applying is split from persisting on purpose. `setPreference` toggles the
 * document's class synchronously, so the switch is instant and — because the
 * class is what the token layer keys off — there is no flash of the old theme
 * while the server round trip is in flight.
 *
 * Three options rather than a two-state toggle: SYSTEM is a real preference and
 * not a synonym for either of the others. A toggle that flipped a system-
 * following account would silently stop the app following the system, with no
 * path back to it.
 */
export function ThemeMenu() {
  const { preference, setPreference } = useTheme()
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()

  const TriggerIcon = ICONS[preference]

  function choose(next: string) {
    const value = next as ThemePreference
    if (value === preference) return
    // Applied to the document immediately by the provider; persisted after.
    setPreference(value)
    startTransition(async () => {
      await setThemePreference(value)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.theme.label}
          className={pending ? "opacity-60" : undefined}
        >
          <TriggerIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t.theme.label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={preference} onValueChange={choose}>
          {THEMES.map((theme) => {
            const Icon = ICONS[theme]
            return (
              <DropdownMenuRadioItem key={theme} value={theme}>
                <Icon className="mr-2 h-4 w-4" />
                {t.theme[theme]}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
