"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import {
  type ActionState,
  canAdminister,
  currentMembership,
  field,
} from "@/lib/authorization"
import { isSupportedCurrency } from "@/lib/currency"

/**
 * Gives a signed-in member who has no organization one, and makes them its owner.
 *
 * `User.orgId` is required and its foreign key cascades, so a user cannot
 * normally exist without an organization — registration creates both together.
 * This is the safety net behind `/onboarding`, which every dashboard page names
 * as its redirect target, so that target does something correct rather than 404.
 *
 * The existing organization is looked up by id rather than through the relation,
 * because the relation is declared non-nullable and would make this check
 * impossible to express — and the row it points at is what actually matters.
 */
export async function createOrganization(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }

  const existing = await prisma.organization.findUnique({
    where: { id: membership.user.orgId },
  })
  if (existing) {
    return { error: "You already belong to an organization." }
  }

  const name = field(formData, "name")
  if (!name) return { error: "Give your organization a name." }

  const currency = field(formData, "currency") || "USD"
  if (!isSupportedCurrency(currency)) return { error: "Choose a supported currency." }

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({ data: { name, currency } })
    await tx.subscription.create({
      data: { orgId: organization.id, tier: "STARTER", status: "ACTIVE" },
    })
    await tx.user.update({
      where: { id: membership.user.id },
      data: { orgId: organization.id, role: "OWNER" },
    })
  })

  revalidatePath("/dashboard")
  return { success: "Organization ready.", redirect: "/dashboard" }
}

/**
 * Updates the organization's own details. Restricted to owners: the currency
 * decides how every amount in the app is read, which is not a day-to-day change.
 */
export async function updateOrganization(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canAdminister(membership.user.role)) {
    return { error: "Only an owner can change the organization's details." }
  }

  const name = field(formData, "name")
  if (!name) return { error: "Organization name cannot be empty." }

  const currency = field(formData, "currency") || "USD"
  if (!isSupportedCurrency(currency)) return { error: "Choose a supported currency." }

  await prisma.organization.update({
    where: { id: membership.organization.id },
    data: { name, currency },
  })

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/settings")
  return { success: "Organization updated." }
}
