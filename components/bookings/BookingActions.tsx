"use client"

import { useActionState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { deleteBooking } from "@/app/actions/bookings"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { Button } from "@/components/ui/Button"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { format } from "@/lib/i18n/dictionaries"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface BookingActionsProps {
  bookingId: string
  guestName: string
}

/** Edit link plus a delete confirmation, for the booking detail header. */
export function BookingActions({ bookingId, guestName }: BookingActionsProps) {
  const { t } = useI18n()
  const [state, formAction] = useActionState(deleteBooking, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  return (
    <>
      <Button variant="outline" href={`/dashboard/bookings/${bookingId}/edit`}>
        <Pencil className="mr-2 h-4 w-4" />
        {t.common.edit}
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            {t.common.delete}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">{t.confirm.deleteBookingTitle}</DialogTitle>
            <DialogDescription>
              {format(t.confirm.deleteBookingBody, { guest: guestName })}
            </DialogDescription>
          </DialogHeader>

          <FormMessage error={state.error} />

          <form action={formAction}>
            <input type="hidden" name="id" value={bookingId} />
            <DialogFooter className="gap-2">
              <SubmitButton variant="destructive" pendingLabel={t.common.deleting}>
                {t.confirm.deleteBooking}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
