"use client"

import { useActionState, useState } from "react"
import { BookingStatus } from "@prisma/client"
import { createBooking, updateBooking } from "@/app/actions/bookings"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { BOOKING_STATUS_STYLES } from "@/lib/booking-status"
import { toMajorUnits } from "@/lib/currency"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"

/** Common booking sources, offered as suggestions rather than a closed list. */
const SOURCE_SUGGESTIONS = ["Direct", "Airbnb", "Booking.com", "Expedia", "VRBO", "Phone"]

interface BookingFormProps {
  properties: { id: string; name: string }[]
  /** ISO 4217 code, used to label and pre-fill the rate field. */
  currency: string
  booking?: {
    id: string
    propertyId: string
    guestName: string
    startDate: Date
    endDate: Date
    source: string
    status: BookingStatus
    totalAmount: number | null
  }
}

/** A `Date` as the `YYYY-MM-DD` a date input expects, in local time. */
function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function BookingForm({ properties, currency, booking }: BookingFormProps) {
  const action = booking ? updateBooking : createBooking
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  /**
   * The rate field is optional, and "not recorded" is a state the schema keeps
   * deliberately — so the nights-based suggestion is offered as a button the
   * person chooses, never written into the field for them.
   */
  const [start, setStart] = useState(booking ? toDateInput(booking.startDate) : "")
  const [end, setEnd] = useState(booking ? toDateInput(booking.endDate) : "")
  const [amount, setAmount] = useState(
    booking?.totalAmount != null ? toMajorUnits(booking.totalAmount, currency) : ""
  )

  const nights = Math.round(
    (new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) /
      (24 * 60 * 60 * 1000)
  )

  return (
    <form action={formAction} className="space-y-5">
      {booking && <input type="hidden" name="id" value={booking.id} />}

      <FormMessage error={state.error} success={state.success} />

      {properties.length === 0 ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-300">
          Add a property before creating a booking — every stay belongs to one.
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="propertyId" className="text-sm font-medium text-slate-300">
          Property
        </label>
        <Select
          id="propertyId"
          name="propertyId"
          defaultValue={booking?.propertyId ?? properties[0]?.id ?? ""}
          required
        >
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="guestName" className="text-sm font-medium text-slate-300">
          Guest name
        </label>
        <Input
          id="guestName"
          name="guestName"
          defaultValue={booking?.guestName ?? ""}
          placeholder="Ana Petrović"
          required
          maxLength={120}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="startDate" className="text-sm font-medium text-slate-300">
            Check-in
          </label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
            className="[color-scheme:dark]"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="endDate" className="text-sm font-medium text-slate-300">
            Check-out
          </label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
            className="[color-scheme:dark]"
          />
        </div>
      </div>

      {start && end ? (
        <p className="text-xs text-slate-500">
          {nights > 0
            ? `${nights} night${nights === 1 ? "" : "s"}`
            : "The check-out date must be on or after the check-in date."}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium text-slate-300">
            Status
          </label>
          <Select id="status" name="status" defaultValue={booking?.status ?? "PENDING"}>
            {Object.values(BookingStatus).map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_STYLES[status].label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="source" className="text-sm font-medium text-slate-300">
            Source
          </label>
          <Input
            id="source"
            name="source"
            defaultValue={booking?.source ?? "Direct"}
            list="booking-sources"
            maxLength={60}
          />
          <datalist id="booking-sources">
            {SOURCE_SUGGESTIONS.map((source) => (
              <option key={source} value={source} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="totalAmount" className="text-sm font-medium text-slate-300">
          Total rate in {currency} <span className="text-slate-500">(optional)</span>
        </label>
        <Input
          id="totalAmount"
          name="totalAmount"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="450.00"
        />
        <p className="text-xs text-slate-500">
          Leave empty if the rate is not known. Revenue totals skip unpriced stays rather than
          guessing at them.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton pendingLabel="Saving...">
          {booking ? "Save changes" : "Add booking"}
        </SubmitButton>
      </div>
    </form>
  )
}
