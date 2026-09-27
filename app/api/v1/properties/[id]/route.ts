import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyApiKeyAuth } from "@/lib/api-auth"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/properties/[id]
 * Get a single property by ID with its units
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization } = authResult
  const orgId = organization.id
  const { id } = await params

  const property = await prisma.property.findFirst({
    where: { id, orgId },
    include: {
      units: {
        select: {
          id: true,
          propertyId: true,
          name: true,
          kind: true,
          orgId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
      },
      _count: {
        select: {
          bookings: true,
          units: true,
        },
      },
    },
  })

  if (!property) {
    return NextResponse.json(
      { ok: false, error: "Property not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(property)
}

/**
 * PATCH /api/v1/properties/[id]
 * Update a property
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization } = authResult
  const orgId = organization.id
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  // Check if property exists and belongs to organization
  const existingProperty = await prisma.property.findFirst({
    where: { id, orgId },
  })

  if (!existingProperty) {
    return NextResponse.json(
      { ok: false, error: "Property not found" },
      { status: 404 }
    )
  }

  const { name, address, city, country, currency, allowSharedBookings } = body

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

  // Validate address if provided
  if (address !== undefined) {
    if (typeof address !== "string" || address.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "address cannot be empty" },
        { status: 400 }
      )
    }
    if (address.length > 200) {
      return NextResponse.json(
        { ok: false, error: "Address is too long (max 200 characters)" },
        { status: 400 }
      )
    }
  }

  // Validate city if provided
  if (city !== undefined) {
    if (typeof city !== "string" || city.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "city cannot be empty" },
        { status: 400 }
      )
    }
    if (city.length > 100) {
      return NextResponse.json(
        { ok: false, error: "City is too long (max 100 characters)" },
        { status: 400 }
      )
    }
  }

  // Validate country if provided
  if (country !== undefined) {
    if (typeof country !== "string" || country.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "country cannot be empty" },
        { status: 400 }
      )
    }
    if (country.length > 100) {
      return NextResponse.json(
        { ok: false, error: "Country is too long (max 100 characters)" },
        { status: 400 }
      )
    }
  }

  // Validate currency if provided
  if (currency !== undefined) {
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { ok: false, error: "Currency must be a valid ISO 4217 code (e.g., USD, EUR)" },
        { status: 400 }
      )
    }
  }

  // Validate allowSharedBookings if provided
  if (allowSharedBookings !== undefined && typeof allowSharedBookings !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "allowSharedBookings must be a boolean" },
      { status: 400 }
    )
  }

  // Update the property
  const property = await prisma.property.update({
    where: { id },
    data: {
      name: name ? name.trim() : existingProperty.name,
      address: address ? address.trim() : existingProperty.address,
      currency: currency || existingProperty.currency,
      allowSharedBookings: allowSharedBookings !== undefined ? allowSharedBookings : existingProperty.allowSharedBookings,
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

  return NextResponse.json(property)
}

/**
 * DELETE /api/v1/properties/[id]
 * Delete a property and all its associated data
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization } = authResult
  const orgId = organization.id
  const { id } = await params

  // Check if property exists and belongs to organization
  const existingProperty = await prisma.property.findFirst({
    where: { id, orgId },
    include: {
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  })

  if (!existingProperty) {
    return NextResponse.json(
      { ok: false, error: "Property not found" },
      { status: 404 }
    )
  }

  // Delete the property (cascades to units, bookings, expenses, attachments)
  await prisma.property.delete({
    where: { id },
  })

  return NextResponse.json({
    ok: true,
    deletedBookingCount: existingProperty._count.bookings,
  })
}