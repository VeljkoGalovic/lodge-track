import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyApiKeyAuth } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20
const VALID_KINDS = ["WholeUnit", "Bed"]

/**
 * GET /api/v1/units
 * Returns a paginated list of units for the organization.
 * Supports filtering by propertyId, search by name, and cursor-based pagination.
 * Requires Business tier (hasApiAccess: true).
 */
export async function GET(req: NextRequest) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization, apiKey } = authResult
  const orgId = organization.id

  // Rate limiting: 100 requests/minute for GET
  const rateLimitResult = await checkRateLimit(`apikey:${apiKey.keyPrefix}`, {
    maxAttempts: 100,
    windowMinutes: 1,
    action: "api:v1:read",
  })
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } }
    )
  }

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get("cursor")
  const limit = Math.min(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10), MAX_LIMIT)
  const propertyId = searchParams.get("propertyId")
  const search = searchParams.get("search")
  const sort = searchParams.get("sort") || "createdAt"
  const order = searchParams.get("order") || "desc"

  // Build where clause
  const where: Record<string, unknown> = { orgId }

  if (propertyId) where.propertyId = propertyId
  if (search) where.name = { contains: search, mode: "insensitive" }

  // Build orderBy
  const orderBy: Record<string, "asc" | "desc"> = {}
  const validSortFields = ["name", "createdAt", "updatedAt", "kind"]
  if (validSortFields.includes(sort)) {
    orderBy[sort] = order === "asc" ? "asc" : "desc"
  } else {
    orderBy.createdAt = "desc"
  }

  // Cursor-based pagination
  if (cursor) {
    where.id = { lt: cursor }
  }

  const units = await prisma.propertyUnit.findMany({
    where,
    select: {
      id: true,
      propertyId: true,
      name: true,
      kind: true,
      orgId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
    orderBy,
    take: limit + 1, // Take one extra to check if there's a next page
  })

  let nextCursor: string | null = null
  if (units.length > limit) {
    const nextPage = units.pop() // Remove the extra item
    nextCursor = nextPage!.id
  }

  return NextResponse.json({ units, nextCursor })
}

/**
 * POST /api/v1/units
 * Create a new unit
 */
export async function POST(req: NextRequest) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization, apiKey } = authResult
  const orgId = organization.id

  // Rate limiting: 30 requests/minute for POST
  const rateLimitResult = await checkRateLimit(`apikey:${apiKey.keyPrefix}`, {
    maxAttempts: 30,
    windowMinutes: 1,
    action: "api:v1:write",
  })
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
      { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds) } }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { propertyId, name, kind } = body

  if (!propertyId || typeof propertyId !== "string") {
    return NextResponse.json(
      { ok: false, error: "propertyId is required" },
      { status: 400 }
    )
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 }
    )
  }

  if (name.length > 120) {
    return NextResponse.json(
      { ok: false, error: "Name is too long (max 120 characters)" },
      { status: 400 }
    )
  }

  const unitKind = (kind as string) || "WholeUnit"
  if (!VALID_KINDS.includes(unitKind)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid kind. Must be "WholeUnit" or "Bed"' },
      { status: 400 }
    )
  }

  // Verify property belongs to organization
  const property = await prisma.property.findFirst({
    where: { id: propertyId, orgId },
    select: { id: true },
  })

  if (!property) {
    return NextResponse.json(
      { ok: false, error: "Property not found" },
      { status: 404 }
    )
  }

  // Check if unit limit reached for this property
  const unitCount = await prisma.propertyUnit.count({ where: { propertyId: property.id } })
  // Note: No hard limit in schema, but we could add one if needed

  try {
    const unit = await prisma.propertyUnit.create({
      data: {
        name: name.trim(),
        kind: unitKind,
        propertyId: property.id,
        orgId,
      },
      select: {
        id: true,
        propertyId: true,
        name: true,
        kind: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(unit, { status: 201 })
  } catch (error) {
    // Handle unique constraint violation (duplicate name per property)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { ok: false, error: "A unit with this name already exists for this property" },
        { status: 409 }
      )
    }
    throw error
  }
}