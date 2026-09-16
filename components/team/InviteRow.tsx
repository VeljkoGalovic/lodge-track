"use client"

import { useActionState } from "react"
import { ShieldOff } from "lucide-react"
import { revokeInvitation } from "@/app/actions/team"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import { InviteLink } from "@/components/team/InviteLink"

export interface PendingInvitation {
  id: string
  email: string
  role: string
  url: string
  expiresAt: string
}

/** One pending invitation: its link, when it lapses, and a revoke control. */
export function InviteRow({ invitation }: { invitation: PendingInvitation }) {
  const [state, formAction] = useActionState(revokeInvitation, EMPTY_ACTION_STATE)

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{invitation.email}</p>
          <p className="text-sm text-slate-400">
            Invited as {invitation.role.toLowerCase()} · expires {invitation.expiresAt}
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="id" value={invitation.id} />
          <SubmitButton variant="ghost" size="sm" pendingLabel="Revoking...">
            <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
            Revoke
          </SubmitButton>
        </form>
      </div>

      <FormMessage error={state.error} success={state.success} />
      <InviteLink url={invitation.url} />
    </div>
  )
}
