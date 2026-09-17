"use client"

import { useActionState, useMemo, useState } from "react"
import { BookingStatus } from "@prisma/client"
import { createBooking, updateBooking } from "@/app/actions/bookings"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { unitAvailability, type BusyInterval } from "@/lib/availability"
import { BOOKING_STATUS_STYLES } from "@/lib/booking-status"
import { toMajorUnits } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { format, NIGHT_FORMS, plural } from "@/lib/i18n/dictionaries"

/** Common booking sources, offered as suggestions rather than a closed list. */
const SOURCE_SUGGESTIONS = ["Direct", "Airbnb", "Booking.com", "Expedia", "VRBO", "Phone"]

interface BookingFormProps {
  properties: { id: string; name: string }[]
  /**
   * Every unit in the organization, each naming its own property. Passed flat
   * rather than nested under the properties so the form can filter to the chosen
   * property in the browser, without a round-trip when the selection changes.
   */
  units: { id: string; propertyId: string; name: string; kind: string | null }[]
  /**
   * Every stay that occupies something, for the whole organization, reduced to
   * which unit and when. Date-only so the picker below can answer "which units
   * are free on these dates" without asking the server on each keystroke.
   */
  busy: BusyInterval[]
  /** ISO 4217 code, used to label and pre-fill the rate field. */
  currency: string
  booking?: {
    id: string
    propertyId: string
    unitId: string | null
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

export function BookingForm({ properties, units, busy, currency, booking }: BookingFormProps) {
  const { locale, t } = useI18n()
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
  /**
   * Held in state so the unit picker below can follow it. The select itself is
   * keyed on this value, so changing the property remounts it at "whole
   * property" — a unit chosen for one property is never carried over to another,
   * where it would be a unit the server would refuse anyway.
   */
  const [propertyId, setPropertyId] = useState(booking?.propertyId ?? properties[0]?.id ?? "")

  const unitsHere = useMemo(
    () => units.filter((unit) => unit.propertyId === propertyId),
    [units, propertyId]
  )

  const nights = Math.round(
    (new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) /
      (24 * 60 * 60 * 1000)
  )

  /**
   * Which units this property could take the stay in, recomputed as the dates
   * change.
   *
   * The very same `unitAvailability` the server relies on to refuse a conflicting
   * booking, run in the browser so the answer arrives while the host is still
   * choosing rather than after they submit. It is a pure function over data
   * already on the page — no request is made — which is the whole reason `busy`
   * is handed down instead of being looked up per date range.
   *
   * Null until both dates are set and the range is sane: a stay with an open end
   * has no availability, and reporting every unit as free for one would be worse
   * than reporting nothing.
   */
  const availability = useMemo(() => {
    if (!start || !end || nights <= 0 || unitsHere.length === 0) return null
    return unitAvailability(
      { startDate: new Date(`${start}T00:00:00`), endDate: new Date(`${end}T00:00:00`) },
      unitsHere,
      busy
    )
  }, [start, end, nights, unitsHere, busy])

  const statusByUnitId = useMemo(
    () => new Map((availability ?? []).map((entry) => [entry.unit.id, entry])),
    [availability]
  )

  const freeCount = availability?.filter((entry) => entry.available).length ?? 0
  /** Every unit taken because a whole-property stay covers the range. */
  const wholePropertyBlocked =
    availability !== null && freeCount === 0 && availability.every((e) => e.blockedByWholeProperty)

  return (
    <form action={formAction} className="space-y-5">
      {booking && <input type="hidden" name="id" value={booking.id} />}

      <FormMessage error={state.error} success={state.success} />

      {properties.length === 0 ? (
        <div className="rounded-xl border border-warning/20 bg-warning/[0.06] px-4 py-3 text-sm text-warning">
          {t.forms.needsProperty}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="propertyId" className="text-sm font-medium text-muted-foreground">
          {t.forms.property}
        </label>
        <Select
          id="propertyId"
          name="propertyId"
          value={propertyId}
          onChange={(event) => setPropertyId(event.target.value)}
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
          <label htmlFor="startDate" className="text-sm font-medium text-muted-foreground">
            {t.forms.checkIn}
          </label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="endDate" className="text-sm font-medium text-muted-foreground">
            {t.forms.checkOut}
          </label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </div>
      </div>

      {start && end ? (
        <p className="text-xs text-subtle-foreground">
          {nights > 0 ? plural(nights, NIGHT_FORMS[locale], locale) : t.forms.checkOutAfterCheckIn}
        </p>
      ) : null}

      {unitsHere.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="unitId" className="text-sm font-medium text-muted-foreground">
              {t.forms.unit}
            </label>
            {availability ? (
              <span className="text-xs tabular-nums text-subtle-foreground">
                {format(t.availability.showsFree, {
                  count: freeCount,
                  total: availability.length,
                })}
              </span>
            ) : null}
          </div>

          {/* Keyed on the property, so a unit picked for one property is not
              carried over to another where it does not exist. */}
          <Select key={propertyId} id="unitId" name="unitId" defaultValue={booking?.unitId ?? ""}>
            <option value="">{t.forms.unitWholeProperty}</option>
            {unitsHere.map((unit) => {
              const taken = statusByUnitId.get(unit.id)?.available === false
              return (
                <option key={unit.id} value={unit.id} disabled={taken}>
                  {unit.kind ? `${unit.name} — ${unit.kind}` : unit.name}
                  {taken ? ` · ${t.availability.occupied}` : ""}
                </option>
              )
            })}
          </Select>

          {/*
            A read-only mirror of the select's own state. The select answers
            "which one do I want", which a closed dropdown hides until it is
            opened; this answers "what is the situation", which is the question a
            host picking a room for a caller is actually asking.
          */}
          {availability ? (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {availability.map((entry) => (
                <li
                  key={entry.unit.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                    entry.available
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border bg-muted text-subtle-foreground"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      entry.available ? "bg-primary" : "bg-subtle-foreground"
                    )}
                  />
                  {entry.unit.name}
                  <span className="sr-only">
                    {entry.available ? t.availability.free : t.availability.occupied}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-subtle-foreground">{t.forms.chooseDates}</p>
          )}

          <p className="text-xs text-subtle-foreground">
            {wholePropertyBlocked ? t.availability.wholePropertyBlocked : t.forms.unitHelp}
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="guestName" className="text-sm font-medium text-muted-foreground">
          {t.forms.guestName}
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
          <label htmlFor="status" className="text-sm font-medium text-muted-foreground">
            {t.forms.status}
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
          <label htmlFor="source" className="text-sm font-medium text-muted-foreground">
            {t.forms.source}
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
        <label htmlFor="totalAmount" className="text-sm font-medium text-muted-foreground">
          {format(t.forms.rate, { currency })}{" "}
          <span className="text-subtle-foreground">({t.common.optional})</span>
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
        <p className="text-xs text-subtle-foreground">{t.forms.rateHelp}</p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton pendingLabel={t.common.saving}>
          {booking ? t.forms.saveChanges : t.forms.addBooking}
        </SubmitButton>
      </div>
    </form>
  )
}
