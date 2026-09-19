import { describe, expect, it, vi } from "vitest"
vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }))
import { convertAmount } from "@/lib/exchange-rates"

describe("minor-unit currency conversion", () => {
  const rates = { USD: 1, EUR: 0.92, JPY: 150, RSD: 108 }
  it("keeps amounts unchanged in the same currency", () => {
    expect(convertAmount(12345, "USD", "USD", rates)).toBe(12345)
  })
  it("accounts for zero-decimal currencies in both directions", () => {
    expect(convertAmount(100, "USD", "JPY", rates)).toBe(150)
    expect(convertAmount(150, "JPY", "USD", rates)).toBe(100)
  })
  it("converts through the common base rate, rounding only at the end", () => {
    expect(convertAmount(9200, "EUR", "RSD", rates)).toBe(1080000)
    expect(convertAmount(1, "USD", "EUR", rates)).toBe(1)
  })
  it("rounds exact half-minor-unit boundaries without float drift", () => {
    expect(convertAmount(100, "USD", "EUR", { USD: 1, EUR: 1.005 })).toBe(101)
  })
  it("rejects non-integer amounts and unusable rates rather than inventing money", () => {
    expect(() => convertAmount(1.5, "USD", "EUR", rates)).toThrow()
    for (const bad of [0, -1, NaN, Infinity]) {
      expect(() => convertAmount(100, "USD", "EUR", { USD: 1, EUR: bad })).toThrow()
    }
    expect(() => convertAmount(100, "USD", "EUR", {})).toThrow()
  })
})
