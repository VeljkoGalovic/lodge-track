"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { serializable } from "@/lib/transaction"
import { type ActionState, canManage, currentMembership, field } from "@/lib/authorization"
import { getOrgFeatures } from "@/lib/subscriptions"
import { isSupportedCurrency } from "@/lib/currency"
import { syncPropertyIcal } from "@/lib/ical"

/** A bed count the schema can hold without the picker becoming unusable. */
const MAX_BEDS = 200
/** Bed units are named by number, so the highest number names the next gap to fill. */
const BED_NAME = /^Bed (\d+)$/

/**
 * Reads the bed count the form sent, or null when the field is absent.
 *
 * Absent is a distinct outcome from empty: the edit form's help text and the
 * per-unit delete in UnitsCard both treat "don't touch units" as different from
 * "make it one bed", so a stale or trimmed page must not be able to shrink a
 * hostel's unit list by posting a form without the field.
 */
function readBedCount(formData: FormData): { ok: true; count: number | null } | { ok: false } {
  const raw = formData.get("bedCount")
  if (raw === null) return { ok: true, count: null }
  const value = typeof raw === "string" ? raw.trim() : ""
  if (value === "") return { ok: true, count: null }
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > MAX_BEDS) return { ok: false }
  return { ok: true, count: Number(value) }
}

/** Fields shared by create and edit, so the two cannot drift apart. */
function readProperty(formData: FormData) {
  const name = field(formData, "name")
  const address = field(formData, "address")
  const icalUrl = field(formData, "icalUrl")
  const currencyRaw = field(formData, "currency")

  let currency = null
  if (currencyRaw && currencyRaw !== "INHERIT" && isSupportedCurrency(currencyRaw)) {
    currency = currencyRaw
  }

  /**
   * A missing field means unchecked: HTML checkboxes post nothing when they are
   * not ticked, so "absent" is exactly "off" and needs no extra marker.
   */
  const allowSharedBookings = formData.get("allowSharedBookings") === "on"

  return { name, address, icalUrl: icalUrl || null, currency, allowSharedBookings }
}

function validate(
  name: string,
  address: string,
  bedCount: { ok: true; count: number | null } | { ok: false },
  allowSharedBookings: boolean
): string | null {
  if (!name) return "Give the property a name."
  if (name.length > 120) return "Property name is too long."
  if (!address) return "Give the property an address."
  if (address.length > 300) return "Address is too long."
  if (!bedCount.ok) return "Bed count must be a whole number from 1 to 200."
  if (allowSharedBookings && bedCount.count === null) return "Bed count is required when shared bookings are enabled."
  return null
}

/** Add enough beds to reach the total, numbering past existing Bed N names. */
async function missingBeds(
  tx: Prisma.TransactionClient,
  propertyId: string,
  orgId: string,
  count: number
) {
  const existing = await tx.propertyUnit.findMany({
    where: { propertyId, orgId },
    select: { name: true },
  })
  let highest = 0
  for (const unit of existing) {
    const match = BED_NAME.exec(unit.name)
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return existing.length < count
    ? Array.from({ length: count - existing.length }, (_, i) => ({
        name: `Bed ${highest + i + 1}`,
        kind: "Bed",
        propertyId,
        orgId,
      }))
    : []
}

export async function createProperty(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to add properties." }
  }
  const { name, address, icalUrl, currency, allowSharedBookings } = readProperty(formData)
  const bedCount = readBedCount(formData)
  const problem = validate(name, address, bedCount, allowSharedBookings)
  if (problem) return { error: problem }

  const { maxProperties } = getOrgFeatures(
    membership.subscription?.tier ?? "STARTER",
    membership.subscription?.maxPropertiesOverride,
    membership.subscription?.hasApiAccessOverride
  )

  const current = await prisma.property.count({ where: { orgId: membership.organization.id } })
  if (current >= maxProperties) {
    return {
      error: `Your plan allows ${maxProperties} propert${maxProperties === 1 ? "y" : "ies"}. Upgrade to add more.`,
    }
  }

  const wanted = bedCount.ok && bedCount.count !== null ? bedCount.count : 1

  const property = await serializable(async (tx) => {
    const created = await tx.property.create({
      data: { name, address, icalUrl, currency, allowSharedBookings, orgId: membership.organization.id },
    })
    if (allowSharedBookings && wanted >= 1) {
      await tx.propertyUnit.createMany({
        data: Array.from({ length: wanted }, (_, i) => ({
          name: `Bed ${i + 1}`,
          kind: "Bed",
          propertyId: created.id,
          orgId: membership.organization.id,
        })),
      })
    }
    return created
  })

  if (icalUrl) {
    await syncPropertyIcal(property.id, membership.organization.id, icalUrl)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/properties")
  return { success: `${name} added.`, redirect: `/dashboard/properties/${property.id}` }
}

export async function updateProperty(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to edit properties." }
  }

  const id = field(formData, "id")
  const { name, address, icalUrl, currency, allowSharedBookings } = readProperty(formData)
  const bedCount = readBedCount(formData)
  const problem = validate(name, address, bedCount, allowSharedBookings)
  if (problem) return { error: problem }

  try {
    const updated = await serializable(async tx => {
      const { count } = await tx.property.updateMany({
        where: { id, orgId: membership.organization.id },
        data: { name, address, icalUrl, currency, allowSharedBookings },
      })
      if (count === 0) return false

      if (allowSharedBookings && bedCount.ok && bedCount.count !== null) {
        const beds = await missingBeds(tx, id, membership.organization.id, bedCount.count)
        if (beds.length > 0) await tx.propertyUnit.createMany({ data: beds })
      }
      return true
    })
    if (!updated) return { error: "That property no longer exists." }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Some of the new bed names are already taken by units on this property." }
    }
    throw error
  }

  if (icalUrl) {
    await syncPropertyIcal(id, membership.organization.id, icalUrl)
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/properties")
  revalidatePath(`/dashboard/properties/${id}`)
  return { success: "Property updated." }
}

export async function deleteProperty(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to delete properties." }
  }

  const id = field(formData, "id")

  const { count } = await serializable(async (tx) => {
    return await tx.property.deleteMany({
      where: { id, orgId: membership.organization.id },
    })
  })

  if (count === 0) return { error: "That property no longer exists." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/properties")
  revalidatePath("/dashboard/bookings")

  redirect("/dashboard/properties")
}