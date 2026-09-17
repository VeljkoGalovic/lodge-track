"use client"

import { useActionState } from "react"
import { updateProfile } from "@/app/actions/account"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { Input } from "@/components/ui/input"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"

interface ProfileFormProps {
  name: string | null
  email: string
}

export function ProfileForm({ name, email }: ProfileFormProps) {
  const { t } = useI18n()
  const [state, formAction] = useActionState(updateProfile, EMPTY_ACTION_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} success={state.success} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
            {t.forms.fullName}
          </label>
          <Input id="name" name="name" defaultValue={name ?? ""} placeholder="John Doe" maxLength={120} />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
            {t.forms.email}
          </label>
          <Input id="email" defaultValue={email} type="email" disabled />
          <p className="text-xs text-subtle-foreground">
            {t.forms.emailLocked}
          </p>
        </div>
      </div>

      <SubmitButton pendingLabel={t.common.saving}>{t.forms.saveChangesShort}</SubmitButton>
    </form>
  )
}
