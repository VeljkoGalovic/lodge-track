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

const STATUSES = Object.values(BookingStatus)
const MAX_STAY_NIGHTS = 365 * 2

function readBooking(formData: FormData) {
  return {
    propertyId: field(formData, "propertyId"),
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

  const booking = await prisma.booking.create({
    data: {
      propertyId: input.propertyId,
      guestName: input.guestName,
      startDate: input.startDate!,
      endDate: input.endDate!,
      source: input.source,
      status: input.status as BookingStatus,
      totalAmount: amount.minorUnits,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/bookings")
  revalidatePath(`/dashboard/properties/${input.propertyId}`)
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

  const { count } = await prisma.booking.updateMany({
    where: { id, property: { orgId: membership.organization.id } },
    data: {
      propertyId: input.propertyId,
      guestName: input.guestName,
      startDate: input.startDate!,
      endDate: input.endDate!,
      source: input.source,
      status: input.status as BookingStatus,
      totalAmount: amount.minorUnits,
    },
  })
  if (count === 0) return { error: "That booking no longer exists." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/bookings")
  revalidatePath(`/dashboard/bookings/${id}`)
  revalidatePath(`/dashboard/properties/${input.propertyId}`)
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

  const { count } = await prisma.booking.deleteMany({
    where: { id, property: { orgId: membership.organization.id } },
  })
  if (count === 0) return { error: "That booking no longer exists." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/bookings")
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

  const { count } = await prisma.booking.updateMany({
    where: { id, property: { orgId: membership.organization.id } },
    data: { status: status as BookingStatus },
  })
  if (count === 0) return { error: "That booking no longer exists." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/bookings")
  revalidatePath(`/dashboard/bookings/${id}`)
  return { success: "Status updated." }
}
