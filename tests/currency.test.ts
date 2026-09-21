import { describe, expect, it } from "vitest"
import {
  formatAmount,
  formatCurrency,
  isSupportedCurrency,
  minorUnitDigits,
  parseMoneyField,
  toMajorUnits,
} from "@/lib/currency"

/** `parseMoneyField` as actions call it: assert a single exact minor-unit value. */
function ok(raw: string, currency: string): number {
  const parsed = parseMoneyField(raw, currency)
  if (!parsed.ok || parsed.minorUnits === null) throw new Error(`expected "${raw}" (${currency}) to parse`)
  return parsed.minorUnits
}

function rejected(raw: string, currency: string): void {
  const parsed = parseMoneyField(raw, currency)
  expect(parsed.ok, `"${raw}" (${currency}) should be rejected`).toBe(false)
}

describe("parseMoneyField", () => {
  it("converts plain decimals exactly — no binary floating point error", () => {
    // Number("1.005") * 100 is 100.49999999999999 → the old float parser
    // rounded this to 100, losing a cent on every such entry.
    expect(ok("1.005", "USD")).toBe(101)
    expect(ok("0.1", "USD")).toBe(10)
    expect(ok("150.50", "USD")).toBe(15050)
    expect(ok("19.99", "USD")).toBe(1999)
    expect(ok("100", "USD")).toBe(10000)
  })

  it("rounds half up at one digit beyond the currency's precision", () => {
    expect(ok("1.004", "USD")).toBe(100)
    expect(ok("1.005", "USD")).toBe(101)
    expect(ok("1.006", "USD")).toBe(101)
    expect(ok("1.0049", "USD")).toBe(100)
  })

  it("accepts thousands grouping", () => {
    expect(ok("1,500.50", "USD")).toBe(150050)
    expect(ok("1,234,567", "USD")).toBe(123456700)
    // Grouping must be well-formed: a lone leading group of 1–3 digits.
    rejected("12,34", "USD")
    rejected("1234,567", "USD")
    rejected(",500", "USD")
    rejected("1,500,", "USD")
  })

  it("uses the currency's own minor unit — JPY has none", () => {
    expect(minorUnitDigits("JPY")).toBe(0)
    expect(ok("150", "JPY")).toBe(150)
    // A fraction on a zero-decimal currency rounds to the nearest whole unit.
    expect(ok("150.5", "JPY")).toBe(151)
    expect(ok("150.4", "JPY")).toBe(150)
    expect(minorUnitDigits("USD")).toBe(2)
    expect(minorUnitDigits("EUR")).toBe(2)
  })

  it("empty input means 'no amount recorded', not zero or an error", () => {
    expect(parseMoneyField("", "USD")).toEqual({ ok: true, minorUnits: null })
  })

  it("rejects the Number() grammar beyond plain decimals", () => {
    for (const bad of [
      "-5", // negative amounts are not prices
      ".5", // no bare fraction
      "1.", // trailing point
      "1e3", // exponent
      "0x1f", // hex
      "Infinity",
      "NaN",
      "1 000", // space, not grouping
      "1.2.3",
      "١٢٣", // Input grammar deliberately accepts ASCII digits only.
      " ",
      "1,500 ", // trailing whitespace (field() trims first; this is defence)
    ]) {
      rejected(bad, "USD")
    }
  })

  it("rejects unsupported currency codes rather than guessing digits", () => {
    rejected("10", "XYZ")
    rejected("10", "")
    // Empty input short-circuits to null before the currency check — there is
    // nothing to parse, so the currency cannot make it wrong.
    expect(parseMoneyField("", "XYZ")).toEqual({ ok: true, minorUnits: null })
  })

  it("stays inside Prisma's signed Int column range", () => {
    // 21474836.47 USD → 2147483647 minor units, the exact Int32 maximum.
    expect(ok("21474836.47", "USD")).toBe(2147483647)
    rejected("21474836.48", "USD")
    rejected("99999999.99", "USD")
    // Zero-decimal currencies max out at whole units.
    expect(ok("2147483647", "JPY")).toBe(2147483647)
    rejected("2147483648", "JPY")
  })

  it("bounds input length so a hostile form cannot stall the parser", () => {
    rejected("1".repeat(81) + ".50", "USD")
    // 80 digits is allowed length-wise but overflows the Int column — the
    // range test above already covers that; here just confirm a long but
    // genuinely parseable grouped amount survives the length guard.
    expect(ok("1,234,567.89", "USD")).toBe(123456789)
  })
})

describe("formatAmount", () => {
  it("formats zero as a currency amount, not null", () => {
    expect(formatAmount(0, "USD")).toBe("$0.00")
  })
  it("returns null for null", () => {
    expect(formatAmount(null, "USD")).toBeNull()
  })
  it("returns null for undefined", () => {
    expect(formatAmount(undefined, "USD")).toBeNull()
  })
})


describe("formatting", () => {
  it("shows minor units at the currency's precision", () => {
    expect(formatCurrency(15050, "USD")).toBe("$150.50")
    expect(formatCurrency(15000, "USD")).toBe("$150.00")
    // Zero-decimal: a stored 15050 yen is ¥15,050, never ¥150.50.
    expect(formatCurrency(15050, "JPY")).toBe("¥15,050")
    // en-US inserts a non-breaking space between an alphabetic code and the amount.
    expect(formatCurrency(123456, "RSD")).toBe("RSD 1,234.56")
  })

  it("normalizes an unknown stored currency to the default instead of throwing", () => {
    expect(isSupportedCurrency("XYZ")).toBe(false)
    expect(formatCurrency(100, "XYZ")).toBe("$1.00")
  })

  it("passes null amounts through for display as '—'", () => {
    expect(formatAmount(null, "USD")).toBeNull()
    expect(formatAmount(undefined, "USD")).toBeNull()
    expect(formatAmount(15050, "USD")).toBe("$150.50")
  })

  it("edits round-trip: minor units → form value → parse → same units", () => {
    for (const currency of ["USD", "JPY", "RSD", "EUR"]) {
      for (const minor of [0, 1, 99, 100, 15050, 1234567]) {
        expect(ok(toMajorUnits(minor, currency), currency)).toBe(minor)
      }
    }
  })
})
