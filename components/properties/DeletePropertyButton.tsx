"use client"

import { useActionState } from "react"
import { Trash2 } from "lucide-react"
import { deleteProperty } from "@/app/actions/properties"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { Button } from "@/components/ui/Button"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { BOOKING_COUNT_FORMS, format, plural } from "@/lib/i18n/dictionaries"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DeletePropertyButtonProps {
  propertyId: string
  propertyName: string
  /** Disclosed in the confirmation, because deleting the property deletes these too. */
  bookingCount: number
}

export function DeletePropertyButton({
  propertyId,
  propertyName,
  bookingCount,
}: DeletePropertyButtonProps) {
  const { locale, t } = useI18n()
  const [state, formAction] = useActionState(deleteProperty, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t.common.delete}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {format(t.confirm.deletePropertyTitle, { name: propertyName })}
          </DialogTitle>
          <DialogDescription>
            {bookingCount > 0
              ? format(t.confirm.deletePropertyWithBookings, {
                  bookings: plural(bookingCount, BOOKING_COUNT_FORMS[locale], locale),
                })
              : t.confirm.deletePropertyNoBookings}
          </DialogDescription>
        </DialogHeader>

        <FormMessage error={state.error} />

        <form action={formAction}>
          <input type="hidden" name="id" value={propertyId} />
          <DialogFooter className="gap-2">
            <SubmitButton variant="destructive" pendingLabel={t.common.deleting}>
              {t.confirm.deleteProperty}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
