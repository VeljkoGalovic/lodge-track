"use client"

import { useI18n } from "@/components/i18n/LocaleProvider"
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
  const { t, locale } = useI18n()
  const currencies = new Intl.DisplayNames(locale === "sr" ? "sr-Latn-RS" : "en-US", { type: "currency" })
  const [state, formAction] = useActionState(updateOrganization, EMPTY_ACTION_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} success={state.success} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="orgName" className="text-sm font-medium text-muted-foreground">
            {t.onboarding.organizationName}
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
            {t.onboarding.currency}
          </label>
          <Select id="currency" name="currency" defaultValue={currency} disabled={!canEdit}>
            {SUPPORTED_CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} — {currencies.of(option.code)}
              </option>
            ))}
          </Select>
          <p className="text-xs text-subtle-foreground">
            {t.pages.settings.currencyHelp}
          </p>
        </div>
      </div>

      {canEdit ? (
        <SubmitButton pendingLabel={t.common.saving}>{t.forms.saveChanges}</SubmitButton>
      ) : (
        <p className="text-sm text-subtle-foreground">
          {t.pages.settings.ownerOnly}
        </p>
      )}
    </form>
  )
}
