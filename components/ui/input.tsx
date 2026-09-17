"use client"

import * as React from "react"
import { clsx } from "clsx"

type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={clsx(
          "flex h-10 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors",
          "placeholder:text-subtle-foreground",
          "focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
