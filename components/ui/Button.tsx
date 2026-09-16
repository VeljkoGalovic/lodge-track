import { ReactNode } from "react";
import { clsx } from "clsx";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "glass" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  href?: string;
  onClick?: () => void;
  asChild?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function Button({ children, variant = "glass", size = "default", className, href, onClick, asChild = false, disabled = false, type = "button" }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-300 rounded-full cursor-pointer";

  const sizeStyles = {
    default: "px-6 py-3 text-sm",
    sm: "px-4 py-2 text-xs",
    lg: "px-8 py-4 text-base",
    icon: "p-2",
  };

  const variants = {
    primary:
      "bg-[#36BFAE] hover:bg-[#2aa899] text-white shadow-[0_0_20px_rgba(54,191,174,0.4)] hover:shadow-[0_0_30px_rgba(54,191,174,0.6)]",
    glass:
      "bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    outline:
      "border border-[#36BFAE] text-[#36BFAE] hover:bg-[#36BFAE]/10",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5",
    destructive: "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]",
  };

  const finalClassName = clsx(base, variants[variant], sizeStyles[size], className, disabled && "opacity-50 cursor-not-allowed pointer-events-none");

  if (href || asChild) {
    return (
      <a href={href} className={finalClassName}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={finalClassName} disabled={disabled} type={type}>
      {children}
    </button>
  );
}