"use client"

import * as React from "react"
import { useTransition } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { setThemePreference } from "@/app/actions/preferences"
import { useTheme } from "@/components/theme/ThemeProvider"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { THEMES, type ThemePreference } from "@/lib/theme"
import { cn } from "@/lib/utils"

const ICONS: Record<ThemePreference, React.ComponentType<{ className?: string }>> = {
  SYSTEM: Monitor,
  LIGHT: Sun,
  DARK: Moon,
}

/**
 * A three-way segmented control.
 *
 * Three options rather than a two-state switch, because SYSTEM is a real choice
 * and not a synonym for whichever value happens to be current: flipping a switch
 * from light to dark on a system-following account would silently stop the app
 * following the system, and the member would have no way back to it.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()

  function choose(next: ThemePreference) {
    if (next === preference) return
    // Applied to the document immediately by the provider; persisted after.
    setPreference(next)
    startTransition(async () => {
      await setThemePreference(next)
    })
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.theme.label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1",
        pending && "opacity-80",
        className
      )}
    >
      {THEMES.map((theme) => {
        const Icon = ICONS[theme]
        const selected = preference === theme
        return (
          <button
            key={theme}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(theme)}
            title={t.theme[theme]}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t.theme[theme]}
          </button>
        )
      })}
    </div>
  )
}
