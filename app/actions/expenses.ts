"use server"

import { revalidatePath } from "next/cache"
import type { ExpenseCategory } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  type ActionState,
  canManage,
  currentMembership,
  dateField,
  field,
  parseMoneyField,
} from "@/lib/authorization"
import { isExpenseCategory } from "@/lib/expense-category"
import { deleteReceipt, saveReceipt } from "@/lib/storage"
import { receiptQuota } from "@/lib/receipt-quota"

const MAX_DESCRIPTION_LENGTH = 300

/** Fields shared by create and edit, so the two cannot drift apart. */
function readExpense(formData: FormData) {
  return {
    propertyId: field(formData, "propertyId"),
    amount: field(formData, "amount"),
    category: field(formData, "category"),
    date: dateField(formData, "date"),
    description: field(formData, "description"),
  }
}

type ExpenseInput = ReturnType<typeof readExpense>

function validate(input: ExpenseInput): string | null {
  if (!input.propertyId) return "Choose a property."
  if (!input.date) return "Enter the date the cost was incurred."
  if (!input.description) return "Describe what the cost was for."
  if (input.description.length > MAX_DESCRIPTION_LENGTH) return "That description is too long."
  if (!isExpenseCategory(input.category)) return "Choose a category."
  return null
}

/**
 * The uploaded receipt, if one was sent.
 *
 * An empty file input submits a zero-length `File` rather than nothing, so that
 * case is treated as "no receipt" — otherwise every edit without a new attachment
 * would fail the empty-file check.
 */
function receiptFile(formData: FormData): File | null {
  const value = formData.get("receipt")
  if (!(value instanceof File)) return null
  return value.size === 0 ? null : value
}

function revalidateExpense(propertyId: string) {
  revalidatePath("/dashboard")
  revalidatePath("/dashboard/expenses")
  revalidatePath(`/dashboard/properties/${propertyId}`)
}

export async function createExpense(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to log expenses." }
  }

  const { organization } = membership
  const input = readExpense(formData)
  const problem = validate(input)
  if (problem) return { error: problem }

  const money = parseMoneyField(input.amount, organization.currency)
  if (!money.ok) return { error: "The amount must be a number." }
  if (money.minorUnits === null) return { error: "Enter the amount spent." }
  if (money.minorUnits <= 0) return { error: "The amount must be greater than zero." }

  // Confirms the property is ours, and is where the denormalised `orgId` below
  // comes from — a property row that was itself fetched by `orgId`.
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, orgId: organization.id },
    select: { id: true },
  })
  if (!property) return { error: "Choose a property in your organization." }

  let receipt = null
  const file = receiptFile(formData)
  if (file) {
    const quota = await receiptQuota(organization.id)
    if (!quota) return { error: "Your organization could not be found." }
    const stored = await saveReceipt(file, organization.id, quota)
    if (!stored.ok) return { error: stored.error }
    receipt = stored.receipt
  }

  const expense = await prisma.expense.create({
    data: {
      amount: money.minorUnits,
      category: input.category as ExpenseCategory,
      date: input.date!,
      description: input.description,
      propertyId: property.id,
      orgId: organization.id,
      receiptPath: receipt?.path ?? null,
      receiptName: receipt?.name ?? null,
      receiptType: receipt?.type ?? null,
      receiptSize: receipt?.size ?? null,
    },
  })

  revalidateExpense(property.id)
  return { success: "Expense logged.", redirect: `/dashboard/expenses/${expense.id}/edit` }
}

export async function updateExpense(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to edit expenses." }
  }

  const { organization } = membership
  const id = field(formData, "id")
  const input = readExpense(formData)
  const problem = validate(input)
  if (problem) return { error: problem }

  const money = parseMoneyField(input.amount, organization.currency)
  if (!money.ok) return { error: "The amount must be a number." }
  if (money.minorUnits === null) return { error: "Enter the amount spent." }
  if (money.minorUnits <= 0) return { error: "The amount must be greater than zero." }

  // Scoped by `orgId`, so another tenant's expense id matches nothing here.
  const existing = await prisma.expense.findFirst({
    where: { id, orgId: organization.id },
    select: { id: true, propertyId: true, receiptPath: true },
  })
  if (!existing) return { error: "That expense no longer exists." }

  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, orgId: organization.id },
    select: { id: true },
  })
  if (!property) return { error: "Choose a property in your organization." }

  const removeReceipt = field(formData, "removeReceipt") === "on"
  const file = receiptFile(formData)

  /*
   * A newly attached receipt replaces the old one, and an explicit "remove" clears
   * it. The old file is deleted only *after* the row has been updated to stop
   * pointing at it: if the unlink happened first and the write then failed, the
   * expense would reference a file that no longer exists.
   */
  let receipt = null
  if (file) {
    /*
     * The replaced receipt still counts toward the total here, even though it is
     * deleted moments from now. That is the conservative direction: it can only
     * refuse an upload that would have fitted, never accept one that would not.
     * Reading the total *after* the unlink instead would open a window where a
     * failed update leaves the row pointing at a file that is already gone.
     */
    const quota = await receiptQuota(organization.id)
    if (!quota) return { error: "Your organization could not be found." }
    const stored = await saveReceipt(file, organization.id, quota)
    if (!stored.ok) return { error: stored.error }
    receipt = stored.receipt
  }

  const keepExisting = !file && !removeReceipt

  await prisma.expense.updateMany({
    where: { id, orgId: organization.id },
    data: {
      amount: money.minorUnits,
      category: input.category as ExpenseCategory,
      date: input.date!,
      description: input.description,
      propertyId: property.id,
      receiptPath: keepExisting ? existing.receiptPath : (receipt?.path ?? null),
      receiptName: keepExisting ? undefined : (receipt?.name ?? null),
      receiptType: keepExisting ? undefined : (receipt?.type ?? null),
      receiptSize: keepExisting ? undefined : (receipt?.size ?? null),
    },
  })

  if (!keepExisting && existing.receiptPath) {
    await deleteReceipt(existing.receiptPath)
  }

  revalidateExpense(property.id)
  // The expense may have been moved to a different property, which leaves the
  // old one's page showing a cost it no longer carries.
  if (existing.propertyId !== property.id) revalidateExpense(existing.propertyId)
  revalidatePath(`/dashboard/expenses/${id}/edit`)
  return { success: "Expense updated." }
}

export async function deleteExpense(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const membership = await currentMembership()
  if (!membership) return { error: "Your session has expired. Please sign in again." }
  if (!canManage(membership.user.role)) {
    return { error: "You do not have permission to delete expenses." }
  }

  const id = field(formData, "id")

  // Read first to learn which file to remove; the delete below is still scoped by
  // `orgId`, so this read never authorises anything on its own.
  const expense = await prisma.expense.findFirst({
    where: { id, orgId: membership.organization.id },
    select: { id: true, propertyId: true, receiptPath: true },
  })
  if (!expense) return { error: "That expense no longer exists." }

  const { count } = await prisma.expense.deleteMany({
    where: { id, orgId: membership.organization.id },
  })
  if (count === 0) return { error: "That expense no longer exists." }

  if (expense.receiptPath) await deleteReceipt(expense.receiptPath)

  revalidateExpense(expense.propertyId)
  return { success: "Expense deleted.", redirect: "/dashboard/expenses" }
}
