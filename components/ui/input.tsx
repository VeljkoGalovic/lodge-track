"use client"

import * as React from "react"
import { clsx } from "clsx"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, hint, id, 'aria-describedby': describedBy, ...props }, ref) => {
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
        <input
          type={type}
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedByIds}
          aria-required={props.required}
          className={clsx(
            "flex h-10 w-full min-w-0 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors",
            "placeholder:text-subtle-foreground",
            "focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "touch-manipulation",
            error && "border-destructive focus:border-destructive focus:ring-destructive/30",
            className
          )}
          ref={ref}
          {...props}
        />
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
Input.displayName = "Input"

export { Input }
