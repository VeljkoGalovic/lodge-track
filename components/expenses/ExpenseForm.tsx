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

/** Mirrors MAX_RECEIPT_BYTES in lib/storage.ts — the copy and the real cap must agree. */
const MAX_RECEIPT_MB = 5
const RECEIPT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp"

interface ExpenseFormProps {
  properties: { id: string; name: string }[]
  /** ISO 4217 code, used to label and pre-fill the amount field. */
  currency: string
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
  }
}

/** A `Date` as the `YYYY-MM-DD` a date input expects, in local time. */
function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function ExpenseForm({ properties, currency, expense }: ExpenseFormProps) {
  const { t } = useI18n()
  const action = expense ? updateExpense : createExpense
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  /**
   * The filename is shown from state so choosing a replacement updates the label
   * before the form is submitted — the file input itself cannot be controlled.
   */
  const [fileName, setFileName] = useState<string | null>(null)

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
          placeholder="Replaced the upstairs water heater element"
          maxLength={300}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="receipt" className="text-sm font-medium text-muted-foreground">
          {t.forms.receipt}{" "}
          <span className="text-subtle-foreground">({t.common.optional})</span>
        </label>

        {expense?.hasReceipt ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted px-4 py-3">
            <a
              href={`/api/receipts/${expense.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-2 text-sm text-primary hover:underline"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="truncate">{expense.receiptName ?? t.forms.attachedReceipt}</span>
            </a>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-subtle-foreground">
              <input
                type="checkbox"
                name="removeReceipt"
                className="h-3.5 w-3.5 accent-primary"
              />
              <X className="h-3.5 w-3.5" />
              {t.common.remove}
            </label>
          </div>
        ) : null}

        <input
          id="receipt"
          name="receipt"
          type="file"
          accept={RECEIPT_ACCEPT}
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          className="block w-full cursor-pointer rounded-xl border border-border bg-card text-sm text-subtle-foreground file:mr-3 file:cursor-pointer file:rounded-l-xl file:border-0 file:bg-raised file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-raised-hover"
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
        <SubmitButton pendingLabel={t.common.saving}>
          {expense ? t.forms.saveChanges : t.forms.logExpense}
        </SubmitButton>
      </div>
    </form>
  )
}
