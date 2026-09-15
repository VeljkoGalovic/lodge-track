import { ReactNode } from "react";
import { clsx } from "clsx";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div
      className={clsx(
        "bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl",
        hover && "hover:bg-white/[0.08] hover:border-white/20 transition-all duration-300",
        className
      )}
    >
      {children}
    </div>
  );
}
