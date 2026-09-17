"use client"

import { useActionState } from "react"
import { createOrganization } from "@/app/actions/organization"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { SUPPORTED_CURRENCIES } from "@/lib/currency"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"

export function OnboardingForm() {
  const { t } = useI18n()
  const [state, formAction] = useActionState(createOrganization, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage error={state.error} success={state.success} />

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">
          {t.onboarding.organizationName}
        </label>
        <input
          id="name"
          name="name"
          required
          autoFocus
          placeholder="Acme Properties"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-slate-500 focus:border-[#36bfae] focus:outline-none"
        />
        <p className="text-xs text-slate-500">
          {t.onboarding.organizationNameHelp}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="currency" className="text-sm font-medium text-slate-300">
          {t.onboarding.currency}
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue="USD"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-[#36bfae] focus:outline-none [&>option]:bg-[#0C0F16]"
        >
          {SUPPORTED_CURRENCIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} — {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">
          {t.onboarding.currencyHelp}
        </p>
      </div>

      <SubmitButton pendingLabel={t.onboarding.creating}>{t.onboarding.createOrganization}</SubmitButton>
    </form>
  )
}
