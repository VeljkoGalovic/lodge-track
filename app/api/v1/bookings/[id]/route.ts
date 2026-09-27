import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyApiKeyAuth } from "@/lib/api-auth"
import { BookingStatus, BookingType } from "@prisma/client"
import { findConflicts } from "@/lib/availability"

const VALID_STATUSES = Object.values(BookingStatus)
const VALID_TYPES = Object.values(BookingType)

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/bookings/[id]
 * Get a single booking by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization } = authResult
  const orgId = organization.id
  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where: {
      id,
      property: { orgId },
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

  if (!booking) {
    return NextResponse.json(
      { ok: false, error: "Booking not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(booking)
}

/**
 * PATCH /api/v1/bookings/[id]
 * Update a booking
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

  // Check if booking exists and belongs to organization
  const existingBooking = await prisma.booking.findFirst({
    where: { id, property: { orgId } },
    include: {
      property: {
        select: { id: true, allowSharedBookings: true },
      },
    },
  })

  if (!existingBooking) {
    return NextResponse.json(
      { ok: false, error: "Booking not found" },
      { status: 404 }
    )
  }

  const {
    propertyId,
    unitId,
    type,
    bedIds,
    guestName,
    startDate,
    endDate,
    source,
    status,
    totalAmount,
    externalUid,
  } = body

  // Validate guestName if provided
  if (guestName !== undefined) {
    if (typeof guestName !== "string" || guestName.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "guestName cannot be empty" },
        { status: 400 }
      )
    }
    if (guestName.length > 120) {
      return NextResponse.json(
        { ok: false, error: "Guest name is too long (max 120 characters)" },
        { status: 400 }
      )
    }
  }

  // Validate dates if provided
  const parsedStartDate = startDate ? new Date(startDate as string) : existingBooking.startDate
  const parsedEndDate = endDate ? new Date(endDate as string) : existingBooking.endDate

  if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Invalid date format. Use ISO 8601 format" },
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

  // Validate status if provided
  const bookingStatus = (status as string) || existingBooking.status
  if (status !== undefined && !VALID_STATUSES.includes(bookingStatus as BookingStatus)) {
    return NextResponse.json(
      { ok: false, error: "Invalid status" },
      { status: 400 }
    )
  }

  // Validate source if provided
  const bookingSource = (source as string) || existingBooking.source
  if (source !== undefined && bookingSource.length > 60) {
    return NextResponse.json(
      { ok: false, error: "Source is too long (max 60 characters)" },
      { status: 400 }
    )
  }

  // Determine target property
  const targetPropertyId = (propertyId as string) || existingBooking.propertyId

  // Verify target property belongs to organization
  const targetProperty = await prisma.property.findFirst({
    where: { id: targetPropertyId, orgId },
    select: { id: true, allowSharedBookings: true },
  })

  if (!targetProperty) {
    return NextResponse.json(
      { ok: false, error: "Property not found" },
      { status: 404 }
    )
  }

  // Resolve claim
  let resolvedType: BookingType = (type as BookingType) || existingBooking.type
  let resolvedUnitId: string | null = existingBooking.unitId
  let resolvedBedIds: string[] = existingBooking.bedIds

  if (type !== undefined || unitId !== undefined || bedIds !== undefined || propertyId !== undefined) {
    // Claim is being modified, re-resolve completely
    if (type === "SHARED_BED" || existingBooking.type === "SHARED_BED") {
      if (!targetProperty.allowSharedBookings) {
        return NextResponse.json(
          { ok: false, error: "This property does not accept individual bed bookings" },
          { status: 400 }
        )
      }

      const providedBedIds = (Array.isArray(bedIds) ? bedIds : existingBooking.bedIds) as string[]
      if (providedBedIds.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Choose at least one bed" },
          { status: 400 }
        )
      }

      const beds = await prisma.propertyUnit.findMany({
        where: {
          id: { in: providedBedIds },
          propertyId: targetProperty.id,
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
      resolvedType = "WHOLE_UNIT"
      resolvedBedIds = []

      if (unitId !== undefined) {
        if (unitId === null || unitId === "") {
          resolvedUnitId = null
        } else {
          const unit = await prisma.propertyUnit.findFirst({
            where: { id: unitId as string, propertyId: targetProperty.id, orgId },
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
      } else if (propertyId !== undefined && propertyId !== existingBooking.propertyId) {
        // Property changed, clear unitId since it belongs to old property
        resolvedUnitId = null
      }
    }
  }

  // Check for conflicts (unless status is CANCELLED)
  if (bookingStatus !== "CANCELLED") {
    const overlapping = await prisma.booking.findMany({
      where: {
        propertyId: targetProperty.id,
        property: { orgId },
        status: { not: "CANCELLED" },
        startDate: { lt: parsedEndDate },
        endDate: { gt: parsedStartDate },
        NOT: { id }, // Exclude the booking being updated
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
        propertyId: targetProperty.id,
        type: resolvedType,
        unitId: resolvedUnitId,
        bedIds: resolvedBedIds,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      },
      claims,
      id // Ignore the booking being updated
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

  // Check externalUid uniqueness if provided and changed
  if (externalUid !== undefined && externalUid !== existingBooking.externalUid) {
    if (externalUid && typeof externalUid === "string") {
      const existing = await prisma.booking.findUnique({
        where: { propertyId_externalUid: { propertyId: targetPropertyId, externalUid } },
      })
      if (existing) {
        return NextResponse.json(
          { ok: false, error: "A booking with this externalUid already exists for this property" },
          { status: 409 }
        )
      }
    }
  }

  // Update the booking
  const booking = await prisma.booking.update({
    where: { id },
    data: {
      propertyId: targetPropertyId,
      unitId: resolvedUnitId,
      type: resolvedType,
      bedIds: resolvedBedIds,
      guestName: guestName ? guestName.trim() : existingBooking.guestName,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      source: bookingSource,
      status: bookingStatus as BookingStatus,
      totalAmount: totalAmount !== undefined ? (totalAmount ? parseInt(totalAmount as string, 10) : null) : existingBooking.totalAmount,
      externalUid: externalUid !== undefined ? (externalUid as string | null) : existingBooking.externalUid,
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

  return NextResponse.json(booking)
}

/**
 * DELETE /api/v1/bookings/[id]
 * Delete a booking
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await verifyApiKeyAuth(req)
  if (!authResult.ok) return authResult.response

  const { organization } = authResult
  const orgId = organization.id
  const { id } = await params

  const result = await prisma.booking.deleteMany({
    where: {
      id,
      property: { orgId },
    },
  })

  if (result.count === 0) {
    return NextResponse.json(
      { ok: false, error: "Booking not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true })
}

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}