"use client"

import * as React from "react"
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/locales"

/**
 * Context for locale state and setter — changes only when user switches language.
 * Components using `useLocale()` only re-render on actual locale change.
 */
interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null)

/**
 * Context for the dictionary — changes when locale changes.
 * Components using `useDictionary()` re-render when translations update.
 */
const DictionaryContext = React.createContext<Dictionary | null>(null)

/**
 * Makes the active language available to client components.
 *
 * Only the locale crosses the boundary — a two-letter string. The dictionary
 * itself is imported by this module and therefore already in the client bundle,
 * so passing it as a prop would ship the whole English *and* Serbian copy
 * through the RSC payload on every navigation to no benefit.
 *
 * Server components do not use this. They cannot read a client context, so they
 * call `getDictionary(await currentLocale(...))` directly — same data, same
 * source, resolved one step earlier.
 *
 * This provider splits locale state and dictionary into separate contexts so
 * components can subscribe only to what they need, avoiding unnecessary re-renders
 * when locale changes.
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const [currentLocale, setCurrentLocale] = React.useState<Locale>(locale)

  const setLocale = React.useCallback((newLocale: Locale) => {
    setCurrentLocale(newLocale)
  }, [])

  // Dictionary memoized by locale — new reference only when locale actually changes
  const dictionary = React.useMemo(() => getDictionary(currentLocale), [currentLocale])

  const localeValue = React.useMemo<LocaleContextValue>(
    () => ({ locale: currentLocale, setLocale }),
    [currentLocale, setLocale]
  )

  return (
    <LocaleContext.Provider value={localeValue}>
      <DictionaryContext.Provider value={dictionary}>
        {children}
      </DictionaryContext.Provider>
    </LocaleContext.Provider>
  )
}

/**
 * Hook for components that only need the current locale and/or setLocale.
 * Does NOT re-render when dictionary changes (only on locale change).
 */
export function useLocale(): LocaleContextValue {
  const value = React.useContext(LocaleContext)
  if (!value) throw new Error("useLocale must be used inside a LocaleProvider")
  return value
}

/**
 * Hook for components that only need the dictionary (translations).
 * Re-renders when locale changes (new dictionary), but not for locale/setLocale updates alone.
 */
export function useDictionary(): Dictionary {
  const value = React.useContext(DictionaryContext)
  if (!value) throw new Error("useDictionary must be used inside a LocaleProvider")
  return value
}

/**
 * Backward-compatible hook returning both locale and dictionary.
 * Prefer `useLocale()` or `useDictionary()` for finer-grained subscriptions.
 */
export function useI18n(): LocaleContextValue & { t: Dictionary } {
  const { locale, setLocale } = useLocale()
  const t = useDictionary()
  return { locale, setLocale, t }
}
