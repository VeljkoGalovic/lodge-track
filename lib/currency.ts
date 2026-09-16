/**
 * Formatting for stored monetary amounts.
 *
 * The schema keeps a single integer column per amount and no currency of its
 * own, documented as "minor units" — cents for USD, but not for every currency.
 * The organization decides which currency that column is in, and every render
 * goes through here so the two can never disagree.
 */

export interface CurrencyOption {
  /** ISO 4217 code. */
  code: string
  label: string
}

/** Currencies an organization can pick. The set is closed so a stray value can
 *  never reach `Intl`, which throws on an unknown code. */
export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "DKK", label: "Danish Krone" },
  { code: "PLN", label: "Polish Złoty" },
  { code: "RSD", label: "Serbian Dinar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "INR", label: "Indian Rupee" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "ZAR", label: "South African Rand" },
]

export const DEFAULT_CURRENCY = "USD"

const SUPPORTED_CODES = new Set(SUPPORTED_CURRENCIES.map((option) => option.code))

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CODES.has(code)
}

/** Falls back to the default rather than throwing, so a bad stored value renders as USD instead of taking the page down. */
export function normalizeCurrency(code: string | null | undefined): string {
  return code && isSupportedCurrency(code) ? code : DEFAULT_CURRENCY
}

/**
 * How many decimal places the currency's minor unit sits below its major unit —
 * 2 for USD, but 0 for JPY, which has no subunit at all. Read from `Intl` rather
 * than hardcoded, because guessing "divide by 100" is wrong for a whole class of
 * currencies and silently produces amounts off by two orders of magnitude.
 */
const digitsCache = new Map<string, number>()

export function minorUnitDigits(currency: string): number {
  const cached = digitsCache.get(currency)
  if (cached !== undefined) return cached

  // `maximumFractionDigits` is typed as possibly-undefined even though every
  // resolved currency defines it; 2 is the conventional fallback.
  const digits =
    new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2

  digitsCache.set(currency, digits)
  return digits
}

/** Formats minor units (cents) as a currency string. */
export function formatCurrency(minorUnits: number, currency: string): string {
  const code = normalizeCurrency(currency)
  const majorUnits = minorUnits / 10 ** minorUnitDigits(code)

  return majorUnits.toLocaleString("en-US", {
    style: "currency",
    currency: code,
    // The currency's own precision, so a stored $150.50 shows its cents rather
    // than being rounded to $151, and a yen amount stays a bare integer.
    maximumFractionDigits: minorUnitDigits(code),
  })
}

/** Formats minor units, passing `null` through so an unrecorded rate shows as "—". */
export function formatAmount(
  minorUnits: number | null | undefined,
  currency: string
): string | null {
  return minorUnits == null ? null : formatCurrency(minorUnits, currency)
}

/**
 * Minor units back to the number a person would type into a form — 15050 → "150.50"
 * for USD, but 15050 → "15050" for JPY. Editing an amount through a hardcoded
 * divide-by-100 would corrupt every zero-decimal currency.
 */
export function toMajorUnits(minorUnits: number, currency: string): string {
  const code = normalizeCurrency(currency)
  return (minorUnits / 10 ** minorUnitDigits(code)).toFixed(minorUnitDigits(code))
}
