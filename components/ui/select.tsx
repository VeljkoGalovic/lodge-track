"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

/**
 * A native `<select>`, styled to match `Input`.
 *
 * Native rather than a custom listbox on purpose: it is keyboard- and
 * screen-reader-correct for free, and on mobile it opens the platform picker.
 * The arrow is drawn separately because `appearance-none` removes the original.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none rounded-xl border border-border bg-card px-4 py-2 pr-10 text-sm text-foreground transition-colors",
          "focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // The dropdown list itself is painted by the OS, so it needs an
          // explicit dark background to stay readable against this theme.
          "[&>option]:bg-popover [&>option]:text-foreground",
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
  )
)
Select.displayName = "Select"

export { Select }
