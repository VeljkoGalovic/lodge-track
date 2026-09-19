"use client"

import { startTransition, useActionState } from "react"
import { BookingStatus } from "@prisma/client"
import { setBookingStatus } from "@/app/actions/bookings"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { getBookingStatusStyle } from "@/lib/booking-status"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { useI18n } from "@/components/i18n/LocaleProvider"

export function BookingStatusSelect({ bookingId, status, guestName }: {
  bookingId: string
  status: BookingStatus
  guestName: string
}) {
  const { t } = useI18n()
  const [state, dispatch, pending] = useActionState(async (previous: ReturnType<typeof initialState>, data: FormData) => {
    const result = await setBookingStatus(previous, data)
    return { ...result, status: result.success ? data.get("status") as BookingStatus : previous.status }
  }, initialState(status))

  return (
    <div className="space-y-2">
      <Select
        aria-label={`${t.forms.status} — ${guestName}`}
        aria-busy={pending}
        value={state.status}
        disabled={pending}
        className={`h-auto rounded-full text-xs font-medium ${getBookingStatusStyle(state.status).badge}`}
        onChange={event => {
          const data = new FormData()
          data.set("id", bookingId)
          data.set("status", event.target.value)
          startTransition(() => dispatch(data))
        }}
      >
        {Object.values(BookingStatus).map(value => (
          <option key={value} value={value}>{t.pages.bookings.statuses[value]}</option>
        ))}
      </Select>
      {pending ? <p role="status" className="text-xs text-subtle-foreground">{t.common.saving}</p> : null}
      <FormMessage error={state.error} />
    </div>
  )
}

function initialState(status: BookingStatus) {
  return { ...EMPTY_ACTION_STATE, status }
}
