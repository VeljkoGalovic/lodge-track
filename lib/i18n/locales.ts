/**
 * Interface languages the application ships.
 *
 * ISO 639-1 codes. `en` first because it is the default and the fallback for
 * every key, and because `LOCALES[0]` is what the language switcher lists first.
 */
export const LOCALES = ["en", "sr"] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/**
 * Reads a raw stored value into a locale.
 *
 * An unrecognised language falls back to the default rather than throwing. The
 * value comes from a cookie and from a database column, both of which can hold
 * anything a previous version of this file accepted — a language that has since
 * been removed must degrade to English, not crash every page.
 */
export function parseLocale(raw: string | undefined | null): Locale {
  return raw && isLocale(raw) ? raw : DEFAULT_LOCALE
}

/** For the language switcher: the code paired with its own autonym. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  sr: "Srpski",
}
