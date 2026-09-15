import { ReactNode } from "react";
import { clsx } from "clsx";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "glass" | "outline" | "ghost";
  className?: string;
  href?: string;
  onClick?: () => void;
}

export function Button({ children, variant = "glass", className, href, onClick }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-300 rounded-full cursor-pointer";

  const variants = {
    primary:
      "bg-[#36BFAE] hover:bg-[#2aa899] text-white shadow-[0_0_20px_rgba(54,191,174,0.4)] hover:shadow-[0_0_30px_rgba(54,191,174,0.6)] px-6 py-3",
    glass:
      "bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] px-6 py-3",
    outline:
      "border border-[#36BFAE] text-[#36BFAE] hover:bg-[#36BFAE]/10 px-6 py-3",
    ghost: "text-slate-400 hover:text-white hover:bg-white/5 px-4 py-2",
  };

  if (href) {
    return (
      <a href={href} className={clsx(base, variants[variant], className)}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={clsx(base, variants[variant], className)}>
      {children}
    </button>
  );
}
