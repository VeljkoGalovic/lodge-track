import { describe, expect, it } from "vitest"
import { canonicalizeEmail } from "@/lib/email"

/**
 * Email alias collapse.
 *
 * Providers ignore characters the RFC says are significant: Google drops dots
 * and accepts googlemail.com as gmail.com, plus tags (+) route to the tagless
 * address on every major provider, and case folds. LodgeTrack stores and
 * looks up only the canonical form, so `name.surname@gmail.com` and
 * `namesurname@gmail.com` are one account.
 *
 * What must NOT collapse: dots on non-Google domains (Outlook honours them),
 * the domain itself, and anything structural (no @, empty local part, a local
 * part that is nothing but a plus tag or a dot run).
 *
 * Every case is identity-shaped: canonicalising a canonical value is a no-op,
 * which is what lets the same function run on stored values and fresh input.
 */
describe("canonicalizeEmail", () => {
  it("collapses Gmail dot spellings to one address", () => {
    expect(canonicalizeEmail("name.surname@gmail.com")).toBe("namesurname@gmail.com")
    expect(canonicalizeEmail("n.a.m.e.s.u.r.n.a.m.e@gmail.com")).toBe("namesurname@gmail.com")
    expect(canonicalizeEmail("namesurname@gmail.com")).toBe("namesurname@gmail.com")
    expect(canonicalizeEmail("namesurname@gmail.com")).toBe(canonicalizeEmail("name.surname@gmail.com"))
  })

  it("spells googlemail.com onto gmail.com, then drops the dots", () => {
    expect(canonicalizeEmail("a.b@googlemail.com")).toBe("ab@gmail.com")
    expect(canonicalizeEmail("ab@googlemail.com")).toBe("ab@gmail.com")
  })

  it("keeps dots on domains Google does not own", () => {
    expect(canonicalizeEmail("name.surname@outlook.com")).toBe("name.surname@outlook.com")
    expect(canonicalizeEmail("name.surname@company.co.uk")).toBe("name.surname@company.co.uk")
  })

  it("strips plus tags on every domain", () => {
    expect(canonicalizeEmail("user+tag@gmail.com")).toBe("user@gmail.com")
    expect(canonicalizeEmail("user+quarterly@outlook.com")).toBe("user@outlook.com")
    expect(canonicalizeEmail("user+campaign+bold@fastmail.com")).toBe("user@fastmail.com")
    // Plus tag on a dotted Gmail form: both neutralise.
    expect(canonicalizeEmail("us.er+tag@gmail.com")).toBe("user@gmail.com")
  })

  it("folds case and surrounding whitespace", () => {
    expect(canonicalizeEmail("  User.Name@GMAIL.COM ")).toBe("username@gmail.com")
    expect(canonicalizeEmail("Nine@Example.COM")).toBe("nine@example.com")
  })

  it("is idempotent", () => {
    const once = canonicalizeEmail("Na.Me+S@googlemail.com")
    expect(once).not.toBeNull()
    expect(canonicalizeEmail(once as string)).toBe(once)
  })

  it("rejects the unrepresentable", () => {
    expect(canonicalizeEmail("")).toBeNull()
    expect(canonicalizeEmail("   ")).toBeNull()
    expect(canonicalizeEmail("no-at-sign")).toBeNull()
    expect(canonicalizeEmail("two@at@signs.com")).toBeNull()
    expect(canonicalizeEmail("@gmail.com")).toBeNull()
    expect(canonicalizeEmail("user@")).toBeNull()
    // Tags pointing at nothing: the local part was only the tag or dots.
    expect(canonicalizeEmail("+tag@gmail.com")).toBeNull()
    expect(canonicalizeEmail("+tag@outlook.com")).toBeNull()
    expect(canonicalizeEmail("...@gmail.com")).toBeNull()
  })

  it("absorbs a real-world alias set", () => {
    const forms = [
      "veljkogalovic@gmail.com",
      "veljko.galovic@gmail.com",
      "veljko.galovic+lists@gmail.com",
      "VeljkoGalovic@googlemail.com",
    ]
    expect(new Set(forms.map(canonicalizeEmail)).size).toBe(1)
  })
})
