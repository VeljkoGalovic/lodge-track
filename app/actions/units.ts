"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { serializable } from "@/lib/transaction"
import { type ActionState, canManage, currentMembership, field } from "@/lib/authorization"

const MAX_NAME_LENGTH = 60
const MAX_KIND_LENGTH = 40

function revalidateProperty(propertyId: string) {
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/calendar")
  revalidatePath("/dashboard/properties")
  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath("/dashboard/bookings")
}

export async function createUnit(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to add units." }
  }

  const propertyId = field(formData, "propertyId")
  const name = field(formData, "name")
  const kind = field(formData, "kind")

  if (!name) return { error: "Give the unit a name." }
  if (name.length > MAX_NAME_LENGTH) return { error: "That unit name is too long." }
  if (kind.length > MAX_KIND_LENGTH) return { error: "That kind is too long." }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, orgId: membership.organization.id },
    select: { id: true, allowSharedBookings: true },
  })
  if (!property) return { error: "Choose a property in your organization." }

  /*
   * On a shared-bookings property the units are bed slots and the bed-count
   * field on the property form is the way capacity is set — a hand-added unit
   * would bypass that contract and make the count lie.
   */
  if (property.allowSharedBookings) {
    return { error: "Beds on this property are managed with the bed count on the property form." }
  }

  const result = await serializable(async (tx) => {
    try {
      await tx.propertyUnit.create({
        data: {
          name,
          kind: kind || null,
          propertyId: property.id,
          orgId: membership.organization.id,
        },
      })
    } catch (error) {
      // Two units of one property cannot share a name, which is what keeps the
      // booking form's picker from offering an ambiguous choice.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { error: `This property already has a unit called "${name}".` }
      }
      throw error
    }

    return { success: `${name} added.`, propertyId: property.id }
  })

  if (result.success) revalidateProperty(result.propertyId)
  return { success: result.success, error: result.error }
}

export async function renameUnit(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to rename units." }
  }

  const id = field(formData, "id")
  const name = field(formData, "name")
  const kind = field(formData, "kind")

  if (!name) return { error: "Give the unit a name." }
  if (name.length > MAX_NAME_LENGTH) return { error: "That unit name is too long." }

  try {
    // Scoped by `orgId` in the `where`, so an id from another tenant matches
    // nothing rather than being read and then judged.
    const { count } = await prisma.propertyUnit.updateMany({
      where: { id, orgId: membership.organization.id },
      data: { name, kind: kind || null },
    })
    if (count === 0) return { error: "That unit no longer exists." }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: `This property already has a unit called "${name}".` }
    }
    throw error
  }

  const unit = await prisma.propertyUnit.findFirst({
    where: { id, orgId: membership.organization.id },
    select: { propertyId: true },
  })
  if (unit) revalidateProperty(unit.propertyId)

  return { success: "Unit updated." }
}

export async function deleteUnit(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to remove units." }
  }

  const id = field(formData, "id")

  const result = await serializable(async (tx): Promise<ActionState & { propertyId?: string }> => {
    const unit = await tx.propertyUnit.findFirst({
      where: { id, orgId: membership.organization.id },
      select: { id: true, name: true, propertyId: true },
  })
  if (!unit) return { error: "That unit no longer exists." }

  /*
   * Refused while live bookings still point at it — by `unitId`, or by claiming
   * it inside a shared stay's `bedIds`. Either foreign key is `SetNull`/array
   * rewrite, which would quietly shrink or widen those stays — changing what a
   * booking means is too large to happen as a side effect of removing a room.
   * The count is reported so the person knows what stopped them.
   */
  const bookings = await tx.booking.count({
    where: {
      property: { orgId: membership.organization.id },
      status: { not: "CANCELLED" },
      OR: [{ unitId: unit.id }, { bedIds: { has: unit.id } }],
    },
  })
  if (bookings > 0) {
    return {
      error: `${unit.name} still has ${bookings} active booking${bookings === 1 ? "" : "s"}. Move or cancel ${bookings === 1 ? "it" : "them"} first.`,
    }
  }

  const { count } = await tx.propertyUnit.deleteMany({
    where: { id: unit.id, orgId: membership.organization.id },
  })
  if (count === 0) return { error: "That unit no longer exists." }

    return { success: `${unit.name} removed.`, propertyId: unit.propertyId }
  })
  if (result.success && result.propertyId) revalidateProperty(result.propertyId)
  return { error: result.error, success: result.success }
}
