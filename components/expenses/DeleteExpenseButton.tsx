"use client"

import { useActionState } from "react"
import { Trash2 } from "lucide-react"
import { deleteExpense } from "@/app/actions/expenses"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { Button } from "@/components/ui/Button"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DeleteExpenseButtonProps {
  expenseId: string
  /** Shown in the confirmation so the right row is obviously the one going. */
  description: string
  hasReceipt: boolean
}

export function DeleteExpenseButton({
  expenseId,
  description,
  hasReceipt,
}: DeleteExpenseButtonProps) {
  const { t } = useI18n()
  const [state, formAction] = useActionState(deleteExpense, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t.common.delete}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-foreground">{t.pages.expenses.deleteTitle}</DialogTitle>
          <DialogDescription>
            {description} — {t.pages.expenses.deleteHelp}
            {hasReceipt ? " " + t.pages.expenses.deleteWithReceipt : ""}
          </DialogDescription>
        </DialogHeader>

        <FormMessage error={state.error} />

        <form action={formAction}>
          <input type="hidden" name="id" value={expenseId} />
          <DialogFooter className="gap-2">
            <SubmitButton variant="destructive" pendingLabel={t.common.deleting}>
              {t.common.delete}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
