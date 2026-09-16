import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-[#36BFAE]/15 text-[#36BFAE]",
    secondary: "border-white/10 bg-white/5 text-slate-300",
    destructive: "border-transparent bg-red-500/15 text-red-400",
    outline: "border-white/10 text-slate-300",
    success: "border-[#36BFAE]/25 bg-[#36BFAE]/10 text-[#36BFAE]",
    warning: "border-amber-400/25 bg-amber-400/10 text-amber-400",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#36BFAE]/40 focus:ring-offset-2 focus:ring-offset-[#07090E]",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
