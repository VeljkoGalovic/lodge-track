import { describe, expect, it } from "vitest"
import { generateApiKey, verifyApiKey, generateToken } from "@/lib/crypto"

describe("generateToken", () => {
  it("returns a URL-safe base64 string", () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/) // 32 bytes = 43 chars base64url
  })

  it("generates unique tokens", () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken())
    }
    expect(tokens.size).toBe(100)
  })
})

describe("generateApiKey", () => {
  it("generates live key with correct prefix", () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey(true)
    expect(rawKey).toMatch(/^lt_live_[A-Za-z0-9_-]{32}$/)
    expect(keyPrefix).toMatch(/^lt_live_[A-Za-z0-9_-]{8}$/) // First 16 chars: "lt_live_" + 8 random chars
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex
  })

  it("generates test key with correct prefix", () => {
    const { rawKey, keyHash, keyPrefix } = generateApiKey(false)
    expect(rawKey).toMatch(/^lt_test_[A-Za-z0-9_-]{32}$/)
    expect(keyPrefix).toMatch(/^lt_test_[A-Za-z0-9_-]{8}$/) // First 16 chars: "lt_test_" + 8 random chars
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("generates unique keys each call", () => {
    const keys = new Set<string>()
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey(true).rawKey)
    }
    expect(keys.size).toBe(100)
  })

  it("returns different keys for live vs test", () => {
    const live = generateApiKey(true)
    const test = generateApiKey(false)
    expect(live.rawKey).not.toBe(test.rawKey)
    expect(live.keyPrefix).not.toBe(test.keyPrefix)
  })
})

describe("verifyApiKey", () => {
  it("returns true for matching key and hash", () => {
    const { rawKey, keyHash } = generateApiKey(true)
    expect(verifyApiKey(rawKey, keyHash)).toBe(true)
  })

  it("returns false for wrong key", () => {
    const { keyHash } = generateApiKey(true)
    expect(verifyApiKey("lt_live_wrongkey", keyHash)).toBe(false)
  })

  it("returns false for empty key", () => {
    const { keyHash } = generateApiKey(true)
    expect(verifyApiKey("", keyHash)).toBe(false)
  })

  it("returns false for tampered key", () => {
    const { rawKey, keyHash } = generateApiKey(true)
    expect(verifyApiKey(rawKey + "x", keyHash)).toBe(false)
  })

  it("is case-sensitive", () => {
    const { rawKey, keyHash } = generateApiKey(true)
    expect(verifyApiKey(rawKey.toUpperCase(), keyHash)).toBe(false)
  })
})