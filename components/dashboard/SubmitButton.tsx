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
    "bg-primary hover:bg-primary-hover text-foreground shadow-[0_0_20px_rgba(54,191,174,0.4)] hover:shadow-[0_0_30px_rgba(54,191,174,0.6)]",
  glass:
    "bg-raised hover:bg-raised-hover border border-input backdrop-blur-md text-foreground",
  outline: "border border-primary text-primary hover:bg-primary/10",
  ghost: "text-subtle-foreground hover:text-foreground hover:bg-card",
  destructive:
    "bg-destructive hover:bg-destructive-hover text-foreground shadow-[0_0_20px_rgba(239,68,68,0.4)]",
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
