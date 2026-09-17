"use client"

import * as React from "react"
import { clsx } from "clsx"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))
    return (
      <div
        ref={ref}
        className={clsx("relative h-2 w-full overflow-hidden rounded-full bg-accent", className)}
        {...props}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-[#45eed9] transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
