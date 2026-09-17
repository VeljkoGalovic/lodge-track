"use client"

import * as React from "react"
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/locales"

interface I18nValue {
  locale: Locale
  /** The dictionary for `locale`. Every nested object is present by type. */
  t: Dictionary
}

const I18nContext = React.createContext<I18nValue | null>(null)

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
 */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const value = React.useMemo<I18nValue>(
    () => ({ locale, t: getDictionary(locale) }),
    [locale]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = React.useContext(I18nContext)
  if (!value) throw new Error("useI18n must be used inside a LocaleProvider")
  return value
}
