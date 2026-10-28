import { describe, expect, it } from "vitest"
import { plural, NIGHT_FORMS, BOOKING_COUNT_FORMS, EXPENSE_COUNT_FORMS } from "@/lib/i18n/dictionaries"

/**
 * The plural rule engine. `selectPluralForm` is gone — each language's table
 * carries its own ordered rules, so these tests pin the three plural systems
 * the app ships and the unpicked-language fallbacks.
 */
describe("plural rule engine", () => {
  const srn = NIGHT_FORMS.sr
  const enn = NIGHT_FORMS.en
  const frn = NIGHT_FORMS.fr

  it("English: singular at exactly 1, plural otherwise", () => {
    expect(plural(1, enn)).toBe("1 night")
    expect(plural(0, enn)).toBe("0 nights")
    expect(plural(2, enn)).toBe("2 nights")
    expect(plural(21, enn)).toBe("21 nights")
    expect(plural(-1, enn)).toBe("-1 night")
  })

  it("French puts 0 in the singular even in the untranslated entry", () => {
    expect(plural(0, frn)).toBe("0 night")
    expect(plural(1, frn)).toBe("1 night")
    expect(plural(2, frn)).toBe("2 nights")
  })

  it("Serbian counts in threes by the last two digits, teens on 'many'", () => {
    expect(plural(1, srn)).toBe("1 noć")
    expect(plural(2, srn)).toBe("2 noći")
    expect(plural(4, srn)).toBe("4 noći")
    expect(plural(5, srn)).toBe("5 noći")
    expect(plural(11, srn)).toBe("11 noći")
    expect(plural(21, srn)).toBe("21 noć")
    expect(plural(22, srn)).toBe("22 noći")
    expect(plural(25, srn)).toBe("25 noći")
    expect(plural(111, srn)).toBe("111 noći")
  })

  it("every shipped table ends in a catch-all, so plural never misses", () => {
    const tables = [NIGHT_FORMS, BOOKING_COUNT_FORMS, EXPENSE_COUNT_FORMS]
    for (const table of Object.values(tables)) {
      for (const forms of Object.values(table)) {
        const scans = [0, 1, 2, 5, 11, 101].every((n) =>
          forms.rules.some((rule) => rule.match(Math.abs(n)))
        )
        expect(scans, forms.rules.at(-1)!.template).toBe(true)
        expect(forms.rules.at(-1)!.match(Number.POSITIVE_INFINITY)).toBe(true)
      }
    }
  })
})
