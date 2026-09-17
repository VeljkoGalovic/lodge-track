"use client"

import * as React from "react"
import { themeClassName, type ThemePreference } from "@/lib/theme"

interface ThemeContextValue {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

/**
 * Theme state for the dashboard.
 *
 * Deliberately holds the *preference* and not the resolved light/dark value. The
 * resolved theme cannot be known on the server — it depends on the member's
 * operating system — so rendering anything from it would mean the server and the
 * client disagreeing about the first paint. Nothing here needs it: the switcher
 * shows which of the three options is chosen, and the document's own class
 * (applied by BootScript before paint) is what decides the colours.
 *
 * `initialPreference` comes from the cookie via the server, so the switcher
 * renders the right option selected on the very first paint.
 *
 * Changing the theme applies the class synchronously and then persists it. If
 * the write fails, the class stays changed for this tab — the right trade for a
 * cosmetic setting, where reverting a switch the member just watched flip is
 * more confusing than a preference that quietly fails to survive a reload.
 */
export function ThemeProvider({
  children,
  initialPreference,
}: {
  children: React.ReactNode
  initialPreference: ThemePreference
}) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(initialPreference)

  /**
   * Applies a preference to the document.
   *
   * One function for both the mount pass and every change, so the class, the
   * `color-scheme` and React's state cannot be updated by one path and not the
   * other — which is how a switcher ends up showing "Dark" over a light page.
   */
  const apply = React.useCallback((next: ThemePreference) => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const nextClass = themeClassName(next, prefersDark)
    const root = document.documentElement

    root.classList.toggle("dark", nextClass === "dark")
    root.classList.toggle("light", nextClass === "light")
    root.dataset.theme = nextClass
    root.style.colorScheme = nextClass
  }, [])

  React.useEffect(() => {
    // Re-applied on mount so SYSTEM is resolved against this machine rather than
    // against whatever the head script happened to find.
    apply(preference)
  }, [apply, preference])

  React.useEffect(() => {
    // Following the system is only meaningful if it keeps following: without
    // this listener a member on SYSTEM whose OS flips to dark at sunset keeps
    // the theme they loaded with until they reload.
    if (preference !== "SYSTEM") return

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => apply("SYSTEM")
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [apply, preference])

  const setPreference = React.useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next)
      apply(next)
    },
    [apply]
  )

  const value = React.useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = React.useContext(ThemeContext)
  if (!value) throw new Error("useTheme must be used inside a ThemeProvider")
  return value
}
