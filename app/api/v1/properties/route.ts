import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyApiKeyAuth } from "@/lib/api-auth"

/**
 * GET /api/v1/properties
 * Returns a list of properties for the organization.
 * Requires Business tier (hasApiAccess: true).
 */
export async function GET(req: NextRequest) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization } = authResult
  const orgId = organization.id

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get("cursor")
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
  const search = searchParams.get("search")
  const sort = searchParams.get("sort") || "createdAt"
  const order = searchParams.get("order") || "desc"

  const where: Record<string, unknown> = { orgId }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ]
  }

  const orderBy: Record<string, "asc" | "desc"> = {}
  const validSortFields = ["name", "createdAt", "updatedAt"]
  if (validSortFields.includes(sort)) {
    orderBy[sort] = order === "asc" ? "asc" : "desc"
  } else {
    orderBy.createdAt = "desc"
  }

  if (cursor) {
    where.id = { lt: cursor }
  }

  const properties = await prisma.property.findMany({
    where,
    select: {
      id: true,
      name: true,
      address: true,
      currency: true,
      allowSharedBookings: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          units: true,
          bookings: true,
        },
      },
    },
    orderBy,
    take: limit + 1,
  })

  let nextCursor: string | null = null
  if (properties.length > limit) {
    const nextPage = properties.pop()
    nextCursor = nextPage!.id
  }

  return NextResponse.json({ properties, nextCursor })
}

/**
 * POST /api/v1/properties
 * Create a new property
 */
export async function POST(req: NextRequest) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization } = authResult
  const orgId = organization.id

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { name, address, city, country, timezone, currency, allowSharedBookings } = body

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

  if (!address || typeof address !== "string" || address.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "address is required" },
      { status: 400 }
    )
  }

  if (address.length > 200) {
    return NextResponse.json(
      { ok: false, error: "Address is too long (max 200 characters)" },
      { status: 400 }
    )
  }

  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "city is required" },
      { status: 400 }
    )
  }

  if (city.length > 100) {
    return NextResponse.json(
      { ok: false, error: "City is too long (max 100 characters)" },
      { status: 400 }
    )
  }

  if (!country || typeof country !== "string" || country.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "country is required" },
      { status: 400 }
    )
  }

  if (country.length > 100) {
    return NextResponse.json(
      { ok: false, error: "Country is too long (max 100 characters)" },
      { status: 400 }
    )
  }

  const propertyTimezone = (timezone as string) || "UTC"
  const propertyCurrency = (currency as string) || "USD"
  const propertyAllowSharedBookings = allowSharedBookings === true

  // Validate currency format (ISO 4217)
  if (!/^[A-Z]{3}$/.test(propertyCurrency)) {
    return NextResponse.json(
      { ok: false, error: "Currency must be a valid ISO 4217 code (e.g., USD, EUR)" },
      { status: 400 }
    )
  }

  // Check property limit for organization
  const propertyCount = await prisma.property.count({ where: { orgId } })
  const subscription = await prisma.subscription.findUnique({ where: { orgId } })
  const { getOrgFeatures } = await import("@/lib/subscriptions")
  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride ?? undefined
  )

  if (features.maxProperties !== Infinity && propertyCount >= features.maxProperties) {
    return NextResponse.json(
      { ok: false, error: `Property limit reached (${features.maxProperties} properties)` },
      { status: 403 }
    )
  }

  const property = await prisma.property.create({
    data: {
      name: name.trim(),
      address: address.trim(),
      currency: propertyCurrency,
      allowSharedBookings: propertyAllowSharedBookings,
      orgId,
    },
    select: {
      id: true,
      name: true,
      address: true,
      currency: true,
      allowSharedBookings: true,
      orgId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(property, { status: 201 })
}