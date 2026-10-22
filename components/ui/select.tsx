"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  label?: string
  hint?: string
}

/**
 * A native `<select>`, styled to match `Input`.
 *
 * Native rather than a custom listbox on purpose: it is keyboard- and
 * screen-reader-correct for free, and on mobile it opens the platform picker.
 * The arrow is drawn separately because `appearance-none` removes the original.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, label, hint, id, 'aria-describedby': describedBy, ...props }, ref) => {
    const errorId = error ? `${id}-error` : undefined
    const hintId = hint ? `${id}-hint` : undefined
    const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-muted-foreground block">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            aria-invalid={!!error}
            aria-describedby={describedByIds}
            aria-required={props.required}
            className={cn(
              "flex h-10 w-full appearance-none rounded-xl border border-border bg-card px-4 py-2 pr-10 text-sm text-foreground transition-colors",
              "focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "[&>option]:bg-popover [&>option]:text-foreground",
              "touch-manipulation",
              error && "border-destructive focus:border-destructive focus:ring-destructive/30",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
          />
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-subtle-foreground" aria-live="polite">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-destructive" role="alert" aria-live="assertive">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
