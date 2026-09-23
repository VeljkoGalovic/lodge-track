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
import { deleteAttachment, saveAttachment, MAX_ATTACHMENT_BYTES } from "@/lib/storage"
import { attachmentQuota } from "@/lib/attachment-quota"
import { serializable } from "@/lib/transaction"

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

  const { organization, user } = membership
  const input = readExpense(formData)
  const problem = validate(input)
  if (problem) return { error: problem }

  const money = parseMoneyField(input.amount, organization.currency)
  if (!money.ok) return { error: "The amount must be a number." }
  if (money.minorUnits === null) return { error: "Enter the amount spent." }
  if (money.minorUnits <= 0) return { error: "The amount must be greater than zero." }
  // After the checks above, minorUnits is guaranteed to be a positive number
  const minorUnits = money.minorUnits

  const file = receiptFile(formData)

  // Wrap the entire operation in a serializable transaction to prevent
  // race conditions on attachment quota checks.
  return serializable(async (tx) => {
    // Confirms the property is ours, and is where the denormalised `orgId` below
    // comes from — a property row that was itself fetched by `orgId`.
    const property = await tx.property.findFirst({
      where: { id: input.propertyId, orgId: organization.id },
      select: { id: true },
    })
    if (!property) return { error: "Choose a property in your organization." }

    let attachment = null
    let quota = null
    if (file) {
      quota = await attachmentQuota(tx, organization.id)
      if (!quota) return { error: "Your organization could not be found." }
      const stored = await saveAttachment(file, organization.id, "EXPENSE", "", quota, user.id, tx)
      if (!stored.ok) return { error: stored.error }
      attachment = stored.attachment
    }

    const expense = await tx.expense.create({
      data: {
        amount: minorUnits,
        category: input.category as ExpenseCategory,
        date: input.date!,
        description: input.description,
        propertyId: property.id,
        orgId: organization.id,
        // Legacy receipt fields (for backwards compatibility during migration)
        receiptPath: attachment?.path ?? null,
        receiptName: attachment?.name ?? null,
        receiptType: attachment?.type ?? null,
        receiptSize: attachment?.size ?? null,
        // New unified attachments
        attachments: attachment
          ? {
              create: {
                module: "EXPENSE",
                orgId: organization.id,
                bucket: "attachments",
                objectPath: attachment.path,
                supabaseId: attachment.supabaseId,
                fileName: attachment.name,
                mimeType: attachment.type,
                fileSize: attachment.size,
                checksum: attachment.checksum,
                uploadedById: user.id,
              },
            }
          : undefined,
      },
    })

    // Update the attachment with the actual expense ID (moduleId)
    if (attachment) {
      await tx.attachment.update({
        where: { id: (await tx.attachment.findFirst({ where: { objectPath: attachment.path } }))?.id },
        data: { moduleId: expense.id },
      })
    }

    revalidateExpense(property.id)
    return { success: "Expense logged.", redirect: `/dashboard/expenses/${expense.id}/edit` }
  })
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

  const { organization, user } = membership
  const id = field(formData, "id")
  const input = readExpense(formData)
  const problem = validate(input)
  if (problem) return { error: problem }

  const money = parseMoneyField(input.amount, organization.currency)
  if (!money.ok) return { error: "The amount must be a number." }
  if (money.minorUnits === null) return { error: "Enter the amount spent." }
  if (money.minorUnits <= 0) return { error: "The amount must be greater than zero." }
  // After the checks above, minorUnits is guaranteed to be a positive number
  const minorUnits = money.minorUnits

  // Scoped by `orgId`, so another tenant's expense id matches nothing here.
  const existing = await prisma.expense.findFirst({
    where: { id, orgId: organization.id },
    select: { id: true, propertyId: true, receiptPath: true, attachments: { select: { id: true, objectPath: true } } },
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
   *
   * Wrap the entire operation in a serializable transaction to prevent
   * race conditions on attachment quota checks and ensure atomicity.
   */
  const result = await serializable(async (tx): Promise<ActionState> => {
    let attachment = null
    let quota = null

    if (file) {
      quota = await attachmentQuota(tx, organization.id)
      if (!quota) return { error: "Your organization could not be found." }
      const stored = await saveAttachment(file, organization.id, "EXPENSE", id, quota, user.id, tx)
      if (!stored.ok) return { error: stored.error }
      attachment = stored.attachment
    }

    const keepExisting = !file && !removeReceipt

    // Update expense with legacy fields (for backwards compatibility)
    await tx.expense.updateMany({
      where: { id, orgId: organization.id },
      data: {
        amount: minorUnits,
        category: input.category as ExpenseCategory,
        date: input.date!,
        description: input.description,
        propertyId: property.id,
        receiptPath: keepExisting ? existing.receiptPath : (attachment?.path ?? null),
        receiptName: keepExisting ? undefined : (attachment?.name ?? null),
        receiptType: keepExisting ? undefined : (attachment?.type ?? null),
        receiptSize: keepExisting ? undefined : (attachment?.size ?? null),
      },
    })

    // Handle new attachment record
    if (attachment) {
      // Delete old attachment records for this expense
      const oldAttachments = await tx.attachment.findMany({
        where: { orgId: organization.id, module: "EXPENSE", moduleId: id },
        select: { id: true, objectPath: true },
      })

      for (const oldAtt of oldAttachments) {
        await deleteAttachment(oldAtt.objectPath)
      }

      await tx.attachment.deleteMany({
        where: { orgId: organization.id, module: "EXPENSE", moduleId: id },
      })

      // Create new attachment record
      await tx.attachment.create({
        data: {
          module: "EXPENSE",
          moduleId: id,
          orgId: organization.id,
          bucket: "attachments",
          objectPath: attachment.path,
          supabaseId: attachment.supabaseId,
          fileName: attachment.name,
          mimeType: attachment.type,
          fileSize: attachment.size,
          checksum: attachment.checksum,
          uploadedById: user.id,
        },
      })
    } else if (removeReceipt) {
      // Remove all attachments for this expense
      const oldAttachments = await tx.attachment.findMany({
        where: { orgId: organization.id, module: "EXPENSE", moduleId: id },
        select: { id: true, objectPath: true },
      })

      for (const oldAtt of oldAttachments) {
        await deleteAttachment(oldAtt.objectPath)
      }

      await tx.attachment.deleteMany({
        where: { orgId: organization.id, module: "EXPENSE", moduleId: id },
      })
    }

    if (!keepExisting && existing.receiptPath) {
      await deleteAttachment(existing.receiptPath)
    }

    revalidateExpense(property.id)
    // The expense may have been moved to a different property, which leaves the
    // old one's page showing a cost it no longer carries.
    if (existing.propertyId !== property.id) revalidateExpense(existing.propertyId)
    revalidatePath(`/dashboard/expenses/${id}/edit`)
    return { success: "Expense updated." }
  })

  return result
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
    select: { id: true, propertyId: true, receiptPath: true, attachments: { select: { id: true, objectPath: true } } },
  })
  if (!expense) return { error: "That expense no longer exists." }

  const result = await serializable(async (tx): Promise<{ error?: string; success?: string; redirect?: string; propertyId: string }> => {
    // Delete attachment records and files
    if (expense.attachments && expense.attachments.length > 0) {
      for (const att of expense.attachments) {
        await deleteAttachment(att.objectPath)
      }
      await tx.attachment.deleteMany({
        where: { orgId: membership.organization.id, module: "EXPENSE", moduleId: id },
      })
    }

    const { count } = await tx.expense.deleteMany({
      where: { id, orgId: membership.organization.id },
    })
    if (count === 0) return { error: "That expense no longer exists.", propertyId: "" }

    if (expense.receiptPath) await deleteAttachment(expense.receiptPath)

    return { success: "Expense deleted.", redirect: "/dashboard/expenses", propertyId: expense.propertyId }
  })

  if (result.propertyId) revalidateExpense(result.propertyId)
  return { success: result.success, redirect: result.redirect }
}