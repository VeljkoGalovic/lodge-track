"use client"

import { useActionState } from "react"
import { createProperty, updateProperty } from "@/app/actions/properties"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import { useActionRedirect } from "@/lib/use-action-redirect"
import { Input } from "@/components/ui/input"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"

interface PropertyFormProps {
  /** Editing carries the existing values and a hidden id; creating carries neither. */
  property?: {
    id: string
    name: string
    address: string
    icalUrl: string | null
  }
}

export function PropertyForm({ property }: PropertyFormProps) {
  const action = property ? updateProperty : createProperty
  const [state, formAction] = useActionState(action, EMPTY_ACTION_STATE)
  useActionRedirect(state)

  return (
    <form action={formAction} className="space-y-5">
      {property && <input type="hidden" name="id" value={property.id} />}

      <FormMessage error={state.error} success={state.success} />

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">
          Property name
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={property?.name ?? ""}
          placeholder="Lakeside Cabin"
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="address" className="text-sm font-medium text-slate-300">
          Address
        </label>
        <Input
          id="address"
          name="address"
          defaultValue={property?.address ?? ""}
          placeholder="12 Lake Road, Bled"
          required
          maxLength={300}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="icalUrl" className="text-sm font-medium text-slate-300">
          iCal URL <span className="text-slate-500">(optional)</span>
        </label>
        <Input
          id="icalUrl"
          name="icalUrl"
          type="url"
          defaultValue={property?.icalUrl ?? ""}
          placeholder="https://example.com/calendar.ics"
        />
        <p className="text-xs text-slate-500">
          Stored for reference. Importing from this URL is not built yet.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton pendingLabel="Saving...">
          {property ? "Save changes" : "Add property"}
        </SubmitButton>
      </div>
    </form>
  )
}
