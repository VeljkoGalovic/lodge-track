"use client"

import { useFormStatus } from "react-dom"
import { cn } from "@/lib/utils"

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Shown while the action is in flight. */
  pendingLabel?: string
  variant?: "primary" | "glass" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg"
}

const VARIANTS = {
  primary:
    "bg-[#36BFAE] hover:bg-[#2aa899] text-white shadow-[0_0_20px_rgba(54,191,174,0.4)] hover:shadow-[0_0_30px_rgba(54,191,174,0.6)]",
  glass:
    "bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md text-white",
  outline: "border border-[#36BFAE] text-[#36BFAE] hover:bg-[#36BFAE]/10",
  ghost: "text-slate-400 hover:text-white hover:bg-white/5",
  destructive:
    "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]",
}

const SIZES = {
  default: "px-6 py-3 text-sm",
  sm: "px-4 py-2 text-xs",
  lg: "px-8 py-4 text-base",
}

/**
 * A submit button that knows when its own form is submitting.
 *
 * `useFormStatus` reads the nearest parent `<form>`'s state, so this has to be a
 * client component nested inside the form rather than the form itself — which is
 * exactly why `Button` cannot do this job.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "default",
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-full font-medium transition-all duration-300",
        VARIANTS[variant],
        SIZES[size],
        (pending || disabled) && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}
