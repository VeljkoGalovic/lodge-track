"use client"

import { useActionState } from "react"
import { updateOrganization } from "@/app/actions/organization"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"

interface OrganizationFormProps {
  name: string
  currency: string
  /** Currency decides how every stored amount is read, so it is owner-only. */
  canEdit: boolean
}

export function OrganizationForm({ name, currency, canEdit }: OrganizationFormProps) {
  const [state, formAction] = useActionState(updateOrganization, EMPTY_ACTION_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} success={state.success} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="orgName" className="text-sm font-medium text-muted-foreground">
            Organization name
          </label>
          <Input
            id="orgName"
            name="name"
            defaultValue={name}
            placeholder="Acme Properties"
            required
            disabled={!canEdit}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="currency" className="text-sm font-medium text-muted-foreground">
            Currency
          </label>
          <Select id="currency" name="currency" defaultValue={currency} disabled={!canEdit}>
            {SUPPORTED_CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} — {option.label}
              </option>
            ))}
          </Select>
          <p className="text-xs text-subtle-foreground">
            Booking rates are stored as whole minor units and displayed in this currency.
          </p>
        </div>
      </div>

      {canEdit ? (
        <SubmitButton pendingLabel="Saving...">Save changes</SubmitButton>
      ) : (
        <p className="text-sm text-subtle-foreground">
          Only an owner can change the organization&apos;s name or currency.
        </p>
      )}
    </form>
  )
}
