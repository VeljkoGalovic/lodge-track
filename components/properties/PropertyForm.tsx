"use client"

import { useActionState, useState } from "react"
import { createProperty, updateProperty } from "@/app/actions/properties"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"

interface PropertyFormProps {
  /** Editing carries the existing values and a hidden id; creating carries neither. */
  property?: {
    id: string
    name: string
    address: string
    icalUrl: string | null
    currency: string | null
    allowSharedBookings: boolean
    /** Current number of units, prefilling the bed-count field on edit. */
    bedCount?: number
  }
}

export function PropertyForm({ property }: PropertyFormProps) {
  const { t, locale } = useI18n()
  const currencies = new Intl.DisplayNames(locale === "sr" ? "sr-Latn-RS" : "en-US", { type: "currency" })
  const action = property ? updateProperty : createProperty
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  /**
   * The shared-bookings toggle is the gate for every bed-level feature: the bed
   * count field only exists on the page while it is ticked, and the action
   * ignores both when the flag is off. `defaultValue` (uncontrolled) keeps the
   * checkbox a plain form field — the bed count below is what needs to come and
   * go with it.
   */
  const [shared, setShared] = useState(property?.allowSharedBookings ?? false)

  return (
    <form action={formAction} className="space-y-5">
      {property && <input type="hidden" name="id" value={property.id} />}

      <FormMessage error={state.error} success={state.success} />

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
          {t.forms.propertyName}
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={property?.name ?? ""}
          placeholder={t.forms.propertyPlaceholder}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="address" className="text-sm font-medium text-muted-foreground">
          {t.forms.address}
        </label>
        <Input
          id="address"
          name="address"
          defaultValue={property?.address ?? ""}
          placeholder={t.forms.addressPlaceholder}
          required
          maxLength={300}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="currency" className="text-sm font-medium text-muted-foreground">
          {t.onboarding.currency}
        </label>
        <Select id="currency" name="currency" defaultValue={property?.currency ?? "INHERIT"}>
          <option value="INHERIT">{t.forms.inheritCurrency}</option>
          {SUPPORTED_CURRENCIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} — {currencies.of(option.code)}
            </option>
          ))}
        </Select>
        <p className="text-xs text-subtle-foreground">
          {t.forms.propertyCurrencyHelp}
        </p>
      </div>

      {/*
        The opt-in toggle. Disabled when the property already has shared stays:
        flipping it off would hide inventory that live bookings still claim, and
        that refusal is the action's to explain, so the field itself stays
        enabled and the server rejects it.
      */}
      <div className="space-y-2 rounded-2xl border border-border bg-muted p-4">
        <div className="flex items-start gap-3">
          <input
            id="allowSharedBookings"
            name="allowSharedBookings"
            type="checkbox"
            checked={shared}
            onChange={(event) => setShared(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border accent-[color:var(--primary)]"
          />
          <div>
            <label htmlFor="allowSharedBookings" className="text-sm font-medium text-foreground">
              {t.forms.sharedBookings}
            </label>
            <p className="mt-1 text-xs text-subtle-foreground">{t.forms.sharedBookingsHelp}</p>
          </div>
        </div>

        {shared ? (
          <div className="space-y-2 pt-1">
            <label htmlFor="bedCount" className="text-sm font-medium text-muted-foreground">
              {t.forms.bedCount}
            </label>
            <Input
              id="bedCount"
              name="bedCount"
              type="number"
              min={1}
              max={200}
              step={1}
              inputMode="numeric"
              defaultValue={Math.max(1, property?.bedCount ?? 1)}
              required
            />
            <p className="text-xs text-subtle-foreground">{t.forms.bedCountHelp}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="icalUrl" className="text-sm font-medium text-muted-foreground">
          {t.forms.icalUrl}{" "}
          <span className="text-subtle-foreground">({t.common.optional})</span>
        </label>
        <Input
          id="icalUrl"
          name="icalUrl"
          type="url"
          defaultValue={property?.icalUrl ?? ""}
          placeholder="https://example.com/calendar.ics"
        />
        <p className="text-xs text-subtle-foreground">
          {t.forms.icalStored}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton pendingLabel={t.common.saving}>
          {property ? t.forms.saveChanges : t.forms.addProperty}
        </SubmitButton>
      </div>
    </form>
  )
}
