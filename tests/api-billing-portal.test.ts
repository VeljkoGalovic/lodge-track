import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  // The route handler runs guardApiRateLimit itself (no more DB-free proxy),
  // so the handler hits the RateLimit model before the auth checks.
  // count -> 0 keeps the guard on its "allowed" path.
  rateLimit: {
    deleteMany: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: db }))
vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/billing", () => ({ createCustomerPortalUrl: vi.fn() }))
vi.mock("@/lib/authorization", () => ({ canAdminister: vi.fn((role) => role === "OWNER") }))
vi.mock("@/lib/origin", () => ({ absoluteUrl: vi.fn((path) => `http://localhost:3000${path}`) }))

import { auth } from "@/auth"
import { createCustomerPortalUrl } from "@/lib/billing"
import { GET } from "@/app/api/billing/portal/route"

const mockAuth = auth as vi.Mock
const mockCreateCustomerPortalUrl = createCustomerPortalUrl as vi.Mock

describe("GET /api/billing/portal", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("AUTH_SECRET", "test-secret")
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  function makeRequest(url = "http://localhost:3000/api/billing/portal") {
    return new NextRequest(url)
  }

  it("redirects to signin when not authenticated", async () => {
    mockAuth.mockResolvedValue({ user: null })

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/signin")
  })

  it("redirects to billing with error when no Customer Portal URL", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({
      orgId: "org-123",
      role: "OWNER",
    })
    mockCreateCustomerPortalUrl.mockResolvedValue(null)

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/dashboard/billing?error=portal_unavailable")
  })

  it("redirects to billing with error when user not owner", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({
      orgId: "org-123",
      role: "MEMBER",
    })

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/dashboard/billing?error=not_owner")
  })

  it("redirects to Customer Portal URL when available", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue({
      orgId: "org-123",
      role: "OWNER",
    })
    mockCreateCustomerPortalUrl.mockResolvedValue("https://lemonsqueezy.com/portal/abc")

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://lemonsqueezy.com/portal/abc")
  })

  it("redirects to signin when user not found", async () => {
    mockAuth.mockResolvedValue({ user: { email: "test@example.com" } })
    db.user.findUnique.mockResolvedValue(null)

    const response = await GET(makeRequest())

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/signin")
  })
})