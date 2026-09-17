"use client"

import { useActionState } from "react"
import { inviteMember } from "@/app/actions/team"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { useI18n } from "@/components/i18n/LocaleProvider"

interface InviteFormProps {
  /** Only an owner may invite another owner, so the option is withheld otherwise. */
  canInviteOwner: boolean
}

export function InviteForm({ canInviteOwner }: InviteFormProps) {
  const { t } = useI18n()
  const [state, formAction] = useActionState(inviteMember, EMPTY_ACTION_STATE)

  return (
    <form action={formAction} className="space-y-5">
      <FormMessage error={state.error} success={state.success} />

      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
            {t.team.inviteEmail}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="colleague@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium text-muted-foreground">
            {t.roles.label}
          </label>
          <Select id="role" name="role" defaultValue="MANAGER">
            <option value="MANAGER">{t.roles.labels.MANAGER}</option>
            <option value="MAINTENANCE">{t.roles.labels.MAINTENANCE}</option>
            {canInviteOwner ? <option value="OWNER">{t.roles.labels.OWNER}</option> : null}
          </Select>
        </div>
      </div>

      <p className="text-xs text-subtle-foreground">
        {t.team.inviteHint}
      </p>

      <SubmitButton pendingLabel={t.team.creatingLink}>{t.team.createInviteLink}</SubmitButton>
    </form>
  )
}
