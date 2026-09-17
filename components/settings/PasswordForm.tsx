"use client"

import { useActionState } from "react"
import { changePassword } from "@/app/actions/account"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { Input } from "@/components/ui/input"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, EMPTY_ACTION_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} success={state.success} />

      <div className="space-y-2">
        <label htmlFor="currentPassword" className="text-sm font-medium text-muted-foreground">
          Current password
        </label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="newPassword" className="text-sm font-medium text-muted-foreground">
            New password
          </label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">
            Confirm new password
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
      </div>

      <p className="text-xs text-subtle-foreground">At least 8 characters.</p>

      <SubmitButton pendingLabel="Updating...">Change password</SubmitButton>
    </form>
  )
}
