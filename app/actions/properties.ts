"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { type ActionState, canManage, currentMembership, field } from "@/lib/authorization"
import { getOrgFeatures } from "@/lib/subscriptions"
import { isSupportedCurrency } from "@/lib/currency"

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

  return { name, address, icalUrl: icalUrl || null, currency }
}

function validate(name: string, address: string): string | null {
  if (!name) return "Give the property a name."
  if (name.length > 120) return "Property name is too long."
  if (!address) return "Give the property an address."
  if (address.length > 300) return "Address is too long."
  return null
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

  const { name, address, icalUrl, currency } = readProperty(formData)
  const problem = validate(name, address)
  if (problem) return { error: problem }

  const { maxProperties } = getOrgFeatures(
    membership.subscription?.tier ?? "STARTER",
    membership.subscription?.maxPropertiesOverride,
    membership.subscription?.hasApiAccessOverride
  )

  // Checked here as well as in the UI: the limit is a billing boundary, so it
  // has to hold even if the form is posted directly.
  const current = await prisma.property.count({ where: { orgId: membership.organization.id } })
  if (current >= maxProperties) {
    return {
      error: `Your plan allows ${maxProperties} propert${maxProperties === 1 ? "y" : "ies"}. Upgrade to add more.`,
    }
  }

  const property = await prisma.property.create({
    data: { name, address, icalUrl, currency, orgId: membership.organization.id },
  })

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
  const { name, address, icalUrl, currency } = readProperty(formData)
  const problem = validate(name, address)
  if (problem) return { error: problem }

  /**
   * Scoped by `orgId` in the `where` rather than checked after the read: a
   * property id from another tenant then simply matches nothing, so there is no
   * window between the check and the write.
   */
  const { count } = await prisma.property.updateMany({
    where: { id, orgId: membership.organization.id },
    data: { name, address, icalUrl, currency },
  })
  if (count === 0) return { error: "That property no longer exists." }

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

  // Bookings cascade with the property, so the count is reported back rather
  // than the deletion being a surprise about how much went with it.
  const bookings = await prisma.booking.count({
    where: { propertyId: id, property: { orgId: membership.organization.id } },
  })

  const { count } = await prisma.property.deleteMany({
    where: { id, orgId: membership.organization.id },
  })
  if (count === 0) return { error: "That property no longer exists." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/properties")
  revalidatePath("/dashboard/bookings")
  return {
    success:
      bookings > 0
        ? `Property deleted, along with ${bookings} booking${bookings === 1 ? "" : "s"}.`
        : "Property deleted.",
    redirect: "/dashboard/properties",
  }
}
