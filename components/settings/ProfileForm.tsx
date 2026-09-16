"use client"

import { useActionState } from "react"
import { updateProfile } from "@/app/actions/account"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { Input } from "@/components/ui/input"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"

interface ProfileFormProps {
  name: string | null
  email: string
}

export function ProfileForm({ name, email }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfile, EMPTY_ACTION_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} success={state.success} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-300">
            Full name
          </label>
          <Input id="name" name="name" defaultValue={name ?? ""} placeholder="John Doe" maxLength={120} />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            Email
          </label>
          <Input id="email" defaultValue={email} type="email" disabled />
          <p className="text-xs text-slate-500">
            Email cannot be changed — it identifies the account.
          </p>
        </div>
      </div>

      <SubmitButton pendingLabel="Saving...">Save changes</SubmitButton>
    </form>
  )
}
