import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

const db = vi.hoisted(() => ({
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))
import { auth } from "@/auth"
import { verifyApiKeyAuth, verifyAnyAuth, verifyApiAccess } from "@/lib/api-auth"
import { generateApiKey } from "@/lib/crypto"

const mockAuth = auth as vi.Mock

function makeRequest(authHeader?: string, url = "http://localhost/api/v1/test") {
  const headers: Record<string, string> = {}
  if (authHeader) headers.authorization = authHeader
  return new NextRequest(url, { headers })
}

describe("verifyApiKeyAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("AUTH_SECRET", "test-secret")
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("rejects missing Authorization header", async () => {
    const result = await verifyApiKeyAuth(makeRequest())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it("rejects non-Bearer Authorization header", async () => {
    const result = await verifyApiKeyAuth(makeRequest("Basic dXNlcjpwYXNz"))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it("rejects unknown key prefix", async () => {
    db.apiKey.findUnique.mockResolvedValue(null)
    const result = await verifyApiKeyAuth(makeRequest("Bearer lt_live_unknown123"))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it("rejects revoked key", async () => {
    const { keyHash, keyPrefix, rawKey } = generateApiKey(true)
    db.apiKey.findUnique.mockResolvedValue({
      keyHash,
      keyPrefix,
      revokedAt: new Date(),
      expiresAt: null,
      organization: { id: "org-1", subscription: { tier: "PRO" } },
    })
    const result = await verifyApiKeyAuth(makeRequest(`Bearer ${rawKey}`))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it("rejects expired key", async () => {
    const { keyHash, keyPrefix, rawKey } = generateApiKey(true)
    db.apiKey.findUnique.mockResolvedValue({
      keyHash,
      keyPrefix,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      organization: { id: "org-1", subscription: { tier: "PRO" } },
    })
    const result = await verifyApiKeyAuth(makeRequest(`Bearer ${rawKey}`))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it("rejects wrong key hash", async () => {
    const { keyHash, keyPrefix } = generateApiKey(true)
    db.apiKey.findUnique.mockResolvedValue({
      keyHash,
      keyPrefix,
      revokedAt: null,
      expiresAt: null,
      organization: { id: "org-1", subscription: { tier: "PRO" } },
    })
    const result = await verifyApiKeyAuth(makeRequest("Bearer lt_live_wrongkey123"))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it("rejects org without API access", async () => {
    const { keyHash, keyPrefix, rawKey } = generateApiKey(true)
    db.apiKey.findUnique.mockResolvedValue({
      keyHash,
      keyPrefix,
      revokedAt: null,
      expiresAt: null,
      organization: { id: "org-1", subscription: { tier: "STARTER" } },
    })
    const result = await verifyApiKeyAuth(makeRequest(`Bearer ${rawKey}`))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(403)
      const json = await result.response.json()
      expect(json.error).toBe("forbidden")
    }
  })

  it("accepts valid key for PRO tier", async () => {
    const { keyHash, keyPrefix, rawKey } = generateApiKey(true)
    db.apiKey.findUnique.mockResolvedValue({
      id: "key-1",
      keyHash,
      keyPrefix,
      revokedAt: null,
      expiresAt: null,
      organization: { id: "org-1", subscription: { tier: "PRO" } },
    })
    db.apiKey.update.mockResolvedValue({})
    const result = await verifyApiKeyAuth(makeRequest(`Bearer ${rawKey}`))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.organization.id).toBe("org-1")
    }
    expect(db.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key-1" },
        data: { lastUsedAt: expect.any(Date) },
      })
    )
  })

  it("accepts valid key for ENTERPRISE tier", async () => {
    const { keyHash, keyPrefix, rawKey } = generateApiKey(true)
    db.apiKey.findUnique.mockResolvedValue({
      keyHash,
      keyPrefix,
      revokedAt: null,
      expiresAt: null,
      organization: { id: "org-1", subscription: { tier: "ENTERPRISE" } },
    })
    db.apiKey.update.mockResolvedValue({})
    const result = await verifyApiKeyAuth(makeRequest(`Bearer ${rawKey}`))
    expect(result.ok).toBe(true)
  })

  it("accepts test key", async () => {
    const { keyHash, keyPrefix, rawKey } = generateApiKey(false)
    db.apiKey.findUnique.mockResolvedValue({
      keyHash,
      keyPrefix,
      revokedAt: null,
      expiresAt: null,
      organization: { id: "org-1", subscription: { tier: "PRO" } },
    })
    db.apiKey.update.mockResolvedValue({})
    const result = await verifyApiKeyAuth(makeRequest(`Bearer ${rawKey}`))
    expect(result.ok).toBe(true)
  })
})

describe("verifyApiAccess (session auth)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("AUTH_SECRET", "test-secret")
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("rejects unauthenticated user", async () => {
    mockAuth.mockResolvedValue({ user: null })
    const result = await verifyApiAccess(makeRequest())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it("rejects user without organization", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({ id: "user-1", email: "test@example.com", orgId: "org-1", organization: null })
    const result = await verifyApiAccess(makeRequest())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(404)
  })

  it("rejects STARTER tier", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      orgId: "org-1",
      organization: { id: "org-1", subscription: { tier: "STARTER" } },
    })
    const result = await verifyApiAccess(makeRequest())
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(403)
      const json = await result.response.json()
      expect(json.error).toBe("forbidden")
    }
  })

  it("accepts PRO tier", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      orgId: "org-1",
      organization: { id: "org-1", subscription: { tier: "PRO" } },
    })
    const result = await verifyApiAccess(makeRequest())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.membership.user.id).toBe("user-1")
      expect(result.membership.organization.id).toBe("org-1")
    }
  })

  it("accepts ENTERPRISE tier", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      orgId: "org-1",
      organization: { id: "org-1", subscription: { tier: "ENTERPRISE" } },
    })
    const result = await verifyApiAccess(makeRequest())
    expect(result.ok).toBe(true)
  })

  it("accepts STARTER with hasApiAccessOverride true", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      orgId: "org-1",
      organization: { id: "org-1", subscription: { tier: "STARTER", hasApiAccessOverride: true } },
    })
    const result = await verifyApiAccess(makeRequest())
    expect(result.ok).toBe(true)
  })
})

describe("verifyAnyAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("AUTH_SECRET", "test-secret")
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("prefers API key auth over session auth", async () => {
    mockAuth.mockResolvedValue({ user: { email: "session@example.com" } })
    const { keyHash, keyPrefix, rawKey } = generateApiKey(true)
    db.apiKey.findUnique.mockResolvedValue({
      keyHash,
      keyPrefix,
      revokedAt: null,
      expiresAt: null,
      organization: { id: "org-from-key", subscription: { tier: "PRO" } },
    })
    db.apiKey.update.mockResolvedValue({})

    const result = await verifyAnyAuth(makeRequest(`Bearer ${rawKey}`))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.membership.organization.id).toBe("org-from-key")
    }
    // Session auth should not be called since API key succeeded
    expect(mockAuth).not.toHaveBeenCalled()
  })

  it("falls back to session auth when API key fails", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      orgId: "org-1",
      organization: { id: "org-1", subscription: { tier: "PRO" } },
    })
    db.apiKey.findUnique.mockResolvedValue(null)

    const result = await verifyAnyAuth(makeRequest("Bearer invalid"))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.membership.organization.id).toBe("org-1")
    }
  })

  it("returns error when both auth methods fail", async () => {
    mockAuth.mockResolvedValue({ user: null })
    db.apiKey.findUnique.mockResolvedValue(null)

    const result = await verifyAnyAuth(makeRequest())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })
})