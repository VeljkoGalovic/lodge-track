"use client"

import { useDictionary, useLocale } from "@/components/i18n/LocaleProvider"
import { format, plural, ITEM_COUNT_FORMS } from "@/lib/i18n/dictionaries"
import { useActionState } from "react"
import { updateNotificationPreferences } from "@/app/actions/account"
import { EMPTY_ACTION_STATE } from "@/lib/action-state"
import type { NotificationCounts, NotificationPreferences } from "@/lib/activity"
import { FormMessage } from "@/components/dashboard/FormMessage"
import { SubmitButton } from "@/components/dashboard/SubmitButton"

interface NotificationPreferencesFormProps {
  preferences: NotificationPreferences
  /** How many items each toggle currently contributes, so the effect is visible. */
  counts: NotificationCounts
}

export function NotificationPreferencesForm({
  preferences,
  counts,
}: NotificationPreferencesFormProps) {
  const { locale } = useLocale()
  const t = useDictionary()
  const options: { name: keyof NotificationPreferences; label: string; description: string }[] = [
    { name: "notifyCheckInsDue", label: t.pages.notifications.checkIns, description: t.pages.notifications.checkInsHelp },
    { name: "notifyStaysEnding", label: t.pages.notifications.ending, description: t.pages.notifications.endingHelp },
    { name: "notifyMissingRate", label: t.pages.notifications.missingRate, description: t.pages.notifications.missingRateHelp },
  ]
  const [state, formAction] = useActionState(updateNotificationPreferences, EMPTY_ACTION_STATE)

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} success={state.success} />

      <div className="divide-y divide-border">
        {options.map((option) => (
          <label
            key={option.name}
            htmlFor={option.name}
            className="flex cursor-pointer items-start gap-3 py-4 first:pt-0 last:pb-0"
          >
            <input
              id={option.name}
              name={option.name}
              type="checkbox"
              defaultChecked={preferences[option.name]}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input bg-card accent-primary"
            />
            <span className="min-w-0">
              <span className="block font-medium text-foreground">{option.label}</span>
              <span className="block text-sm text-subtle-foreground">{option.description}</span>
              <span className="mt-1 block text-xs text-subtle-foreground">
                {format(t.pages.notifications.currentItems, { items: plural(counts[option.name], ITEM_COUNT_FORMS[locale]) })}
              </span>
            </span>
          </label>
        ))}
      </div>

      <SubmitButton pendingLabel={t.common.saving}>{t.pages.notifications.savePreferences}</SubmitButton>
    </form>
  )
}
