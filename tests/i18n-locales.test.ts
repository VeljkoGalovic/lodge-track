import { describe, expect, it } from "vitest"
import { DICTIONARIES, NIGHT_FORMS, BOOKING_COUNT_FORMS, EXPENSE_COUNT_FORMS } from "@/lib/i18n/dictionaries"

/**
 * Sentinel for the locales added after the en/sr pair. `Dictionary = typeof en`
 * already pins the key set at compile time; these tests pin what the compiler
 * cannot: that no slot left filled in English is empty in translation, that
 * `{placeholder}` sets survive translation verbatim, and that the plural-table
 * fillers stopped being English clones once a language shipped.
 */
const NEW_LOCALES = ["de", "it", "fr", "es"] as const

function placeholdersOf(s: string): string {
  return (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join(",")
}

describe("new locale dictionaries", () => {
  it("each new locale is registered", () => {
    for (const locale of NEW_LOCALES) {
      expect(DICTIONARIES[locale], `no dictionary registered for ${locale}`).toBeDefined()
    }
  })

  it("translations are non-empty and keep every `{placeholder}`", () => {
    const enDict = DICTIONARIES.en!
    for (const locale of NEW_LOCALES) {
      const dict = DICTIONARIES[locale]!
      const compare = (enNode: unknown, otherNode: unknown, path: string): void => {
        if (typeof enNode === "string") {
          expect(typeof otherNode, `${locale} ${path} is not a string`).toBe("string")
          const other = otherNode as string
          if (enNode.trim() !== "") {
            expect(other.trim(), `${locale} ${path} left empty`).not.toBe("")
          }
          expect(placeholdersOf(other), `${locale} ${path} placeholders`).toBe(
            placeholdersOf(enNode)
          )
          return
        }
        if (Array.isArray(enNode)) {
          expect(Array.isArray(otherNode), `${locale} ${path} is not an array`).toBe(true)
          enNode.forEach((item, i) => compare(item, (otherNode as unknown[])[i], `${path}[${i}]`))
          return
        }
        if (enNode && typeof enNode === "object") {
          for (const key of Object.keys(enNode)) {
            compare(
              (enNode as Record<string, unknown>)[key],
              (otherNode as Record<string, unknown>)[key],
              `${path}.${key}`
            )
          }
        }
      }
      compare(enDict, dict, locale)
    }
  })

  it("plural fillers stopped being English clones", () => {
    for (const locale of NEW_LOCALES) {
      expect(NIGHT_FORMS[locale].rules[0].template).not.toBe(NIGHT_FORMS.en.rules[0].template)
      expect(BOOKING_COUNT_FORMS[locale].rules[0].template).not.toBe(
        BOOKING_COUNT_FORMS.en.rules[0].template
      )
      expect(EXPENSE_COUNT_FORMS[locale].rules[0].template).not.toBe(
        EXPENSE_COUNT_FORMS.en.rules[0].template
      )
    }
  })
})
