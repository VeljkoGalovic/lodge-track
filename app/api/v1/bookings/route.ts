import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyApiKeyAuth } from "@/lib/api-auth"
import { BookingStatus, BookingType } from "@prisma/client"
import { findConflicts, rangesOverlap } from "@/lib/availability"
import { checkRateLimit } from "@/lib/rate-limit"

const VALID_STATUSES = Object.values(BookingStatus)
const VALID_TYPES = Object.values(BookingType)
const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

/**
 * GET /api/v1/bookings
 * List bookings with pagination and filtering
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
  const unitId = searchParams.get("unitId")
  const status = searchParams.get("status")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const search = searchParams.get("search")
  const sort = searchParams.get("sort") || "startDate"
  const order = searchParams.get("order") || "desc"

  // Build where clause
  const where: Record<string, unknown> = {
    property: { orgId },
  }

  if (propertyId) where.propertyId = propertyId
  if (unitId) where.unitId = unitId
  if (status && VALID_STATUSES.includes(status as BookingStatus)) where.status = status
  if (startDate) where.startDate = { gte: new Date(startDate) }
  if (endDate) where.endDate = { lte: new Date(endDate) }
  if (search) where.guestName = { contains: search, mode: "insensitive" }

  // Build orderBy
  const orderBy: Record<string, "asc" | "desc"> = {}
  const validSortFields = ["startDate", "createdAt", "guestName"]
  if (validSortFields.includes(sort)) {
    orderBy[sort] = order === "asc" ? "asc" : "desc"
  } else {
    orderBy.startDate = "desc"
  }

  // Cursor-based pagination
  if (cursor) {
    where.id = { lt: cursor }
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      propertyId: true,
      unitId: true,
      type: true,
      bedIds: true,
      guestName: true,
      startDate: true,
      endDate: true,
      source: true,
      status: true,
      totalAmount: true,
      externalUid: true,
      createdAt: true,
    },
    orderBy,
    take: limit + 1, // Take one extra to check if there's a next page
  })

  let nextCursor: string | null = null
  if (bookings.length > limit) {
    const nextPage = bookings.pop() // Remove the extra item
    nextCursor = nextPage!.id
  }

  return NextResponse.json({
    bookings,
    nextCursor,
  })
}

/**
 * POST /api/v1/bookings
 * Create a new booking
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

  // Validate required fields
  const { propertyId, unitId, type, bedIds, guestName, startDate, endDate, source, status, totalAmount, externalUid } = body

  if (!propertyId || typeof propertyId !== "string") {
    return NextResponse.json(
      { ok: false, error: "propertyId is required" },
      { status: 400 }
    )
  }

  if (!guestName || typeof guestName !== "string" || guestName.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "guestName is required" },
      { status: 400 }
    )
  }

  if (guestName.length > 120) {
    return NextResponse.json(
      { ok: false, error: "Guest name is too long (max 120 characters)" },
      { status: 400 }
    )
  }

  const parsedStartDate = startDate ? new Date(startDate as string) : null
  const parsedEndDate = endDate ? new Date(endDate as string) : null

  if (!parsedStartDate || !parsedEndDate || isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Both startDate and endDate are required and must be valid ISO 8601 dates" },
      { status: 400 }
    )
  }

  if (parsedEndDate <= parsedStartDate) {
    return NextResponse.json(
      { ok: false, error: "The check-out date must be after the check-in date" },
      { status: 400 }
    )
  }

  const nights = Math.round((parsedEndDate.getTime() - parsedStartDate.getTime()) / (24 * 60 * 60 * 1000))
  if (nights > 365 * 2) {
    return NextResponse.json(
      { ok: false, error: "That stay is longer than two years — check the dates" },
      { status: 400 }
    )
  }

  const bookingType = (type as string) || "WHOLE_UNIT"
  if (!VALID_TYPES.includes(bookingType as BookingType)) {
    return NextResponse.json(
      { ok: false, error: "Invalid booking type. Must be WHOLE_UNIT or SHARED_BED" },
      { status: 400 }
    )
  }

  const bookingStatus = (status as string) || "PENDING"
  if (!VALID_STATUSES.includes(bookingStatus as BookingStatus)) {
    return NextResponse.json(
      { ok: false, error: "Invalid status" },
      { status: 400 }
    )
  }

  const bookingSource = (source as string) || "Direct"
  if (bookingSource.length > 60) {
    return NextResponse.json(
      { ok: false, error: "Source is too long (max 60 characters)" },
      { status: 400 }
    )
  }

  // Verify property belongs to organization
  const property = await prisma.property.findFirst({
    where: { id: propertyId, orgId },
    select: { id: true, allowSharedBookings: true },
  })

  if (!property) {
    return NextResponse.json(
      { ok: false, error: "Property not found" },
      { status: 404 }
    )
  }

  // Resolve claim (unit vs shared beds)
  let resolvedType: BookingType = bookingType as BookingType
  let resolvedUnitId: string | null = null
  let resolvedBedIds: string[] = []

  if (bookingType === "SHARED_BED") {
    if (!property.allowSharedBookings) {
      return NextResponse.json(
        { ok: false, error: "This property does not accept individual bed bookings" },
        { status: 400 }
      )
    }

    const providedBedIds = (Array.isArray(bedIds) ? bedIds : []) as string[]
    if (providedBedIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Choose at least one bed" },
        { status: 400 }
      )
    }

    // Verify beds belong to this property and are of kind "Bed"
    const beds = await prisma.propertyUnit.findMany({
      where: {
        id: { in: providedBedIds },
        propertyId: property.id,
        orgId,
        kind: "Bed",
      },
      select: { id: true },
    })

    if (beds.length !== providedBedIds.length) {
      return NextResponse.json(
        { ok: false, error: "One or more beds not found or do not belong to this property" },
        { status: 400 }
      )
    }

    if (new Set(providedBedIds).size !== providedBedIds.length) {
      return NextResponse.json(
        { ok: false, error: "Each bed can only be chosen once" },
        { status: 400 }
      )
    }

    resolvedType = "SHARED_BED"
    resolvedUnitId = providedBedIds[0]
    resolvedBedIds = providedBedIds
  } else {
    // WHOLE_UNIT booking
    if (unitId) {
      const unit = await prisma.propertyUnit.findFirst({
        where: { id: unitId as string, propertyId: property.id, orgId },
        select: { id: true },
      })

      if (!unit) {
        return NextResponse.json(
          { ok: false, error: "Unit not found or does not belong to this property" },
          { status: 404 }
        )
      }
      resolvedUnitId = unit.id
    }
    resolvedType = "WHOLE_UNIT"
    resolvedBedIds = []
  }

  // Check for conflicts (unless status is CANCELLED)
  if (bookingStatus !== "CANCELLED") {
    const overlapping = await prisma.booking.findMany({
      where: {
        propertyId: property.id,
        property: { orgId },
        status: { not: "CANCELLED" },
        startDate: { lt: parsedEndDate },
        endDate: { gt: parsedStartDate },
      },
      select: {
        id: true,
        propertyId: true,
        type: true,
        unitId: true,
        bedIds: true,
        startDate: true,
        endDate: true,
        status: true,
        guestName: true,
        unit: { select: { name: true } },
      },
    })

    const claims = overlapping.map((booking) => ({
      ...booking,
      unitName: booking.unit?.name ?? null,
    }))

    const conflicts = findConflicts(
      {
        propertyId: property.id,
        type: resolvedType,
        unitId: resolvedUnitId,
        bedIds: resolvedBedIds,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      },
      claims
    )

    if (conflicts.length > 0) {
      const conflict = conflicts[0]
      const where = conflict.unitName ? ` in ${conflict.unitName}` : ""
      return NextResponse.json(
        {
          ok: false,
          error: `${conflict.guestName}${where} already has that slot (${formatDay(conflict.startDate)} to ${formatDay(conflict.endDate)}).`,
        },
        { status: 409 }
      )
    }
  }

  // Check externalUid uniqueness if provided
  if (externalUid && typeof externalUid === "string") {
    const existing = await prisma.booking.findUnique({
      where: { propertyId_externalUid: { propertyId, externalUid } },
    })
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "A booking with this externalUid already exists for this property" },
        { status: 409 }
      )
    }
  }

  // Create the booking
  const booking = await prisma.booking.create({
    data: {
      propertyId,
      unitId: resolvedUnitId,
      type: resolvedType,
      bedIds: resolvedBedIds,
      guestName: guestName.trim(),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      source: bookingSource,
      status: bookingStatus as BookingStatus,
      totalAmount: totalAmount ? parseInt(totalAmount as string, 10) : null,
      externalUid: externalUid as string | null,
    },
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
      unit: {
        select: {
          id: true,
          propertyId: true,
          name: true,
          kind: true,
          orgId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })

  return NextResponse.json(booking, { status: 201 })
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}