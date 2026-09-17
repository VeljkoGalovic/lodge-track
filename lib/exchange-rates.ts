import "server-only"

import { unstable_cache } from "next/cache"
import { SUPPORTED_CURRENCIES, minorUnitDigits } from "@/lib/currency"

/**
 * Free tier of app.exchangerate-api.com — updates daily.
 * Not guaranteed in an unconfigured environment, so a robust fallback is included.
 */
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest/USD"

/**
 * The rates a tenant's analytics and conversions use.
 * Keyed by ISO 4217 code, all relative to USD=1.
 */
export type ExchangeRates = Record<string, number>

/**
 * Hardcoded rates (Sept 2024 approximation) to keep the app working
 * even if the external API rate-limits, changes its shape, or times out.
 */
const FALLBACK_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  NZD: 1.66,
  CHF: 0.89,
  SEK: 10.45,
  NOK: 10.59,
  DKK: 6.87,
  PLN: 4.31,
  RSD: 108.15,
  JPY: 153.20,
  INR: 83.3,
  BRL: 5.0,
  MXN: 16.5,
  ZAR: 18.8,
}

interface ErApiResponse {
  result?: string
  rates?: Record<string, number>
}

/**
 * Fetches and caches exchange rates for 24 hours.
 *
 * `unstable_cache` is Next.js's data cache — it executes this once per 24 hours
 * across all render trees and tenants. Multi-currency conversions using this map
 * are thus deterministic for the whole day, preventing analytics cards from
 * jittering as live rates fluctuate mid-session.
 */
export const getExchangeRates = unstable_cache(
  async (): Promise<ExchangeRates> => {
    try {
      const res = await fetch(EXCHANGE_RATE_API_URL, {
        next: { revalidate: 60 * 60 * 24 }, // 24 hours
      })
      if (!res.ok) {
        console.warn(`[Exchange Rates] API returned ${res.status}. Using fallback.`)
        return FALLBACK_RATES
      }

      const data = (await res.json()) as ErApiResponse
      if (data.result === "success" && data.rates) {
        // Strip out currencies LodgeTrack doesn't support so we don't hold
        // 160+ keys in memory when the UI only allows picking 17.
        const filtered: ExchangeRates = {}
        for (const option of SUPPORTED_CURRENCIES) {
          if (typeof data.rates[option.code] === "number") {
            filtered[option.code] = data.rates[option.code]
          } else {
            // Found a supported currency missing from the API
            filtered[option.code] = FALLBACK_RATES[option.code]
          }
        }
        return filtered
      }

      console.warn(`[Exchange Rates] Unrecognised API shape. Using fallback.`)
      return FALLBACK_RATES
    } catch (e) {
      console.warn(`[Exchange Rates] Fetch failed: ${String(e)}. Using fallback.`)
      return FALLBACK_RATES
    }
  },
  ["exchange-rates-cache"],
  { revalidate: 60 * 60 * 24 } // 24 hours
)

/**
 * Converts a minor-unit amount from one currency to another.
 *
 * Takes `rates` explicitly to force the caller (which is server-only) to await
 * the cache, rather than making this a Promise that poisons synchronous UI
 * helpers if called deeply in a component.
 *
 * A minor-unit amount has to be converted as its *major* unit because rates
 * relate majors (1 USD = 108 RSD), and then stepped back down into the minor
 * unit of the target to maintain the storage shape. An unrecognised currency
 * falls back to a 1:1 ratio.
 */
export function convertAmount(
  amountMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number {
  if (fromCurrency === toCurrency) return amountMinor

  // Protect against a null or zero rate inside the cache or fallback
  const fromRate = rates[fromCurrency] || 1
  const toRate = rates[toCurrency] || 1

  const fromDigits = minorUnitDigits(fromCurrency)
  const toDigits = minorUnitDigits(toCurrency)

  const amountMajor = amountMinor / Math.pow(10, fromDigits)
  const convertedMajor = (amountMajor / fromRate) * toRate

  return Math.round(convertedMajor * Math.pow(10, toDigits))
}
