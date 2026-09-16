"use client"

import { useActionState } from "react"
import { ShieldCheck, ShieldOff, UserCog } from "lucide-react"
import { removeMember, resetMemberTwoFactor, updateMemberRole } from "@/app/actions/team"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { ROLE_BADGE_VARIANTS, ROLE_LABELS } from "@/lib/roles"
import type { Role } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export interface TeamMember {
  id: string
  name: string | null
  email: string
  role: Role
  twoFactorEnabled: boolean
}

interface MemberRowProps {
  member: TeamMember
  /** False for the viewer's own row and for members their role may not touch. */
  canModify: boolean
  canPromoteToOwner: boolean
  /** Resetting another member's second factor is an owner-only recovery action. */
  canResetTwoFactor: boolean
}

/**
 * One team member, with the controls that apply to them.
 *
 * Every control is gated on the server as well — the flags here only decide what
 * is worth showing, never what is allowed.
 */
export function MemberRow({
  member,
  canModify,
  canPromoteToOwner,
  canResetTwoFactor,
}: MemberRowProps) {
  const [roleState, roleAction] = useActionState(updateMemberRole, EMPTY_ACTION_STATE)
  const [resetState, resetAction] = useActionState(resetMemberTwoFactor, EMPTY_ACTION_STATE)
  const [removeState, removeAction] = useActionState(removeMember, EMPTY_ACTION_STATE)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-colors hover:border-white/[0.15] hover:bg-white/[0.06]">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#36BFAE] to-[#BA87FF] font-medium text-[#07090E]">
          {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{member.name || "Unnamed"}</p>
          <p className="truncate text-sm text-slate-400">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={ROLE_BADGE_VARIANTS[member.role]}>{ROLE_LABELS[member.role]}</Badge>

        {member.twoFactorEnabled && (
          <span
            className="flex items-center gap-1.5 text-xs text-[#36BFAE]"
            title="Two-factor authentication is on"
          >
            <ShieldCheck className="h-4 w-4" />
            2FA
          </span>
        )}

        {canModify ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <UserCog className="mr-1.5 h-3.5 w-3.5" />
                Manage
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-white">
                  {member.name || member.email}
                </DialogTitle>
                <DialogDescription>Change this member&apos;s role or remove them.</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <form action={roleAction} className="space-y-3">
                  <input type="hidden" name="userId" value={member.id} />
                  <FormMessage error={roleState.error} success={roleState.success} />
                  <label htmlFor={`role-${member.id}`} className="text-sm font-medium text-slate-300">
                    Role
                  </label>
                  <Select id={`role-${member.id}`} name="role" defaultValue={member.role}>
                    <option value="MANAGER">Manager</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    {canPromoteToOwner ? <option value="OWNER">Owner</option> : null}
                  </Select>
                  <SubmitButton size="sm" pendingLabel="Saving...">
                    Save role
                  </SubmitButton>
                </form>

                {canResetTwoFactor ? (
                  <form
                    action={resetAction}
                    className="space-y-3 border-t border-white/[0.06] pt-5"
                  >
                    <input type="hidden" name="userId" value={member.id} />
                    <FormMessage error={resetState.error} success={resetState.success} />
                    <p className="text-sm text-slate-400">
                      {member.twoFactorEnabled
                        ? "If they have lost their authenticator, clear it so they can set it up again."
                        : "This member has no second factor set up."}
                    </p>
                    <SubmitButton
                      variant="outline"
                      size="sm"
                      pendingLabel="Clearing..."
                      disabled={!member.twoFactorEnabled}
                    >
                      <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                      Reset two-factor
                    </SubmitButton>
                  </form>
                ) : null}

                <form action={removeAction} className="space-y-3 border-t border-white/[0.06] pt-5">
                  <input type="hidden" name="userId" value={member.id} />
                  <FormMessage error={removeState.error} success={removeState.success} />
                  <p className="text-sm text-slate-400">
                    Removing them revokes access immediately. Their bookings and properties stay
                    with the organization.
                  </p>
                  <SubmitButton variant="destructive" size="sm" pendingLabel="Removing...">
                    Remove from organization
                  </SubmitButton>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  )
}
