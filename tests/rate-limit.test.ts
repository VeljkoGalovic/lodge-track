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
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
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
    // Email functions - need to re-mock after vi.resetAllMocks()
    const { sendVerificationEmail, sendPasswordResetEmail } = await import("@/lib/email")
    vi.mocked(sendVerificationEmail).mockResolvedValue({ success: true })
    vi.mocked(sendPasswordResetEmail).mockResolvedValue({ success: true })
  })

  it("registerUser allows registration under rate limit", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "ValidPass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")

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
    formData.set("password", "ValidPass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")

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

describe("registerUser with onboarding preferences", () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    db.user.findUnique.mockResolvedValue(null)
    db.user.create.mockResolvedValue({ id: "user-1", email: "new@example.com", locale: "en", theme: "SYSTEM" })
    db.organization.findUnique.mockResolvedValue({ id: "org-1" })
    db.organization.create.mockResolvedValue({ id: "org-1", name: "Test Org", currency: "USD" })
    db.subscription.findUnique.mockResolvedValue({ tier: "STARTER" })
    db.subscription.create.mockResolvedValue({})
    db.legalConsent.create.mockResolvedValue({})
    db.$transaction.mockImplementation(async (work) => work(db))
    db.rateLimit.deleteMany.mockResolvedValue({ count: 0 })
    db.rateLimit.count.mockResolvedValue(0)
    db.rateLimit.create.mockResolvedValue({})
    const { createVerificationToken } = await import("@/lib/tokens")
    vi.mocked(createVerificationToken).mockResolvedValue({ token: "test-token", expiresAt: new Date() })
    // Email functions - need to re-mock after vi.resetAllMocks()
    const { sendVerificationEmail, sendPasswordResetEmail } = await import("@/lib/email")
    vi.mocked(sendVerificationEmail).mockResolvedValue({ success: true })
    vi.mocked(sendPasswordResetEmail).mockResolvedValue({ success: true })
  })

  it("registerUser accepts locale, theme, and currency preferences", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "SecurePass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")
    formData.set("locale", "sr")
    formData.set("theme", "DARK")
    formData.set("currency", "EUR")

    const result = await registerUser({}, formData)
    expect(result.success).toBeTruthy()

    // Verify user created with locale and theme
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locale: "sr",
          theme: "DARK",
        }),
      })
    )

    // Verify organization created with currency
    expect(db.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currency: "EUR",
        }),
      })
    )
  })

  it("registerUser uses defaults when preferences not provided", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "SecurePass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")
    // No locale, theme, currency provided

    const result = await registerUser({}, formData)
    expect(result.success).toBeTruthy()

    // Verify defaults used
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locale: "en",
          theme: "SYSTEM",
        }),
      })
    )

    expect(db.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currency: "USD",
        }),
      })
    )
  })

  it("registerUser rejects invalid password with detailed errors", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "weak") // Too short, no uppercase, no number, no special char
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")
    formData.set("locale", "en")
    formData.set("theme", "SYSTEM")
    formData.set("currency", "USD")

    const result = await registerUser({}, formData)
    expect(result.error).toBeTruthy()
    expect(result.error).toContain("At least 8 characters")
    expect(result.error).toContain("One uppercase letter")
    expect(result.error).toContain("One number")
    expect(result.error).toContain("One special character")

    // Should not proceed to create user
    expect(db.user.create).not.toHaveBeenCalled()
  })

  it("registerUser accepts valid password meeting all requirements", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "ValidPass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")
    formData.set("locale", "en")
    formData.set("theme", "SYSTEM")
    formData.set("currency", "USD")

    const result = await registerUser({}, formData)
    expect(result.success).toBeTruthy()
    expect(db.user.create).toHaveBeenCalled()
  })

  it("registerUser validates locale against supported locales", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "ValidPass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")
    formData.set("locale", "invalid") // Invalid locale
    formData.set("theme", "SYSTEM")
    formData.set("currency", "USD")

    const result = await registerUser({}, formData)
    expect(result.success).toBeTruthy()

    // Should fall back to default "en"
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locale: "en",
        }),
      })
    )
  })

  it("registerUser validates theme against supported themes", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "ValidPass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")
    formData.set("locale", "en")
    formData.set("theme", "INVALID") // Invalid theme
    formData.set("currency", "USD")

    const result = await registerUser({}, formData)
    expect(result.success).toBeTruthy()

    // Should fall back to default "SYSTEM"
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          theme: "SYSTEM",
        }),
      })
    )
  })

  it("registerUser validates currency against supported currencies", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "ValidPass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")
    formData.set("locale", "en")
    formData.set("theme", "SYSTEM")
    formData.set("currency", "INVALID") // Invalid currency

    const result = await registerUser({}, formData)
    expect(result.success).toBeTruthy()

    // Should fall back to default "USD"
    expect(db.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currency: "USD",
        }),
      })
    )
  })

  it("registerUser normalizes currency code to uppercase", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "ValidPass123!")
    formData.set("name", "Test User")
    formData.set("termsAccepted", "on")
    formData.set("isOver18", "on")
    formData.set("locale", "en")
    formData.set("theme", "SYSTEM")
    formData.set("currency", "eur") // lowercase

    const result = await registerUser({}, formData)
    expect(result.success).toBeTruthy()

    // Should normalize to uppercase - check the call arguments
    expect(db.organization.create).toHaveBeenCalled()
    const callArgs = db.organization.create.mock.calls[0][0]
    expect(callArgs.data.currency).toBe("EUR")
  })

  it("registerUser requires terms acceptance", async () => {
    const formData = new FormData()
    formData.set("email", "new@example.com")
    formData.set("password", "ValidPass123!")
    formData.set("name", "Test User")
    formData.set("isOver18", "on")
    // termsAccepted not set
    formData.set("locale", "en")
    formData.set("theme", "SYSTEM")
    formData.set("currency", "USD")

    const result = await registerUser({}, formData)
    expect(result.error).toBe("You must accept the Terms of Service and Privacy Policy to register.")
    expect(db.user.create).not.toHaveBeenCalled()
  })
})