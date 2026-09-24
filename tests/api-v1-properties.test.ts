import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// Mock auth and prisma - use hoisted mocks to avoid hoisting issues
const mockAuth = vi.hoisted(() => vi.fn())
const mockGetOrgFeatures = vi.hoisted(() => vi.fn())

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    property: { findMany: vi.fn() },
  }
}))

// Mock @/auth module directly instead of next-auth
vi.mock("@/auth", () => ({
  auth: mockAuth,
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock("@/lib/subscriptions", () => ({
  getOrgFeatures: mockGetOrgFeatures,
}))

import { GET } from "@/app/api/v1/properties/route"
import { prisma } from "@/lib/prisma"

describe("API v1 - Properties endpoint", () => {
  const orgId = "org-test-123"
  const userId = "user-test-123"

  const mockUser = {
    id: userId,
    email: "test@example.com",
    orgId,
    organization: {
      id: orgId,
      name: "Test Org",
      subscription: null,
    },
  }

  const mockProperties = [
    {
      id: "prop-1",
      name: "Property 1",
      address: "123 Main St",
      currency: "USD",
      allowSharedBookings: false,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      _count: { units: 5, bookings: 10 },
    },
    {
      id: "prop-2",
      name: "Property 2",
      address: "456 Oak Ave",
      currency: "EUR",
      allowSharedBookings: true,
      createdAt: new Date("2026-02-01"),
      updatedAt: new Date("2026-02-01"),
      _count: { units: 3, bookings: 7 },
    },
  ]

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("NODE_ENV", "test")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const makeRequest = () => new NextRequest("http://localhost/api/v1/properties", {
    method: "GET",
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)

    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe("unauthorized")
  })

  it("returns 404 when user has no organization", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, organization: null })

    const response = await GET(makeRequest())
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe("organization not found")
  })

  it("returns 403 for STARTER tier (no API access)", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
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
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    mockGetOrgFeatures.mockReturnValue({
      tier: "PRO",
      maxProperties: 15,
      maxStorageBytes: 5_000_000_000,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: false, // PRO doesn't have API access by default
    })

    const response = await GET(makeRequest())
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe("forbidden")
    expect(json.currentTier).toBe("PRO")
  })

  it("returns 200 and properties for ENTERPRISE (Business) tier with API access", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    mockGetOrgFeatures.mockReturnValue({
      tier: "ENTERPRISE",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    vi.mocked(prisma.property.findMany).mockResolvedValue(mockProperties)

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
    })
  })

  it("returns 200 and properties for PRO tier with hasApiAccessOverride", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    mockGetOrgFeatures.mockReturnValue({
      tier: "PRO",
      maxProperties: 15,
      maxStorageBytes: 5_000_000_000,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true, // Override enabled
    })
    vi.mocked(prisma.property.findMany).mockResolvedValue(mockProperties)

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.properties).toHaveLength(2)
  })

  it("returns 200 and properties for STARTER tier with hasApiAccessOverride", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    mockGetOrgFeatures.mockReturnValue({
      tier: "STARTER",
      maxProperties: 3,
      maxStorageBytes: 1_000_000_000,
      hasAdvancedAnalytics: false,
      hasTeamRoles: false,
      hasApiAccess: true, // Override enabled
    })
    vi.mocked(prisma.property.findMany).mockResolvedValue(mockProperties)

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.properties).toHaveLength(2)
  })

  it("returns empty array when organization has no properties", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    mockGetOrgFeatures.mockReturnValue({
      tier: "ENTERPRISE",
      maxProperties: Infinity,
      maxStorageBytes: Infinity,
      hasAdvancedAnalytics: true,
      hasTeamRoles: true,
      hasApiAccess: true,
    })
    vi.mocked(prisma.property.findMany).mockResolvedValue([])

    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.properties).toEqual([])
  })
})