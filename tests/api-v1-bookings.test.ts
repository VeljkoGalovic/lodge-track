import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// Mock prisma and api-auth - use hoisted mocks to avoid hoisting issues
const mockGetOrgFeatures = vi.hoisted(() => vi.fn())
const mockPrismaApiKeyFindUnique = vi.hoisted(() => vi.fn())
const mockPrismaApiKeyUpdate = vi.hoisted(() => vi.fn())
const mockPrismaBookingFindMany = vi.hoisted(() => vi.fn())
const mockPrismaBookingFindFirst = vi.hoisted(() => vi.fn())
const mockPrismaBookingFindUnique = vi.hoisted(() => vi.fn())
const mockPrismaBookingCreate = vi.hoisted(() => vi.fn())
const mockPrismaBookingUpdate = vi.hoisted(() => vi.fn())
const mockPrismaBookingDeleteMany = vi.hoisted(() => vi.fn())
const mockPrismaPropertyFindFirst = vi.hoisted(() => vi.fn())
const mockPrismaPropertyUnitFindMany = vi.hoisted(() => vi.fn())
const mockPrismaPropertyUnitFindFirst = vi.hoisted(() => vi.fn())
const mockVerifyApiKey = vi.hoisted(() => vi.fn())
const mockFindConflicts = vi.hoisted(() => vi.fn())

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
    booking: {
      findMany: mockPrismaBookingFindMany,
      findFirst: mockPrismaBookingFindFirst,
      findUnique: mockPrismaBookingFindUnique,
      create: mockPrismaBookingCreate,
      update: mockPrismaBookingUpdate,
      deleteMany: mockPrismaBookingDeleteMany,
    },
    property: {
      findFirst: mockPrismaPropertyFindFirst,
    },
    propertyUnit: {
      findMany: mockPrismaPropertyUnitFindMany,
      findFirst: mockPrismaPropertyUnitFindFirst,
    },
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

vi.mock("@/lib/availability", () => ({
  findConflicts: mockFindConflicts,
  rangesOverlap: vi.fn(),
}))

import { GET as GET_BOOKINGS } from "@/app/api/v1/bookings/route"
import { GET as GET_BOOKING, PATCH as PATCH_BOOKING, DELETE as DELETE_BOOKING } from "@/app/api/v1/bookings/[id]/route"
import { POST as POST_BOOKING } from "@/app/api/v1/bookings/route"
import { prisma } from "@/lib/prisma"

describe("API v1 - Bookings endpoint", () => {
  const orgId = "org-test-123"
  const apiKeyPrefix = "lt_test_abcdef"
  const propertyId = "prop-123"
  const unitId = "unit-123"

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

  const mockProperty = {
    id: propertyId,
    name: "Test Property",
    address: "123 Main St",
    currency: "USD",
    icalUrl: null,
    allowSharedBookings: true,
    orgId,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  }

  const mockUnit = {
    id: unitId,
    propertyId,
    name: "Room 1",
    kind: "WholeUnit",
    orgId,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  }

  const mockBooking = {
    id: "booking-123",
    propertyId,
    unitId,
    type: "WHOLE_UNIT",
    bedIds: [],
    guestName: "John Doe",
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-06-05"),
    source: "Direct",
    status: "PENDING",
    totalAmount: 50000,
    externalUid: "ext-123",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    property: {
      id: propertyId,
      name: "Test Property",
      address: "123 Main St",
      currency: "USD",
      allowSharedBookings: true,
      orgId,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    unit: {
      id: unitId,
      propertyId,
      name: "Room 1",
      kind: "WholeUnit",
      orgId,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
  }

  const mockBookingWithConflicts = [
    {
      id: "booking-conflict",
      propertyId,
      unitId,
      type: "WHOLE_UNIT",
      bedIds: [],
      guestName: "Jane Smith",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-05"),
      source: "Direct",
      status: "CONFIRMED",
      totalAmount: 50000,
      externalUid: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      unit: { name: "Room 1" },
    },
  ]

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("NODE_ENV", "test")
    // Default: valid API key, key verification passes
    mockVerifyApiKey.mockReturnValue(true)
    mockPrismaApiKeyUpdate.mockResolvedValue({})
    // Default: no conflicts
    mockFindConflicts.mockReturnValue([])
    // Default: property allows shared bookings
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    // Default: property unit lookup succeeds
    mockPrismaPropertyUnitFindFirst.mockResolvedValue({ id: unitId, propertyId, kind: "Bed" })
    mockPrismaPropertyUnitFindMany.mockResolvedValue([{ id: "bed-1", propertyId, kind: "Bed" }])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const makeRequest = (url: string, options: RequestInit = {}) => {
    return new NextRequest(url, {
      ...options,
      headers: {
        "Authorization": `Bearer lt_test_abcdef12345678901234567890`,
        ...options.headers,
      },
    })
  }

  // ========== AUTH TESTS ==========

  it("returns 401 when Authorization header is missing (GET list)", async () => {
    const request = new NextRequest("http://localhost/api/v1/bookings", { method: "GET" })
    const response = await GET_BOOKINGS(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
  })

  it("returns 401 when Authorization header is not Bearer", async () => {
    const request = new NextRequest("http://localhost/api/v1/bookings", {
      method: "GET",
      headers: { "Authorization": "Basic dXNlcjpwYXNz" },
    })
    const response = await GET_BOOKINGS(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
  })

  it("returns 401 when API key is not found", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(null)
    const response = await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
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
    const response = await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
    expect(json.message).toBe("API key has been revoked")
  })

  it("returns 401 when API key is expired", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue({
      ...mockApiKey,
      expiresAt: new Date("2025-01-01"),
    })
    const response = await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
    expect(json.message).toBe("API key has expired")
  })

  it("returns 401 when API key verification fails", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockVerifyApiKey.mockReturnValue(false)
    const response = await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
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
    const response = await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
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
    const response = await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe("forbidden")
    expect(json.currentTier).toBe("PRO")
  })

  it("returns 200 for BUSINESS tier with API access", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindMany.mockResolvedValue([])

    const response = await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.bookings).toEqual([])
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
    mockPrismaBookingFindMany.mockResolvedValue([])

    await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: mockApiKey.id },
      data: { lastUsedAt: expect.any(Date) },
    })
  })

  // ========== GET LIST TESTS ==========

  it("returns paginated bookings with cursor", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    const bookings = [
      { ...mockBooking, id: "booking-1" },
      { ...mockBooking, id: "booking-2" },
    ]
    mockPrismaBookingFindMany.mockResolvedValue(bookings)

    const request = makeRequest("http://localhost/api/v1/bookings?limit=1")
    const response = await GET_BOOKINGS(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.bookings).toHaveLength(1)
    // The implementation takes the last item as the cursor (booking-2 gets popped and becomes cursor)
    expect(json.nextCursor).toBe("booking-2")
  })

  it("filters by propertyId", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindMany.mockResolvedValue([])

    await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings?propertyId=prop-123"))
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          property: { orgId },
          propertyId: "prop-123",
        }),
      })
    )
  })

  it("filters by unitId", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindMany.mockResolvedValue([])

    await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings?unitId=unit-123"))
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          property: { orgId },
          unitId: "unit-123",
        }),
      })
    )
  })

  it("filters by status", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindMany.mockResolvedValue([])

    await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings?status=CONFIRMED"))
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          property: { orgId },
          status: "CONFIRMED",
        }),
      })
    )
  })

  it("filters by date range", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindMany.mockResolvedValue([])

    await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings?startDate=2026-06-01&endDate=2026-06-10"))
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          property: { orgId },
          startDate: { gte: new Date("2026-06-01") },
          endDate: { lte: new Date("2026-06-10") },
        }),
      })
    )
  })

  it("filters by search (guestName)", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindMany.mockResolvedValue([mockBooking])

    const response = await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings?search=John"))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.bookings).toHaveLength(1)
  })

  it("sorts by startDate descending by default", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindMany.mockResolvedValue([])

    await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings"))
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { startDate: "desc" },
      })
    )
  })

  it("supports custom sort and order", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindMany.mockResolvedValue([])

    await GET_BOOKINGS(makeRequest("http://localhost/api/v1/bookings?sort=guestName&order=asc"))
    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { guestName: "asc" },
      })
    )
  })

  // ========== POST CREATE TESTS ==========

  it("returns 400 when propertyId is missing", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("propertyId is required")
  })

  it("returns 400 when guestName is missing", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        startDate: "2026-06-01",
        endDate: "2026-06-05",
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("guestName is required")
  })

  it("returns 400 when dates are missing or invalid", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "invalid",
        endDate: "2026-06-05",
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain("valid ISO 8601 dates")
  })

  it("returns 400 when endDate is before startDate", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "2026-06-05",
        endDate: "2026-06-01",
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("The check-out date must be after the check-in date")
  })

  it("returns 400 when stay exceeds 2 years", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2029-06-01", // 3 years
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain("two years")
  })

  it("returns 404 when property not found", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue(null)

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId: "nonexistent",
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe("Property not found")
  })

  it("returns 400 for SHARED_BED when property doesn't allow shared bookings", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: false })

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        type: "SHARED_BED",
        bedIds: ["bed-1"],
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain("does not accept individual bed bookings")
  })

  it("returns 400 for SHARED_BED when no beds provided", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        type: "SHARED_BED",
        bedIds: [],
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("Choose at least one bed")
  })

  it("returns 400 when beds don't belong to property or aren't kind Bed", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    mockPrismaPropertyUnitFindMany.mockResolvedValue([]) // No beds found

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        type: "SHARED_BED",
        bedIds: ["bed-1", "bed-2"],
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain("not found or do not belong to this property")
  })

  it("returns 400 when duplicate beds provided", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    // Return both beds so the "not found" check passes, but duplicates will fail
    mockPrismaPropertyUnitFindMany.mockResolvedValue([
      { id: "bed-1", propertyId, kind: "Bed" },
      { id: "bed-1", propertyId, kind: "Bed" }, // Same bed twice to simulate what DB would return
    ])

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        type: "SHARED_BED",
        bedIds: ["bed-1", "bed-1"],
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("Each bed can only be chosen once")
  })

  it("returns 409 when conflict detected (WHOLE_UNIT)", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    mockPrismaBookingFindMany.mockResolvedValue(mockBookingWithConflicts)
    mockFindConflicts.mockReturnValue([mockBookingWithConflicts[0]])

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        unitId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        type: "WHOLE_UNIT",
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toContain("already has that slot")
  })

  it("returns 409 when externalUid already exists", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    mockPrismaBookingFindMany.mockResolvedValue([])
    mockFindConflicts.mockReturnValue([])
    mockPrismaBookingFindUnique.mockResolvedValue({ id: "existing-booking" })

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        externalUid: "duplicate-ext",
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toContain("externalUid already exists")
  })

  it("creates WHOLE_UNIT booking successfully", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    mockPrismaBookingFindMany.mockResolvedValue([])
    mockFindConflicts.mockReturnValue([])
    mockPrismaBookingFindUnique.mockResolvedValue(null)
    mockPrismaBookingCreate.mockResolvedValue(mockBooking)
    mockPrismaPropertyUnitFindFirst.mockResolvedValue(mockUnit)

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        unitId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        type: "WHOLE_UNIT",
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json.guestName).toBe("John Doe")
    expect(json.type).toBe("WHOLE_UNIT")
    expect(json.propertyId).toBe(propertyId)
    expect(json.unitId).toBe(unitId)
  })

  it("creates SHARED_BED booking successfully", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    mockPrismaBookingFindMany.mockResolvedValue([])
    mockFindConflicts.mockReturnValue([])
    mockPrismaBookingFindUnique.mockResolvedValue(null)
    mockPrismaBookingCreate.mockResolvedValue({
      ...mockBooking,
      type: "SHARED_BED",
      unitId: "bed-1",
      bedIds: ["bed-1", "bed-2"],
    })
    mockPrismaPropertyUnitFindMany.mockResolvedValue([
      { id: "bed-1", propertyId, kind: "Bed" },
      { id: "bed-2", propertyId, kind: "Bed" },
    ])

    const request = makeRequest("http://localhost/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId,
        guestName: "John Doe",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        type: "SHARED_BED",
        bedIds: ["bed-1", "bed-2"],
      }),
    })
    const response = await POST_BOOKING(request)
    expect(response.status).toBe(201)
    const json = await response.json()
    expect(json.type).toBe("SHARED_BED")
    expect(json.bedIds).toEqual(["bed-1", "bed-2"])
  })

  // ========== GET SINGLE TESTS ==========

  it("returns 404 when booking not found (GET single)", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindFirst.mockResolvedValue(null)

    const request = makeRequest("http://localhost/api/v1/bookings/nonexistent")
    const response = await GET_BOOKING(request, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe("Booking not found")
  })

  it("returns booking with property and unit (GET single)", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindFirst.mockResolvedValue(mockBooking)

    const response = await GET_BOOKING(
      makeRequest("http://localhost/api/v1/bookings/booking-123"),
      { params: Promise.resolve({ id: "booking-123" }) }
    )
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.id).toBe("booking-123")
    expect(json.property).toBeDefined()
    expect(json.unit).toBeDefined()
  })

  // ========== PATCH TESTS ==========

  it("returns 404 when booking not found (PATCH)", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindFirst.mockResolvedValue(null)

    const request = makeRequest("http://localhost/api/v1/bookings/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ guestName: "Updated" }),
    })
    const response = await PATCH_BOOKING(request, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe("Booking not found")
  })

  it("returns 400 when guestName is empty", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindFirst.mockResolvedValue(mockBooking)

    const request = makeRequest("http://localhost/api/v1/bookings/booking-123", {
      method: "PATCH",
      body: JSON.stringify({ guestName: "" }),
    })
    const response = await PATCH_BOOKING(request, { params: Promise.resolve({ id: "booking-123" }) })
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("guestName cannot be empty")
  })

  it("returns 400 when dates are invalid", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindFirst.mockResolvedValue(mockBooking)

    const request = makeRequest("http://localhost/api/v1/bookings/booking-123", {
      method: "PATCH",
      body: JSON.stringify({ startDate: "invalid", endDate: "2026-06-05" }),
    })
    const response = await PATCH_BOOKING(request, { params: Promise.resolve({ id: "booking-123" }) })
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toContain("Invalid date format")
  })

  it("returns 409 when conflict detected on update", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindFirst.mockResolvedValue(mockBooking)
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    mockPrismaBookingFindMany.mockResolvedValue(mockBookingWithConflicts)
    mockFindConflicts.mockReturnValue([mockBookingWithConflicts[0]])

    const request = makeRequest("http://localhost/api/v1/bookings/booking-123", {
      method: "PATCH",
      body: JSON.stringify({ startDate: "2026-06-01", endDate: "2026-06-05" }),
    })
    const response = await PATCH_BOOKING(request, { params: Promise.resolve({ id: "booking-123" }) })
    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toContain("already has that slot")
  })

  it("returns 409 when externalUid already exists on update", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindFirst.mockResolvedValue({ ...mockBooking, externalUid: "old-ext" })
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    mockPrismaBookingFindMany.mockResolvedValue([])
    mockFindConflicts.mockReturnValue([])
    mockPrismaBookingFindUnique.mockResolvedValue({ id: "other-booking" })

    const request = makeRequest("http://localhost/api/v1/bookings/booking-123", {
      method: "PATCH",
      body: JSON.stringify({ externalUid: "taken-ext" }),
    })
    const response = await PATCH_BOOKING(request, { params: Promise.resolve({ id: "booking-123" }) })
    expect(response.status).toBe(409)
    const json = await response.json()
    expect(json.error).toContain("externalUid already exists")
  })

  it("updates booking successfully", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingFindFirst.mockResolvedValue(mockBooking)
    mockPrismaPropertyFindFirst.mockResolvedValue({ id: propertyId, allowSharedBookings: true })
    mockPrismaBookingFindMany.mockResolvedValue([])
    mockFindConflicts.mockReturnValue([])
    mockPrismaBookingFindUnique.mockResolvedValue(null)
    mockPrismaBookingUpdate.mockResolvedValue({ ...mockBooking, guestName: "Jane Doe", status: "CONFIRMED" })

    const request = makeRequest("http://localhost/api/v1/bookings/booking-123", {
      method: "PATCH",
      body: JSON.stringify({ guestName: "Jane Doe", status: "CONFIRMED" }),
    })
    const response = await PATCH_BOOKING(request, { params: Promise.resolve({ id: "booking-123" }) })
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.guestName).toBe("Jane Doe")
    expect(json.status).toBe("CONFIRMED")
  })

  // ========== DELETE TESTS ==========

  it("returns 404 when booking not found (DELETE)", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingDeleteMany.mockResolvedValue({ count: 0 })

    const request = makeRequest("http://localhost/api/v1/bookings/nonexistent", {
      method: "DELETE",
    })
    const response = await DELETE_BOOKING(request, { params: Promise.resolve({ id: "nonexistent" }) })
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe("Booking not found")
  })

  it("deletes booking successfully", async () => {
    mockPrismaApiKeyFindUnique.mockResolvedValue(mockApiKey)
    mockGetOrgFeatures.mockReturnValue({
      tier: "BUSINESS",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    mockPrismaBookingDeleteMany.mockResolvedValue({ count: 1 })

    const request = makeRequest("http://localhost/api/v1/bookings/booking-123", {
      method: "DELETE",
    })
    const response = await DELETE_BOOKING(request, { params: Promise.resolve({ id: "booking-123" }) })
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.ok).toBe(true)
  })
})