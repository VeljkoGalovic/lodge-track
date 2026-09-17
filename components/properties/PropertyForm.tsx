"use client"

import { useActionState } from "react"
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
  }
}

export function PropertyForm({ property }: PropertyFormProps) {
  const { t } = useI18n()
  const action = property ? updateProperty : createProperty
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE)
  useActionRedirect(state)

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
          placeholder="Lakeside Cabin"
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
          placeholder="12 Lake Road, Bled"
          required
          maxLength={300}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="currency" className="text-sm font-medium text-muted-foreground">
          Currency
        </label>
        <Select id="currency" name="currency" defaultValue={property?.currency ?? "INHERIT"}>
          <option value="INHERIT">Inherit from organization</option>
          {SUPPORTED_CURRENCIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} — {option.label}
            </option>
          ))}
        </Select>
        <p className="text-xs text-subtle-foreground">
          If this property charges guests in a different currency from the rest of your organization.
        </p>
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
