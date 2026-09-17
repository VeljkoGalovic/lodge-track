"use client"

import * as React from "react"
import { clsx } from "clsx"

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={clsx(
          "flex min-h-[5rem] w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors",
          "placeholder:text-subtle-foreground",
          "focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
