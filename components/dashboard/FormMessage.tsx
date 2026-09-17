"use client"

import { AlertCircle, CheckCircle2 } from "lucide-react"

interface FormMessageProps {
  error?: string
  success?: string
}

/**
 * The one place form feedback is rendered, so an error looks the same whether it
 * came from an action, a validation rule or a permission check.
 *
 * `role="alert"` is used for errors only — a screen reader should interrupt for a
 * failure, but not for a confirmation the person just caused.
 */
export function FormMessage({ error, success }: FormMessageProps) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
    )
  }

  if (success) {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{success}</span>
      </div>
    )
  }

  return null
}
