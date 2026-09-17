"use server"

import { revalidatePath } from "next/cache"
import { BookingStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  type ActionState,
  canManage,
  currentMembership,
  dateField,
  field,
  parseMoneyField,
} from "@/lib/authorization"
import { describeConflict, findConflicts, type SlotClaim } from "@/lib/availability"

const STATUSES = Object.values(BookingStatus)
const MAX_STAY_NIGHTS = 365 * 2

function readBooking(formData: FormData) {
  return {
    propertyId: field(formData, "propertyId"),
    // An empty string is the "whole property" choice, which is what a property
    // with no units can ever offer.
    unitId: field(formData, "unitId"),
    guestName: field(formData, "guestName"),
    startDate: dateField(formData, "startDate"),
    endDate: dateField(formData, "endDate"),
    source: field(formData, "source") || "Direct",
    status: field(formData, "status") || "PENDING",
  }
}

type BookingInput = ReturnType<typeof readBooking>

/**
 * Validates everything except ownership of the property, which needs a database
 * round-trip and is done separately — the two together are what make the write
 * safe.
 */
function validate(input: BookingInput): string | null {
  const { guestName, propertyId, startDate, endDate, status, source } = input

  if (!propertyId) return "Choose a property."
  if (!guestName) return "Give the booking a guest name."
  if (guestName.length > 120) return "Guest name is too long."
  if (!startDate || !endDate) return "Both a start and an end date are required."
  if (endDate < startDate) return "The end date cannot be before the start date."

  const nights = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  if (nights > MAX_STAY_NIGHTS) return "That stay is longer than two years — check the dates."

  if (!STATUSES.includes(status as BookingStatus)) return "Choose a valid status."
  if (source.length > 60) return "Source is too long."

  return null
}

/**
 * Confirms the property exists *and* belongs to this organization. Without the
 * `orgId` term a request could file a booking against another tenant's property
 * simply by guessing its id, since ids are the only thing the form carries.
 */
async function propertyIsOurs(propertyId: string, orgId: string): Promise<boolean> {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, orgId },
    select: { id: true },
  })
  return property !== null
}

/**
 * Resolves the submitted unit against the chosen property.
 *
 * Scoped by `orgId` *and* `propertyId` together, so a unit id from a different
 * property — or a different tenant — matches nothing rather than being attached
 * to this booking. Returns a discriminated result so "no unit chosen" (null, a
 * legitimate whole-property booking) cannot be confused with "that unit is not
 * yours" (`ok: false`), which is the mistake that would let a forged id through.
 */
async function resolveUnit(
  rawUnitId: string,
  propertyId: string,
  orgId: string
): Promise<{ ok: true; unitId: string | null } | { ok: false }> {
  if (!rawUnitId) return { ok: true, unitId: null }

  const unit = await prisma.propertyUnit.findFirst({
    where: { id: rawUnitId, propertyId, orgId },
    select: { id: true },
  })
  return unit ? { ok: true, unitId: unit.id } : { ok: false }
}

/**
 * Live bookings on this property whose dates already overlap the candidate.
 *
 * Narrowed in SQL to the property and the date window — the two terms an index
 * can serve — and then reduced to genuine slot collisions by `findConflicts`,
 * which is the only place the whole-property-versus-single-unit rule lives.
 *
 * The returned claims carry `unitName` alongside so the error message can say
 * which unit is taken rather than just that something is.
 */
async function findBookingConflicts(
  orgId: string,
  candidate: { propertyId: string; unitId: string | null; startDate: Date; endDate: Date },
  ignoreId?: string
): Promise<(SlotClaim & { unitName: string | null })[]> {
  const overlapping = await prisma.booking.findMany({
    where: {
      propertyId: candidate.propertyId,
      property: { orgId },
      status: { not: "CANCELLED" },
      // Half-open overlap in SQL, matching lib/availability's range rule.
      startDate: { lt: candidate.endDate },
      endDate: { gt: candidate.startDate },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    select: {
      id: true,
      propertyId: true,
      unitId: true,
      startDate: true,
      endDate: true,
      status: true,
      guestName: true,
      unit: { select: { name: true } },
    },
  })

  const claims: (SlotClaim & { unitName: string | null })[] = overlapping.map((booking) => ({
    ...booking,
    unitName: booking.unit?.name ?? null,
  }))

  return findConflicts(candidate, claims, ignoreId)
}

function revalidateBooking(propertyId: string, bookingId?: string) {
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/calendar")
  revalidatePath("/dashboard/bookings")
  revalidatePath(`/dashboard/properties/${propertyId}`)
  if (bookingId) revalidatePath(`/dashboard/bookings/${bookingId}`)
}

export async function createBooking(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to add bookings." }
  }

  const input = readBooking(formData)
  const problem = validate(input)
  if (problem) return { error: problem }

  const amount = parseMoneyField(field(formData, "totalAmount"), membership.organization.currency)
  if (!amount.ok) return { error: "The rate must be a number, or left empty." }

  if (!(await propertyIsOurs(input.propertyId, membership.organization.id))) {
    return { error: "Choose a property in your organization." }
  }

  const unit = await resolveUnit(input.unitId, input.propertyId, membership.organization.id)
  if (!unit.ok) return { error: "Choose a unit that belongs to this property." }

  const conflicts = await findBookingConflicts(membership.organization.id, {
    propertyId: input.propertyId,
    unitId: unit.unitId,
    startDate: input.startDate!,
    endDate: input.endDate!,
  })
  if (conflicts.length > 0) {
    return { error: `Those dates are not free. ${describeConflict(conflicts[0], conflicts[0].unitName)}` }
  }

  const booking = await prisma.booking.create({
    data: {
      propertyId: input.propertyId,
      unitId: unit.unitId,
      guestName: input.guestName,
      startDate: input.startDate!,
      endDate: input.endDate!,
      source: input.source,
      status: input.status as BookingStatus,
      totalAmount: amount.minorUnits,
    },
  })

  revalidateBooking(input.propertyId, booking.id)
  return { success: `Booking added for ${input.guestName}.`, redirect: `/dashboard/bookings/${booking.id}` }
}

export async function updateBooking(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to edit bookings." }
  }

  const id = field(formData, "id")
  const input = readBooking(formData)
  const problem = validate(input)
  if (problem) return { error: problem }

  const amount = parseMoneyField(field(formData, "totalAmount"), membership.organization.currency)
  if (!amount.ok) return { error: "The rate must be a number, or left empty." }

  if (!(await propertyIsOurs(input.propertyId, membership.organization.id))) {
    return { error: "Choose a property in your organization." }
  }

  const unit = await resolveUnit(input.unitId, input.propertyId, membership.organization.id)
  if (!unit.ok) return { error: "Choose a unit that belongs to this property." }

  /*
   * The booking being edited is excluded from its own conflict check — otherwise
   * saving any change to a booking would collide with the row it is updating.
   * A conflict with a *different* booking still blocks, which is the point.
   */
  const conflicts = await findBookingConflicts(
    membership.organization.id,
    {
      propertyId: input.propertyId,
      unitId: unit.unitId,
      startDate: input.startDate!,
      endDate: input.endDate!,
    },
    id
  )
  if (conflicts.length > 0) {
    return { error: `Those dates are not free. ${describeConflict(conflicts[0], conflicts[0].unitName)}` }
  }

  const previous = await prisma.booking.findFirst({
    where: { id, property: { orgId: membership.organization.id } },
    select: { propertyId: true },
  })

  const { count } = await prisma.booking.updateMany({
    where: { id, property: { orgId: membership.organization.id } },
    data: {
      propertyId: input.propertyId,
      unitId: unit.unitId,
      guestName: input.guestName,
      startDate: input.startDate!,
      endDate: input.endDate!,
      source: input.source,
      status: input.status as BookingStatus,
      totalAmount: amount.minorUnits,
    },
  })
  if (count === 0) return { error: "That booking no longer exists." }

  revalidateBooking(input.propertyId, id)
  // A booking moved to another property leaves the old one's page stale.
  if (previous && previous.propertyId !== input.propertyId) {
    revalidateBooking(previous.propertyId)
  }
  return { success: "Booking updated." }
}

export async function deleteBooking(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to delete bookings." }
  }

  const id = field(formData, "id")

  const booking = await prisma.booking.findFirst({
    where: { id, property: { orgId: membership.organization.id } },
    select: { propertyId: true },
  })

  const { count } = await prisma.booking.deleteMany({
    where: { id, property: { orgId: membership.organization.id } },
  })
  if (count === 0) return { error: "That booking no longer exists." }

  if (booking) revalidateBooking(booking.propertyId)
  else revalidatePath("/dashboard/bookings")
  return { success: "Booking deleted.", redirect: "/dashboard/bookings" }
}

/** A one-tap status change from the bookings list. */
export async function setBookingStatus(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to change bookings." }
  }

  const id = field(formData, "id")
  const status = field(formData, "status")
  if (!STATUSES.includes(status as BookingStatus)) return { error: "Choose a valid status." }

  const booking = await prisma.booking.findFirst({
    where: { id, property: { orgId: membership.organization.id } },
    select: {
      propertyId: true,
      unitId: true,
      startDate: true,
      endDate: true,
    },
  })
  if (!booking) return { error: "That booking no longer exists." }

  /*
   * Reviving a cancelled booking re-takes its slot, which may have been sold in
   * the meantime. Checked here for the same reason create and edit check: the
   * conflict rule is only worth having if every path that puts a stay back on the
   * calendar goes through it.
   */
  if (status !== "CANCELLED") {
    const conflicts = await findBookingConflicts(
      membership.organization.id,
      {
        propertyId: booking.propertyId,
        unitId: booking.unitId,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
      id
    )
    if (conflicts.length > 0) {
      return {
        error: `That slot has since been taken. ${describeConflict(conflicts[0], conflicts[0].unitName)}`,
      }
    }
  }

  const { count } = await prisma.booking.updateMany({
    where: { id, property: { orgId: membership.organization.id } },
    data: { status: status as BookingStatus },
  })
  if (count === 0) return { error: "That booking no longer exists." }

  revalidateBooking(booking.propertyId, id)
  return { success: "Status updated." }
}
