"use client"

import { useActionState, useState } from "react"
import type { ExpenseCategory } from "@prisma/client"
import { createExpense, updateExpense } from "@/app/actions/expenses"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_STYLES } from "@/lib/expense-category"
import { toMajorUnits } from "@/lib/currency"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { format } from "@/lib/i18n/dictionaries"
import { Paperclip, X } from "lucide-react"
import { AttachmentUploader, type StoredAttachment } from "@/components/attachments/AttachmentUploader"
import { useAttachmentUpload } from "@/hooks/useAttachmentUpload"
import { useSession } from "next-auth/react"

/** Mirrors MAX_RECEIPT_BYTES in lib/storage.ts — the copy and the real cap must agree. */
const MAX_RECEIPT_MB = 5
const RECEIPT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp"

interface ExpenseFormProps {
  properties: { id: string; name: string }[]
  /** ISO 4217 code, used to label and pre-fill the amount field. */
  currency: string
  orgId: string
  expense?: {
    id: string
    propertyId: string
    amount: number
    category: ExpenseCategory
    date: Date
    description: string
    receiptName: string | null
    /** Drives the "remove" control; the file itself is behind /api/receipts. */
    hasReceipt: boolean
    attachments?: StoredAttachment[]
  }
}

/** A `Date` as the `YYYY-MM-DD` a date input expects, in local time. */
function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function ExpenseForm({ properties, currency, orgId, expense }: ExpenseFormProps) {
  const { t } = useI18n()
  const { data: session } = useSession()
  const action = expense ? updateExpense : createExpense
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  const [fileName, setFileName] = useState<string | null>(null)
  const [uploadedAttachments, setUploadedAttachments] = useState<StoredAttachment[]>(expense?.attachments || [])

  const { upload: uploadAttachment, deleteAttachment: deleteAttachmentHook, uploading: attachmentUploading } = useAttachmentUpload(orgId)

  const handleUploadComplete = (attachment: StoredAttachment) => {
    setUploadedAttachments((prev) => [...prev, attachment])
    setFileName(null)
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    const success = await deleteAttachmentHook(attachmentId)
    if (success) {
      setUploadedAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    }
  }

  const existingAttachment = expense?.attachments?.[0]

  return (
    <form action={formAction} className="space-y-5">
      {expense && <input type="hidden" name="id" value={expense.id} />}

      <FormMessage error={state.error} success={state.success} />

      {properties.length === 0 ? (
        <div className="rounded-xl border border-warning/20 bg-warning/[0.06] px-4 py-3 text-sm text-warning">
          {t.forms.needsPropertyForExpense}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="propertyId" className="text-sm font-medium text-muted-foreground">
          {t.forms.property}
        </label>
        <Select
          id="propertyId"
          name="propertyId"
          defaultValue={expense?.propertyId ?? properties[0]?.id ?? ""}
          required
        >
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
            {format(t.forms.amount, { currency })}
          </label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={expense ? toMajorUnits(expense.amount, currency) : ""}
            placeholder="120.00"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-medium text-muted-foreground">
            {t.forms.expenseDate}
          </label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={expense ? toDateInput(expense.date) : ""}
            required
            className=""
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="category" className="text-sm font-medium text-muted-foreground">
          {t.forms.category}
        </label>
        <Select id="category" name="category" defaultValue={expense?.category ?? "MAINTENANCE"}>
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {EXPENSE_CATEGORY_STYLES[category].label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium text-muted-foreground">
          {t.forms.expenseDescription}
        </label>
        <Textarea
          id="description"
          name="description"
          defaultValue={expense?.description ?? ""}
          placeholder={t.forms.expensePlaceholder}
          maxLength={300}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="receipt" className="text-sm font-medium text-muted-foreground">
          {t.forms.receipt}{" "}
          <span className="text-subtle-foreground">({t.common.optional})</span>
        </label>

        <AttachmentUploader
          module="EXPENSE"
          moduleId={expense?.id || "new"}
          orgId={orgId}
          onUploadComplete={handleUploadComplete}
          maxFiles={1}
          accept={RECEIPT_ACCEPT}
          maxSizeMB={MAX_RECEIPT_MB}
          disabled={attachmentUploading}
          existingAttachments={uploadedAttachments}
          onDelete={handleDeleteAttachment}
        />

        <p className="text-xs text-subtle-foreground">
          {fileName
            ? format(t.forms.willUpload, { name: fileName })
            : expense?.hasReceipt
              ? t.forms.receiptReplace
              : format(t.forms.receiptHelp, { max: MAX_RECEIPT_MB })}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton pendingLabel={t.common.saving} disabled={attachmentUploading}>
          {expense ? t.forms.saveChanges : t.forms.logExpense}
        </SubmitButton>
      </div>
    </form>
  )
}
