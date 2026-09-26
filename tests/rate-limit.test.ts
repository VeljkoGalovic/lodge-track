import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    organization: { findUnique: vi.fn(), create: vi.fn() },
    subscription: { findUnique: vi.fn(), create: vi.fn() },
    legalConsent: {
      create: vi.fn(),
    },
    rateLimit: {
      deleteMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))
vi.mock("server-only", () => ({}))
vi.mock("@/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }))
vi.mock("bcrypt", () => ({
  __esModule: true,
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockResolvedValue(true),
    genSalt: vi.fn().mockResolvedValue("salt"),
    genSaltSync: vi.fn().mockReturnValue("salt"),
    hashSync: vi.fn().mockReturnValue("hashed-password"),
    compareSync: vi.fn().mockReturnValue(true),
  },
  hash: vi.fn().mockResolvedValue("hashed-password"),
  compare: vi.fn().mockResolvedValue(true),
  genSalt: vi.fn().mockResolvedValue("salt"),
  genSaltSync: vi.fn().mockReturnValue("salt"),
  hashSync: vi.fn().mockReturnValue("hashed-password"),
  compareSync: vi.fn().mockReturnValue(true),
}))
vi.mock("@/lib/tokens", () => ({
  createVerificationToken: vi.fn().mockImplementation(() => Promise.resolve({ token: "test-token", expiresAt: new Date() })),
  verifyAndConsumeToken: vi.fn().mockResolvedValue("test@example.com"),
  invalidateUserTokens: vi.fn().mockResolvedValue(0),
}))
vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("next/headers", () => ({
  headers: () => ({
    get: (name: string) => {
      if (name === "x-forwarded-for") return "192.168.1.1"
      if (name === "x-real-ip") return "192.168.1.1"
      if (name === "user-agent") return "test-agent"
      return null
    },
  }),
}))

import { registerUser, sendPasswordReset, sendVerificationEmailAction } from "@/app/actions/auth"
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS, enforceRateLimit } from "@/lib/rate-limit"

const db = mocks.db

beforeEach(() => {
  vi.resetAllMocks()
  db.user.findUnique.mockResolvedValue(null) // No existing user
  db.user.create.mockResolvedValue({ id: "user-1", email: "new@example.com" })
  db.organization.findUnique.mockResolvedValue({ id: "org-1" })
  db.organization.create.mockResolvedValue({ id: "org-1", name: "Test Org" })
  db.subscription.findUnique.mockResolvedValue({ tier: "STARTER" })
  db.subscription.create.mockResolvedValue({})
  db.legalConsent.create.mockResolvedValue({})
  db.$transaction.mockImplementation(async (work) => work(db))
  db.rateLimit.deleteMany.mockResolvedValue({ count: 0 })
  db.rateLimit.count.mockResolvedValue(0)
  db.rateLimit.create.mockResolvedValue({})
})

describe("Rate limiting utilities", () => {
  it("getRateLimitIdentifier returns IP when available", () => {
    expect(getRateLimitIdentifier("192.168.1.1", "test@example.com")).toBe("192.168.1.1")
  })

  it("getRateLimitIdentifier falls back to email hash when no IP", () => {
    expect(getRateLimitIdentifier(null, "test@example.com")).toBe("email:test@example.com")
  })

  it("getRateLimitIdentifier handles unknown when neither provided", () => {
    expect(getRateLimitIdentifier(null)).toBe("unknown")
  })

  it("checkRateLimit allows requests under limit", async () => {
    db.rateLimit.deleteMany.mockResolvedValue({ count: 0 })
    db.rateLimit.count.mockResolvedValue(0)
    db.rateLimit.create.mockResolvedValue({})

    const result = await checkRateLimit("test-ip", RATE_LIMIT_CONFIGS.register)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4) // 5 max - 1 used
    expect(db.rateLimit.create).toHaveBeenCalledOnce()
  })

  it("checkRateLimit rejects requests over limit", async () => {
    db.rateLimit.deleteMany.mockResolvedValue({ count: 0 })
    db.rateLimit.count.mockResolvedValue(5) // At limit
    db.rateLimit.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    })

    const result = await checkRateLimit("test-ip", RATE_LIMIT_CONFIGS.register)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    expect(db.rateLimit.create).not.toHaveBeenCalled()
  })

  it("enforceRateLimit throws on rate limit exceeded", async () => {
    db.rateLimit.deleteMany.mockResolvedValue({ count: 0 })
    db.rateLimit.count.mockResolvedValue(5)
    db.rateLimit.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    })

    await expect(enforceRateLimit("test-ip", RATE_LIMIT_CONFIGS.register)).rejects.toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
    })
  })

  it("enforceRateLimit does not throw when under limit", async () => {
    db.rateLimit.deleteMany.mockResolvedValue({ count: 0 })
    db.rateLimit.count.mockResolvedValue(0)
    db.rateLimit.create.mockResolvedValue({})

    await expect(enforceRateLimit("test-ip", RATE_LIMIT_CONFIGS.register)).resolves.toBeUndefined()
  })
})

describe("Fix 2: Rate limiting on auth endpoints", () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    db.user.findUnique.mockResolvedValue(null) // No existing user
    db.user.create.mockResolvedValue({ id: "user-1", email: "new@example.com" })
    db.organization.findUnique.mockResolvedValue({ id: "org-1" })
    db.organization.create.mockResolvedValue({ id: "org-1", name: "Test Org" })
    db.subscription.findUnique.mockResolvedValue({ tier: "STARTER" })
    db.subscription.create.mockResolvedValue({})
    db.$transaction.mockImplementation(async (work) => work(db))
    db.rateLimit.deleteMany.mockResolvedValue({ count: 0 })
    db.rateLimit.count.mockResolvedValue(0)
    db.rateLimit.create.mockResolvedValue({})
    // Token functions - need to re-mock after vi.resetAllMocks()
    const { createVerificationToken } = await import("@/lib/tokens")
    vi.mocked(createVerificationToken).mockResolvedValue({ token: "test-token", expiresAt: new Date() })
  })

  it("registerUser allows registration under rate limit", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "password123")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")

    const result = await registerUser({}, formData)
    expect(result.success).toBeTruthy()
    expect(db.rateLimit.count).toHaveBeenCalled()
    expect(db.rateLimit.create).toHaveBeenCalled()
  })

  it("registerUser rejects when rate limit exceeded", async () => {
    db.rateLimit.count.mockResolvedValue(5) // At limit
    db.rateLimit.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    })

    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "password123")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")

    const result = await registerUser({}, formData)
    expect(result.error).toMatch(/Too many registration attempts/)
    // Should not proceed to create user
  })

  it("sendPasswordReset rate limits by email", async () => {
    db.user.findUnique.mockResolvedValue({ email: "test@example.com", passwordHash: "hashed" })

    const formData = new FormData()
    formData.set("email", "test@example.com")

    const result = await sendPasswordReset({}, formData)
    expect(result.success).toBeTruthy()
    expect(db.rateLimit.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          identifier: "email:test@example.com",
          action: "password_reset",
        }),
      })
    )
  })

  it("sendPasswordReset rejects when rate limit exceeded", async () => {
    db.rateLimit.count.mockResolvedValue(3) // At limit for password_reset (max 3)
    db.rateLimit.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    })

    const formData = new FormData()
    formData.set("email", "test@example.com")

    const result = await sendPasswordReset({}, formData)
    expect(result.error).toMatch(/Too many password reset requests/)
  })

  it("sendVerificationEmailAction rate limits by email", async () => {
    db.user.findUnique.mockResolvedValue({ email: "test@example.com", emailVerified: null })

    const result = await sendVerificationEmailAction("test@example.com")
    expect(result.success).toBe(true)
    expect(db.rateLimit.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          identifier: "email:test@example.com",
          action: "email_verification",
        }),
      })
    )
  })

  it("sendVerificationEmailAction rejects when rate limit exceeded", async () => {
    db.rateLimit.count.mockResolvedValue(3) // At limit for email_verification (max 3)
    db.rateLimit.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    })

    const result = await sendVerificationEmailAction("test@example.com")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Too many verification email requests/)
  })
})