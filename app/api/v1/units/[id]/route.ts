import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyApiKeyAuth } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"

const VALID_KINDS = ["WholeUnit", "Bed"]

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/units/[id]
 * Get a single unit by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization, apiKey } = authResult
  const orgId = organization.id
  const { id } = await params

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

  const unit = await prisma.propertyUnit.findFirst({
    where: { id, orgId },
    include: {
      property: {
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
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  })

  if (!unit) {
    return NextResponse.json(
      { ok: false, error: "Unit not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(unit)
}

/**
 * PATCH /api/v1/units/[id]
 * Update a unit
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization, apiKey } = authResult
  const orgId = organization.id
  const { id } = await params

  // Rate limiting: 30 requests/minute for PATCH
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

  // Check if unit exists and belongs to organization
  const existingUnit = await prisma.propertyUnit.findFirst({
    where: { id, orgId },
    include: { property: true },
  })

  if (!existingUnit) {
    return NextResponse.json(
      { ok: false, error: "Unit not found" },
      { status: 404 }
    )
  }

  const { name, kind } = body

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "name cannot be empty" },
        { status: 400 }
      )
    }
    if (name.length > 120) {
      return NextResponse.json(
        { ok: false, error: "Name is too long (max 120 characters)" },
        { status: 400 }
      )
    }
  }

  // Validate kind if provided
  if (kind !== undefined) {
    if (typeof kind !== "string" || !VALID_KINDS.includes(kind)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid kind. Must be "WholeUnit" or "Bed"' },
        { status: 400 }
      )
    }
  }

  try {
    const unit = await prisma.propertyUnit.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingUnit.name,
        kind: kind || existingUnit.kind,
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

    return NextResponse.json(unit)
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

/**
 * DELETE /api/v1/units/[id]
 * Delete a unit and all its associated bookings
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization, apiKey } = authResult
  const orgId = organization.id
  const { id } = await params

  // Rate limiting: 30 requests/minute for DELETE
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

  // Check if unit exists and belongs to organization
  const existingUnit = await prisma.propertyUnit.findFirst({
    where: { id, orgId },
    include: {
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  })

  if (!existingUnit) {
    return NextResponse.json(
      { ok: false, error: "Unit not found" },
      { status: 404 }
    )
  }

  // Delete the unit (cascades to bookings)
  await prisma.propertyUnit.delete({
    where: { id },
  })

  return NextResponse.json({
    ok: true,
    deletedBookingCount: existingUnit._count.bookings,
  })
}