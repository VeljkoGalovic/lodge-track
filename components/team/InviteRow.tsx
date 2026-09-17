"use client"

import { useActionState } from "react"
import { ShieldOff } from "lucide-react"
import { revokeInvitation } from "@/app/actions/team"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { InviteLink } from "@/components/team/InviteLink"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { format } from "@/lib/i18n/dictionaries"
import type { Role } from "@prisma/client"

export interface PendingInvitation {
  id: string
  email: string
  /** A Prisma role, so the name shown is always one this locale has a word for. */
  role: Role
  url: string
  expiresAt: string
}

/** One pending invitation: its link, when it lapses, and a revoke control. */
export function InviteRow({ invitation }: { invitation: PendingInvitation }) {
  const { locale, t } = useI18n()
  const [state, formAction] = useActionState(revokeInvitation, EMPTY_ACTION_STATE)

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{invitation.email}</p>
          <p className="text-sm text-subtle-foreground">
            {format(t.team.invitedAs, {
              role: t.roles.labels[invitation.role].toLocaleLowerCase(locale),
              date: invitation.expiresAt,
            })}
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="id" value={invitation.id} />
          <SubmitButton variant="ghost" size="sm" pendingLabel={t.team.revoking}>
            <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
            {t.team.revoke}
          </SubmitButton>
        </form>
      </div>

      <FormMessage error={state.error} success={state.success} />
      <InviteLink url={invitation.url} />
    </div>
  )
}
