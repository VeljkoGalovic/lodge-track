"use client"

import { useActionState } from "react"
import { acceptInvitation } from "@/app/actions/invite"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"

interface AcceptInviteFormProps {
  token: string
  /** Prefilled from the invitation and fixed: the invitation is for this address. */
  email: string
}

export function AcceptInviteForm({ token, email }: AcceptInviteFormProps) {
  const { t } = useI18n()
  const [state, formAction] = useActionState(acceptInvitation, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage error={state.error} success={state.success} />

      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <span className="block text-sm font-medium text-slate-300">{t.auth.emailLabel}</span>
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-slate-300">
          {email}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">
          {t.invite.yourName}
        </label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          placeholder={t.common.optional}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-slate-500 focus:border-[#36bfae] focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-300">
          {t.invite.choosePassword}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-[#36bfae] focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
          {t.auth.confirmPassword}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-[#36bfae] focus:outline-none"
        />
        <p className="text-xs text-slate-500">{t.auth.passwordMinLength}</p>
      </div>

      <SubmitButton pendingLabel={t.invite.joining}>{t.invite.accept}</SubmitButton>
    </form>
  )
}
