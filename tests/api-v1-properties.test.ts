import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// Mock prisma and api-auth - use hoisted mocks to avoid hoisting issues
const mockGetOrgFeatures = vi.hoisted(() => vi.fn())
const mockPrismaApiKeyFindUnique = vi.hoisted(() => vi.fn())
const mockPrismaApiKeyUpdate = vi.hoisted(() => vi.fn())
const mockPrismaPropertyFindMany = vi.hoisted(() => vi.fn())
const mockVerifyApiKey = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findUnique: mockPrismaApiKeyFindUnique,
      update: mockPrismaApiKeyUpdate,
    },
    property: { findMany: mockPrismaPropertyFindMany },
    rateLimit: {
      deleteMany: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({}),
    },
  }
}))

vi.mock("@/lib/crypto", () => ({
  verifyApiKey: mockVerifyApiKey,
}))

vi.mock("@/lib/subscriptions", () => ({
  getOrgFeatures: mockGetOrgFeatures,
}))

import { GET } from "@/app/api/v1/properties/route"
import { prisma } from "@/lib/prisma"

describe("API v1 - Properties endpoint", () => {
  const orgId = "org-test-123"
  const apiKeyPrefix = "lt_test_abcdef"

  const mockApiKey = {
    id: "key-123",
    keyPrefix: apiKeyPrefix,
    keyHash: "hashed-key",
    name: "Test Key",
    organizationId: orgId,
    revokedAt: null,
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date("2026-01-01"),
    organization: {
      id: orgId,
      subscription: { tier: "BUSINESS" },
    },
  }

  const mockProperties = [
    {
      id: "prop-1",
      name: "Property 1",
      address: "123 Main St",
      currency: "USD",
      icalUrl: null,
      allowSharedBookings: false,
      orgId,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      _count: { units: 5, bookings: 10 },
    },
    {
      id: "prop-2",
      name: "Property 2",
      address: "456 Oak Ave",
      currency: "EUR",
      icalUrl: null,
      allowSharedBookings: true,
      orgId,
      createdAt: new Date("2026-02-01"),
      updatedAt: new Date("2026-02-01"),
      _count: { units: 3, bookings: 7 },
    },
  ]

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("NODE_ENV", "test")
    // Default: valid API key, key verification passes
    mockVerifyApiKey.mockReturnValue(true)
    mockPrismaApiKeyUpdate.mockResolvedValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const makeRequest = (headers: Record<string, string> = {}) => new NextRequest("http://localhost/api/v1/properties", {
    method: "GET",
    headers: {
      "Authorization": `Bearer lt_test_abcdef12345678901234567890`,
      ...headers,
    },
  })

  it("returns 401 when Authorization header is missing", async () => {
    const request = new NextRequest("http://localhost/api/v1/properties", { method: "GET" })

    const response = await GET(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
  })

  it("returns 401 when Authorization header is not Bearer", async () => {
    const request = new NextRequest("http://localhost/api/v1/properties", {
      method: "GET",
      headers: { "Authorization": "Basic dXNlcjpwYXNz" },
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
  })

  it("returns 401 when API key is not found", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(null)

    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
    expect(json.message).toBe("Invalid API key")
  })

  it("returns 401 when API key is revoked", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue({
      ...mockApiKey,
      revokedAt: new Date("2026-01-01"),
    })

    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
    expect(json.message).toBe("API key has been revoked")
  })

  it("returns 401 when API key is expired", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue({
      ...mockApiKey,
      expiresAt: new Date("2025-01-01"), // expired
    })

    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
    expect(json.message).toBe("API key has expired")
  })

  it("returns 401 when API key verification fails", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockVerifyApiKey.mockReturnValue(false)

    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
    expect(json.message).toBe("Invalid API key")
  })

  it("returns 403 for STARTER tier (no API access)", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue({
      ...mockApiKey,
      organization: { id: orgId, subscription: { tier: "STARTER" } },
    })
    mockGetOrgFeatures.mockReturnValue({
      tier: "STARTER",
      maxProperties: 3,
      maxStorageBytes: 1_000_000_000,
      hasAdvancedAnalytics: false,
      hasTeamRoles: false,
      hasApiAccess: false,
    })

    const response = await GET(makeRequest())
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe("forbidden")
    expect(json.message).toBe("API access requires Business tier or higher")
    expect(json.currentTier).toBe("STARTER")
  })

  it("returns 403 for PRO tier (no API access by default)", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue({
      ...mockApiKey,
      organization: { id: orgId, subscription: { tier: "PRO" } },
    })
    mockGetOrgFeatures.mockReturnValue({
      tier: "PRO",
      maxProperties: 15,
      maxStorageBytes: 5_000_000_000,
      hasAdvancedAnalytics: true,
      hasTeamRoles: false,
      hasApiAccess: false,
    })

    const response = await GET(makeRequest())
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe("forbidden")
    expect(json.message).toBe("API access requires Business tier or higher")
    expect(json.currentTier).toBe("PRO")
  })

  it("returns 200 and properties for BUSINESS tier with API access", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindMany.mockResolvedValue(mockProperties)

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.properties).toHaveLength(2)
    expect(json.properties[0].id).toBe("prop-1")
    expect(json.properties[1].id).toBe("prop-2")
    expect(prisma.property.findMany).toHaveBeenCalledWith({
      where: { orgId },
      select: {
        id: true,
        name: true,
        address: true,
        currency: true,
        allowSharedBookings: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { units: true, bookings: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 21,
    })
  })

  it("returns 200 and properties for PRO tier with hasApiAccessOverride", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue({
      ...mockApiKey,
      organization: { id: orgId, subscription: { tier: "PRO", hasApiAccessOverride: true } },
    })
    mockGetOrgFeatures.mockReturnValue({
      tier: "PRO",
      maxProperties: 15,
      maxStorageBytes: 5_000_000_000,
      hasAdvancedAnalytics: true,
      hasTeamRoles: false,
      hasApiAccess: true, // Override enabled
    })
    mockPrismaPropertyFindMany.mockResolvedValue(mockProperties)

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.properties).toHaveLength(2)
  })

  it("returns 200 and properties for STARTER tier with hasApiAccessOverride", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue({
      ...mockApiKey,
      organization: { id: orgId, subscription: { tier: "STARTER", hasApiAccessOverride: true } },
    })
    mockGetOrgFeatures.mockReturnValue({
      tier: "STARTER",
      maxProperties: 3,
      maxStorageBytes: 1_000_000_000,
      hasAdvancedAnalytics: false,
      hasTeamRoles: false,
      hasApiAccess: true, // Override enabled
    })
    mockPrismaPropertyFindMany.mockResolvedValue(mockProperties)

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.properties).toHaveLength(2)
  })

  it("returns empty array when organization has no properties", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindMany.mockResolvedValue([])

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.properties).toEqual([])
  })

  it("updates lastUsedAt when API key is valid", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindMany.mockResolvedValue([])

    await GET(makeRequest())
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: mockApiKey.id },
      data: { lastUsedAt: expect.any(Date) },
    })
  })

  it("supports cursor-based pagination", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindMany.mockResolvedValue(mockProperties)

    const request = new NextRequest("http://localhost/api/v1/properties?cursor=prop-1&limit=1", {
      method: "GET",
      headers: { "Authorization": `Bearer lt_test_abcdef12345678901234567890` },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.nextCursor).toBeDefined()
  })

  it("supports search parameter", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindMany.mockResolvedValue([mockProperties[0]])

    const request = new NextRequest("http://localhost/api/v1/properties?search=Property%201", {
      method: "GET",
      headers: { "Authorization": `Bearer lt_test_abcdef12345678901234567890` },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.properties).toHaveLength(1)
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId,
          OR: expect.arrayContaining([
            expect.objectContaining({ name: expect.objectContaining({ contains: "Property 1", mode: "insensitive" }) }),
          ]),
        }),
      })
    )
  })

  it("supports sort parameter", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindMany.mockResolvedValue(mockProperties)

    const request = new NextRequest("http://localhost/api/v1/properties?sort=name&order=asc", {
      method: "GET",
      headers: { "Authorization": `Bearer lt_test_abcdef12345678901234567890` },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: "asc" },
      })
    )
  })
})