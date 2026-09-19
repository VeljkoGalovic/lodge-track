"use server"

import { revalidatePath } from "next/cache"
import { BookingStatus, BookingType, type Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { serializable } from "@/lib/transaction"
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
/** Upper bound on the beds one shared stay may claim, matching the property cap. */
const MAX_BEDS_PER_BOOKING = 200

function readBooking(formData: FormData) {
  /**
   * How the stay claims the property. `whole`/`unitId` are the legacy fields the
   * unit picker posts; `bedIds` arrives as a multi-select when the property has
   * shared bookings on and the host chose "Individual bed(s)".
   */
  const bookingMode = field(formData, "bookingMode") || "unit"
  return {
    bookingMode,
    propertyId: field(formData, "propertyId"),
    // An empty string is the "whole property" choice, which is what a property
    // with no units can ever offer.
    unitId: field(formData, "unitId"),
    bedIds: formData
      .getAll("bedIds")
      .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
      .map((entry) => entry.trim()),
    guestName: field(formData, "guestName"),
    startDate: dateField(formData, "startDate"),
    endDate: dateField(formData, "endDate"),
    source: field(formData, "source") || "Direct",
    status: field(formData, "status") || "PENDING",
  }
}

type BookingInput = ReturnType<typeof readBooking>
/** `BookingInput` plus the tenant, added only after the session is resolved. */
type OwnedBookingInput = BookingInput & { orgId: string }

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
  if (endDate <= startDate) return "The check-out date must be after the check-in date."

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
 * Returns the row (not a boolean) so the caller can branch on
 * `allowSharedBookings` — the flag that decides what a submitted claim may look
 * like — without a second query.
 */
async function ourProperty(
  tx: Prisma.TransactionClient,
  propertyId: string,
  orgId: string
): Promise<{ id: string; allowSharedBookings: boolean } | null> {
  return tx.property.findFirst({
    where: { id: propertyId, orgId },
    select: { id: true, allowSharedBookings: true },
  })
}

/** The resolved claim a booking row will store. */
interface ResolvedClaim {
  type: BookingType
  unitId: string | null
  bedIds: string[]
}

type ClaimProblem =
  | "unit-not-ours"
  | "shared-off"
  | "no-beds"
  | "too-many-beds"
  | "duplicate-beds"
  | "bed-not-ours"

const CLAIM_MESSAGES: Record<ClaimProblem, string> = {
  "unit-not-ours": "Choose a unit that belongs to this property.",
  "shared-off": "This property does not accept individual bed bookings.",
  "no-beds": "Choose at least one bed.",
  "too-many-beds": `A stay can hold at most ${MAX_BEDS_PER_BOOKING} beds.`,
  "duplicate-beds": "Each bed can only be chosen once.",
  "bed-not-ours": "Choose beds that belong to this property.",
}

/**
 * Resolves the submitted claim — a legacy unit pick, an exclusive whole-property
 * stay, or a shared-bed selection — against the chosen property.
 *
 * Everything is scoped by `orgId` *and* `propertyId` together, so ids from a
 * different property — or a different tenant — match nothing rather than being
 * attached to this booking. The discriminated result keeps "nothing claimed"
 * (a legitimate whole-property booking) from being confused with "that id is
 * not yours", which is the mistake that would let a forged id through.
 */
async function resolveClaim(
  tx: Prisma.TransactionClient,
  input: OwnedBookingInput,
  property: { id: string; allowSharedBookings: boolean }
): Promise<{ ok: true; claim: ResolvedClaim } | { ok: false; problem: ClaimProblem }> {
  const orgId = input.orgId

  // Shared-bed mode is only reachable on a property that opted in.
  if (input.bookingMode === "beds") {
    if (!property.allowSharedBookings) return { ok: false, problem: "shared-off" }
    if (input.bedIds.length === 0) return { ok: false, problem: "no-beds" }
    if (input.bedIds.length > MAX_BEDS_PER_BOOKING) return { ok: false, problem: "too-many-beds" }
    if (new Set(input.bedIds).size !== input.bedIds.length) {
      return { ok: false, problem: "duplicate-beds" }
    }

    const beds = await tx.propertyUnit.findMany({
      where: { id: { in: input.bedIds }, propertyId: property.id, orgId },
      select: { id: true },
    })
    if (beds.length !== input.bedIds.length) return { ok: false, problem: "bed-not-ours" }

    return { ok: true, claim: { type: "SHARED_BED", unitId: input.bedIds[0], bedIds: input.bedIds } }
  }

  if (!input.unitId) return { ok: true, claim: { type: "WHOLE_UNIT", unitId: null, bedIds: [] } }

  const unit = await tx.propertyUnit.findFirst({
    where: { id: input.unitId, propertyId: property.id, orgId },
    select: { id: true },
  })
  if (!unit) return { ok: false, problem: "unit-not-ours" }
  return { ok: true, claim: { type: "WHOLE_UNIT", unitId: unit.id, bedIds: [] } }
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
  tx: Prisma.TransactionClient,
  orgId: string,
  candidate: {
    propertyId: string
    type: BookingType
    unitId: string | null
    bedIds: string[]
    startDate: Date
    endDate: Date
  },
  ignoreId?: string
): Promise<(SlotClaim & { unitName: string | null })[]> {
  const overlapping = await tx.booking.findMany({
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

  const result = await serializable(async (tx): Promise<ActionState> => {
    const property = await ourProperty(tx, input.propertyId, membership.organization.id)
    if (!property) return { error: "Choose a property in your organization." }

    const claim = await resolveClaim(tx, { ...input, orgId: membership.organization.id }, property)
    if (!claim.ok) return { error: CLAIM_MESSAGES[claim.problem] }

    const conflicts = input.status === "CANCELLED" ? [] : await findBookingConflicts(tx, membership.organization.id, {
      propertyId: input.propertyId,
      ...claim.claim,
      startDate: input.startDate!,
      endDate: input.endDate!,
  })
  if (conflicts.length > 0) {
    return { error: `Those dates are not free. ${describeConflict(conflicts[0], conflicts[0].unitName)}` }
  }

  const booking = await tx.booking.create({
    data: {
      propertyId: input.propertyId,
      ...claim.claim,
      guestName: input.guestName,
      startDate: input.startDate!,
      endDate: input.endDate!,
      source: input.source,
      status: input.status as BookingStatus,
      totalAmount: amount.minorUnits,
    },
  })

    return { success: `Booking added for ${input.guestName}.`, redirect: `/dashboard/bookings/${booking.id}` }
  })
  if (result.success) revalidateBooking(input.propertyId)
  return result
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

  const result = await serializable(async (tx): Promise<ActionState & { previousPropertyId?: string }> => {
    const previous = await tx.booking.findFirst({
      where: { id, property: { orgId: membership.organization.id } },
      select: { propertyId: true },
  })

  if (!previous) return { error: "That booking no longer exists." }
  const property = await ourProperty(tx, input.propertyId, membership.organization.id)
  if (!property) return { error: "Choose a property in your organization." }

  const claim = await resolveClaim(tx, { ...input, orgId: membership.organization.id }, property)
  if (!claim.ok) return { error: CLAIM_MESSAGES[claim.problem] }

  /*
   * The booking being edited is excluded from its own conflict check — otherwise
   * saving any change to a booking would collide with the row it is updating.
   * A conflict with a *different* booking still blocks, which is the point.
   */
  const conflicts = input.status === "CANCELLED" ? [] : await findBookingConflicts(
    tx,
    membership.organization.id,
    {
      propertyId: input.propertyId,
      ...claim.claim,
      startDate: input.startDate!,
      endDate: input.endDate!,
    },
    id
  )
  if (conflicts.length > 0) {
    return { error: `Those dates are not free. ${describeConflict(conflicts[0], conflicts[0].unitName)}` }
  }

  const { count } = await tx.booking.updateMany({
    where: { id, property: { orgId: membership.organization.id } },
    data: {
      propertyId: input.propertyId,
      ...claim.claim,
      guestName: input.guestName,
      startDate: input.startDate!,
      endDate: input.endDate!,
      source: input.source,
      status: input.status as BookingStatus,
      totalAmount: amount.minorUnits,
    },
  })
  if (count === 0) return { error: "That booking no longer exists." }

    return { success: "Booking updated.", previousPropertyId: previous.propertyId }
  })
  if (result.success) {
    revalidateBooking(input.propertyId, id)
    if (result.previousPropertyId && result.previousPropertyId !== input.propertyId) revalidateBooking(result.previousPropertyId)
  }
  return { error: result.error, success: result.success }
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

  const result = await serializable(async (tx): Promise<ActionState & { propertyId?: string }> => {
    const booking = await tx.booking.findFirst({
      where: { id, property: { orgId: membership.organization.id } },
      select: {
        propertyId: true,
        type: true,
        unitId: true,
        bedIds: true,
        startDate: true,
        endDate: true,
      },
  })
  if (!booking) return { error: "That booking no longer exists." }

  /*
   * Reviving a cancelled booking re-takes its slot — its beds, for a shared-bed
   * stay — which may have been sold in the meantime. Checked here for the same
   * reason create and edit check: the conflict rule is only worth having if every
   * path that puts a stay back on the calendar goes through it.
   */
  if (status !== "CANCELLED") {
    const conflicts = await findBookingConflicts(
      tx,
      membership.organization.id,
      {
        propertyId: booking.propertyId,
        type: booking.type,
        unitId: booking.unitId,
        bedIds: booking.bedIds,
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

  const { count } = await tx.booking.updateMany({
    where: { id, property: { orgId: membership.organization.id } },
    data: { status: status as BookingStatus },
  })
  if (count === 0) return { error: "That booking no longer exists." }

    return { success: "Status updated.", propertyId: booking.propertyId }
  })
  if (result.success && result.propertyId) revalidateBooking(result.propertyId, id)
  return { error: result.error, success: result.success }
}
