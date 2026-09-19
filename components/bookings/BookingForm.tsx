"use client"

import { useActionState, useMemo, useState } from "react"
import { BookingStatus } from "@prisma/client"
import { createBooking, updateBooking } from "@/app/actions/bookings"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { unitAvailability, rangesOverlap, claimsSameSlot, type BusyInterval } from "@/lib/availability"
import { toMajorUnits } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { BedCapacity } from "@/components/dashboard/BedCapacity"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { format, NIGHT_FORMS, plural } from "@/lib/i18n/dictionaries"

/** Common booking sources, offered as suggestions rather than a closed list. */
const SOURCE_SUGGESTIONS = ["Direct", "Airbnb", "Booking.com", "Expedia", "VRBO", "Phone"]

interface BookingFormProps {
  properties: { id: string; name: string; allowSharedBookings: boolean }[]
  /**
   * Every unit in the organization, each naming its own property. Passed flat
   * rather than nested under the properties so the form can filter to the chosen
   * property in the browser, without a round-trip when the selection changes.
   */
  units: { id: string; propertyId: string; name: string; kind: string | null }[]
  /**
   * Every stay that occupies something, for the whole organization, reduced to
   * what it claims and when. Date-only so the picker below can answer "which
   * beds are free on these dates" without asking the server on each keystroke.
   */
  busy: BusyInterval[]
  /** ISO 4217 code, used to label and pre-fill the rate field. */
  currency: string
  booking?: {
    id: string
    propertyId: string
    type: "WHOLE_UNIT" | "SHARED_BED"
    unitId: string | null
    bedIds: string[]
    guestName: string
    startDate: Date
    endDate: Date
    source: string
    status: BookingStatus
    totalAmount: number | null
  }
}

/** How the form claims the property, mapped onto the server action's contract. */
type BookingMode = "whole" | "beds" | "unit"

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
   * Changing the property explicitly resets the controlled selections. A bed or
   * unit chosen for one property is never carried over to another property.
   */
  const [propertyId, setPropertyId] = useState(booking?.propertyId ?? properties[0]?.id ?? "")

  const property = properties.find((entry) => entry.id === propertyId)
  /**
   * Only a property that opted into shared bookings shows the mode choice and
   * the bed picker. Everyone else — including every property that existed
   * before the flag — sees exactly the form they saw before: whole-property or
   * one unit, nothing else.
   */
  const isShared = property?.allowSharedBookings ?? false

  const [mode, setMode] = useState<BookingMode>(
    booking?.type === "SHARED_BED" ? "beds" : isShared ? "whole" : "unit"
  )
  const [unitId, setUnitId] = useState(booking?.unitId ?? "")
  const [selectedBeds, setSelectedBeds] = useState<string[]>(
    booking?.type === "SHARED_BED" ? booking.bedIds : []
  )
  const [status, setStatus] = useState<BookingStatus>(booking?.status ?? "PENDING")

  const unitsHere = useMemo(
    () => units.filter((unit) => unit.propertyId === propertyId),
    [units, propertyId]
  )

  const nights = Math.round(
    (new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) /
      (24 * 60 * 60 * 1000)
  )

  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)

  /**
   * Which bed slots this property could take the stay in, recomputed as the
   * dates change.
   *
   * Uses the same range and slot rules as the server's conflict check,
   * run in the browser so the answer arrives while the host is still
   * choosing rather than after they submit. It is a pure function over data
   * already on the page — no request is made — which is the whole reason `busy`
   * is handed down instead of being looked up per date range.
   *
   * Null until both dates are set and the range is sane: a stay with an open end
   * has no availability, and reporting every bed as free for one would be worse
   * than reporting nothing.
   */
  const availability = useMemo(() => {
    if (!start || !end || nights <= 0 || unitsHere.length === 0) return null
    return unitAvailability(
      { propertyId, startDate: new Date(`${start}T00:00:00`), endDate: new Date(`${end}T00:00:00`) },
      unitsHere,
      busy
    )
  }, [start, end, nights, propertyId, unitsHere, busy])

  const statusByUnitId = useMemo(
    () => new Map((availability ?? []).map((entry) => [entry.unit.id, entry])),
    [availability]
  )

  const freeCount = availability?.filter((entry) => entry.available).length ?? 0
  /** Every slot taken because a whole-property stay covers the range. */
  const wholePropertyBlocked =
    availability !== null && freeCount === 0 && availability.every((e) => e.blockedByWholeProperty)

  const wholeUnavailable = nights > 0 && busy.some(interval =>
    interval.propertyId === propertyId && rangesOverlap(startDate, endDate, interval.startDate, interval.endDate)
  )
  /**
   * The claim the form will actually submit, checked against the same rules the
   * server applies. `unit` mode is the pre-shared form: one named unit or the
   * whole property. `whole` mode is the exclusive claim — any overlapping stay
   * on the property collides with it. `beds` mode collides only when a chosen
   * bed is itself taken.
   */
  const selectionUnavailable =
    status !== "CANCELLED" && nights > 0 &&
    (mode === "beds"
      ? selectedBeds.some((bed) => statusByUnitId.get(bed)?.available === false)
      : mode === "whole"
        ? wholeUnavailable
        : busy.some(interval =>
            interval.propertyId === propertyId && claimsSameSlot({ type: "WHOLE_UNIT", unitId: unitId || null, bedIds: [] }, interval) &&
            rangesOverlap(startDate, endDate, interval.startDate, interval.endDate)
          ))

  const bedsSubmitBlocked = mode === "beds" && selectedBeds.length === 0

  /** Property changes reset every claim selection, whatever mode follows. */
  function onPropertyChange(nextId: string) {
    setPropertyId(nextId)
    setUnitId("")
    setSelectedBeds([])
    const nextShared = properties.find((entry) => entry.id === nextId)?.allowSharedBookings ?? false
    setMode(nextShared ? "whole" : "unit")
  }

  function toggleBed(bedId: string) {
    setSelectedBeds((current) =>
      current.includes(bedId) ? current.filter((id) => id !== bedId) : [...current, bedId]
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      {booking && <input type="hidden" name="id" value={booking.id} />}
      {isShared ? <input type="hidden" name="bookingMode" value={mode} /> : null}

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
          onChange={(event) => onPropertyChange(event.target.value)}
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

      {isShared && unitsHere.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-muted-foreground">{t.forms.bookingMode}</legend>

          {/* The mode radios carry `bookingMode`; nothing else posts a claim. */}
          <div className="grid gap-2 sm:grid-cols-2">
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                mode === "whole" ? "border-primary/40 bg-primary/[0.06]" : "border-border bg-muted"
              )}
            >
              <input
                type="radio"
                name="bookingModeChoice"
                value="whole"
                checked={mode === "whole"}
                onChange={() => setMode("whole")}
                className="mt-1 h-4 w-4 accent-[color:var(--primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{t.forms.modeWholeProperty}</span>
                <span className="mt-1 block text-xs text-subtle-foreground">{t.availability.modeExclusiveHelp}</span>
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                mode === "beds" ? "border-primary/40 bg-primary/[0.06]" : "border-border bg-muted"
              )}
            >
              <input
                type="radio"
                name="bookingModeChoice"
                value="beds"
                checked={mode === "beds"}
                onChange={() => setMode("beds")}
                className="mt-1 h-4 w-4 accent-[color:var(--primary)]"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{t.forms.modeBeds}</span>
                <span className="mt-1 block text-xs text-subtle-foreground">{t.availability.modeSharedHelp}</span>
              </span>
            </label>
          </div>

          {mode === "beds" ? (
            <div className="space-y-2 rounded-2xl border border-border bg-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t.forms.beds}</span>
                {availability ? (
                  <BedCapacity occupied={availability.length - freeCount} total={availability.length} showCount />
                ) : null}
              </div>

              {availability ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {availability.map((entry) => {
                    const taken = !entry.available
                    const checked = selectedBeds.includes(entry.unit.id)
                    return (
                      <label
                        key={entry.unit.id}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                          checked
                            ? "border-primary/40 bg-primary/[0.08] text-foreground"
                            : "border-border bg-card text-muted-foreground",
                          taken && !checked && "opacity-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          name="bedIds"
                          value={entry.unit.id}
                          checked={checked}
                          onChange={() => toggleBed(entry.unit.id)}
                          /* A bed another guest holds cannot be newly claimed. */
                          disabled={taken && !checked}
                          className="h-4 w-4 accent-[color:var(--primary)]"
                        />
                        {entry.unit.name}
                        {taken ? (
                          <span className="ml-auto text-xs text-subtle-foreground">{t.availability.occupied}</span>
                        ) : null}
                      </label>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-subtle-foreground">{t.forms.chooseDates}</p>
              )}

              {wholePropertyBlocked ? (
                <p className="text-xs text-subtle-foreground">{t.availability.allBedsBlocked}</p>
              ) : null}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {/* The pre-shared form: a plain unit picker, or nothing when the property has no units. */}
      {!isShared && unitsHere.length > 0 ? (
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

          {/* Property changes reset this controlled selection. */}
          <Select id="unitId" name="unitId" value={unitId} onChange={event => setUnitId(event.target.value)}>
            <option value="" disabled={status !== "CANCELLED" && wholeUnavailable}>{t.forms.unitWholeProperty}</option>
            {unitsHere.map((unit) => {
              const taken = statusByUnitId.get(unit.id)?.available === false
              return (
                <option key={unit.id} value={unit.id} disabled={status !== "CANCELLED" && taken}>
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
          <Select id="status" name="status" value={status} onChange={event => setStatus(event.target.value as BookingStatus)}>
            {Object.values(BookingStatus).map((status) => (
              <option key={status} value={status}>
                {t.pages.bookings.statuses[status]}
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

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {selectionUnavailable && (
          <p role="alert" className="inline-flex items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-center text-xs font-medium text-red-400">
            {t.availability.occupied}
          </p>
        )}
        <SubmitButton
          pendingLabel={t.common.saving}
          disabled={!propertyId || !(nights > 0) || selectionUnavailable || bedsSubmitBlocked}
        >
          {booking ? t.forms.saveChanges : t.forms.addBooking}
        </SubmitButton>
      </div>
    </form>
  )
}
