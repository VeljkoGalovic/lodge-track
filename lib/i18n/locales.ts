/**
 * Interface languages the application ships.
 *
 * ISO 639-1 codes. `en` first because it is the default and the fallback for
 * every key, and because `LOCALES[0]` is what the language switcher lists first.
 *
 * Adding a language touches this file plus, in roughly this order:
 *   1. here — the code, its autonym in `LOCALE_LABELS`, its BCP-47 tag in
 *      `LOCALE_TAGS`, and the countries that speak it in `COUNTRY_TO_LOCALE`;
 *   2. `lib/i18n/dictionaries.ts` — the translation object and its plural
 *      forms (until then `getDictionary()` serves English);
 *   3. `lib/i18n/datefns.ts` — the date-fns humanizer, if the language needs
 *      one.
 * No other file needs to change: everything else iterates `LOCALES`.
 */
export const LOCALES = ["en", "sr", "de", "it", "fr", "es", "pt"] as const

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

/**
 * For the language switcher: the code paired with its own autonym.
 * Autonyms on purpose — each speaker reads their own language's name.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  sr: "Srpski",
  de: "Deutsch",
  it: "Italiano",
  fr: "Français",
  es: "Español",
  pt: "Português",
}

/**
 * BCP-47 tags for `Intl` and `toLocaleDateString` formatting: currency, dates,
 * weekday order. Serbian is Latin script — the site never uses Cyrillic.
 */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-US",
  sr: "sr-Latn-RS",
  de: "de-DE",
  it: "it-IT",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-PT",
}

/**
 * Geo routing, driven by the `cf-ipcountry` header the Cloudflare tunnel
 * stamps on every visitor (ISO 3166-1 alpha-2).
 *
 * A country maps to a locale only when its primary language is unambiguous —
 * multilingual countries (Switzerland, Belgium, Luxembourg, Bosnia's three
 * languages…) sit out and fall to the default. Spanish Latin America is listed
 * in full because it shares the `es` written language; dialect differences in
 * address forms ("tu" vs "usted") are a styling matter for each translation,
 * not a reason for more locales. Portuguese works the same way: `pt` serves
 * Portugal and the Lusophone countries (Brazil, Angola, Mozambique, Cape
 * Verde, Guinea-Bissau, São Tomé & Príncipe, Timor-Leste), whose differences
 * are likewise a styling matter.
 */
export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  RS: "sr",
  DE: "de", AT: "de", LI: "de",
  IT: "it", SM: "it", VA: "it",
  FR: "fr", MC: "fr",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es", UY: "es",
  VE: "es", EC: "es", BO: "es", PY: "es", GT: "es", HN: "es", NI: "es",
  SV: "es", PA: "es", CR: "es", DO: "es", CU: "es",
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt",
  CV: "pt", GW: "pt", ST: "pt", TL: "pt",
}
