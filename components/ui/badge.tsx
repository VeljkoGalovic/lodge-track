import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary/15 text-primary",
    secondary: "border-border bg-card text-muted-foreground",
    destructive: "border-transparent bg-destructive/15 text-destructive",
    outline: "border-border text-muted-foreground",
    success: "border-primary/25 bg-primary/10 text-primary",
    warning: "border-warning/25 bg-warning/10 text-warning",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
