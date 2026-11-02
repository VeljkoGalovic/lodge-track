import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * IP-based language routing, in the style pioneered with Serbian.
 *
 * The resolver (`visitorLocale`) is generic — no language gets its own code
 * path — so what needs pinning is the routing table and the priority chain:
 * an explicit language-cookie choice beats the visitor's country, the country
 * header beats the default, and a cookie holding a retired locale code means
 * English, not a second guess against the country.
 *
 * `next/headers` is mocked rather than exercised: the landing page renders per
 * request inside Next, and the unit suite only owes this module the contract.
 */
const { cookieStore, headerStore } = vi.hoisted(() => ({
  cookieStore: {} as Record<string, string>,
  headerStore: {} as Record<string, string>,
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name in cookieStore ? { name, value: cookieStore[name] } : undefined,
  })),
  headers: vi.fn(async () => ({
    get: (name: string) => headerStore[name.toLowerCase()] ?? null,
  })),
}))

import { visitorLocale } from "@/lib/i18n/server"
import { COUNTRY_TO_LOCALE, DEFAULT_LOCALE, LOCALES, isLocale } from "@/lib/i18n/locales"
import { DICTIONARIES } from "@/lib/i18n/dictionaries"

describe("country routing table", () => {
  it("routes representative countries to their primary language", () => {
    expect(COUNTRY_TO_LOCALE.RS).toBe("sr")
    expect(COUNTRY_TO_LOCALE.DE).toBe("de")
    expect(COUNTRY_TO_LOCALE.AT).toBe("de")
    expect(COUNTRY_TO_LOCALE.LI).toBe("de")
    expect(COUNTRY_TO_LOCALE.IT).toBe("it")
    expect(COUNTRY_TO_LOCALE.SM).toBe("it")
    expect(COUNTRY_TO_LOCALE.VA).toBe("it")
    expect(COUNTRY_TO_LOCALE.FR).toBe("fr")
    expect(COUNTRY_TO_LOCALE.MC).toBe("fr")
    expect(COUNTRY_TO_LOCALE.ES).toBe("es")
    const spanishAmerica = ["MX", "AR", "CL", "CO", "PE", "UY", "VE", "EC", "BO", "PY", "GT", "HN", "NI", "SV", "PA", "CR", "DO", "CU"]
    for (const country of spanishAmerica) {
      expect(COUNTRY_TO_LOCALE[country], country).toBe("es")
    }
    expect(COUNTRY_TO_LOCALE.PT).toBe("pt")
    const lusophone = ["BR", "AO", "MZ", "CV", "GW", "ST", "TL"]
    for (const country of lusophone) {
      expect(COUNTRY_TO_LOCALE[country], country).toBe("pt")
    }
  })

  it("multilingual and unmapped countries stay out, falling to the default", () => {
    for (const country of ["CH", "BE", "LU", "BA", "HR", "ME", "MK", "US", "GB", "CA"]) {
      expect(COUNTRY_TO_LOCALE[country], `${country} should have no route`).toBeUndefined()
    }
    expect(COUNTRY_TO_LOCALE.RS).toBeDefined()
  })

  it("every route leads to a shipped locale with a real dictionary", () => {
    for (const [country, locale] of Object.entries(COUNTRY_TO_LOCALE)) {
      expect(isLocale(locale), `${country} routes to non-locale ${locale}`).toBe(true)
      expect(DICTIONARIES[locale], `${country} routes to ${locale}, which lacks a dictionary`).toBeDefined()
    }
    for (const locale of LOCALES) {
      const reachable =
        locale === DEFAULT_LOCALE || Object.values(COUNTRY_TO_LOCALE).includes(locale)
      expect(reachable, `locale ${locale} is unreachable from the routing table`).toBe(true)
    }
  })
})

describe("visitorLocale priority chain", () => {
  beforeEach(() => {
    for (const key of Object.keys(cookieStore)) delete cookieStore[key]
    for (const key of Object.keys(headerStore)) delete headerStore[key]
  })

  it("no cookie and no country header falls to the default", async () => {
    expect(await visitorLocale()).toBe("en")
  })

  it("the country header alone picks the visitor's language", async () => {
    headerStore["cf-ipcountry"] = "DE"
    expect(await visitorLocale()).toBe("de")
    headerStore["cf-ipcountry"] = "IT"
    expect(await visitorLocale()).toBe("it")
  })

  it("the country header is matched case-insensitively", async () => {
    headerStore["cf-ipcountry"] = "es"
    expect(await visitorLocale()).toBe("es")
  })

  it("an explicit language cookie wins over the country", async () => {
    headerStore["cf-ipcountry"] = "DE"
    cookieStore.lodgetrack_locale = "it"
    expect(await visitorLocale()).toBe("it")
  })

  it("a cookie with a retired code means English, not a country second guess", async () => {
    headerStore["cf-ipcountry"] = "FR"
    cookieStore.lodgetrack_locale = "xx"
    expect(await visitorLocale()).toBe("en")
  })

  it("an unknown country header falls to the default", async () => {
    headerStore["cf-ipcountry"] = "ZZ"
    expect(await visitorLocale()).toBe("en")
  })
})
