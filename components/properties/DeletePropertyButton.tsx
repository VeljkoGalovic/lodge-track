"use client"

import { useActionState } from "react"
import { Trash2 } from "lucide-react"
import { deleteProperty } from "@/app/actions/properties"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { Button } from "@/components/ui/Button"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
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
  const [state, formAction] = useActionState(deleteProperty, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-white">Delete {propertyName}?</DialogTitle>
          <DialogDescription>
            This cannot be undone.
            {bookingCount > 0
              ? ` Its ${bookingCount} booking${bookingCount === 1 ? "" : "s"} will be deleted with it.`
              : " It has no bookings."}
          </DialogDescription>
        </DialogHeader>

        <FormMessage error={state.error} />

        <form action={formAction}>
          <input type="hidden" name="id" value={propertyId} />
          <DialogFooter className="gap-2">
            <SubmitButton variant="destructive" pendingLabel="Deleting...">
              Delete property
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
