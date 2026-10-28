import type { Locale as DateFnsLocale } from "date-fns"
import { de, es, fr, it, srLatn } from "date-fns/locale"
import type { Locale } from "./locales"

/**
 * date-fns humanizers (relative-time distances) for each interface language.
 *
 * Kept apart from `locales.ts` — which must stay import-free — so the locale
 * data is only bundled into components that actually format text, and nothing
 * drags it into the marketing bundle by way of the locale list.
 *
 * `undefined` means "date-fns' own default", which is enUS; that keeps the
 * table total without importing an English locale object.
 */
export const LOCALE_DATEFNS: Record<Locale, DateFnsLocale | undefined> = {
  en: undefined,
  sr: srLatn,
  de: de,
  it: it,
  fr: fr,
  es: es,
}
