import { Children, cloneElement, isValidElement, ReactElement, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "glass" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Renders a link. Internal paths use `next/link`; `/api/*`, hashes and
   *  absolute URLs fall back to a plain anchor so the router isn't asked to
   *  fetch a non-page response. */
  href?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Merges the button's classes onto a single child element instead of
   *  wrapping it. Prevents `<a>`-inside-`<a>` when the child is a `Link`. */
  asChild?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

/** Paths the client router should not try to handle. */
function needsPlainAnchor(href: string): boolean {
  return href.startsWith("#") || href.startsWith("/api/") || /^[a-z]+:\/\//i.test(href);
}

export function Button({
  children,
  variant = "glass",
  size = "default",
  className,
  href,
  onClick,
  asChild = false,
  disabled = false,
  type = "button",
  ...rest
}: ButtonProps) {
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
      "bg-primary hover:bg-primary-hover text-foreground shadow-[0_0_20px_rgba(54,191,174,0.4)] hover:shadow-[0_0_30px_rgba(54,191,174,0.6)]",
    glass:
      "bg-raised hover:bg-raised-hover border border-input backdrop-blur-md text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    outline: "border border-primary text-primary hover:bg-primary/10",
    ghost: "text-subtle-foreground hover:text-foreground hover:bg-card",
    destructive:
      "bg-destructive hover:bg-destructive-hover text-foreground shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]",
  };

  const disabledStyles = "opacity-50 cursor-not-allowed pointer-events-none";

  const finalClassName = cn(
    base,
    variants[variant],
    sizeStyles[size],
    className,
    disabled && disabledStyles
  );

  /**
   * The props are declared against `<button>`, but when `href` sends the
   * component through an anchor the same attribute bag still applies — both
   * elements accept ids, roles, aria-* and data-* attributes. The cast is the
   * cost of one prop type driving two elements; the public API is unchanged.
   */
  const anchorProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;

  if (asChild) {
    // `Children.only` throws unless given exactly one element — intentional, so
    // misuse fails loudly rather than producing nested anchors.
    const child = Children.only(children) as ReactElement<{ className?: string }>;
    if (!isValidElement(child)) {
      throw new Error("Button: `asChild` requires a single React element child.");
    }
    return cloneElement(child, {
      className: cn(finalClassName, child.props.className),
    });
  }

  if (href) {
    // An anchor cannot be disabled — render an inert span so the `disabled`
    // prop stays honest instead of being silently dropped.
    if (disabled) {
      return (
        <span aria-disabled="true" className={finalClassName} {...rest}>
          {children}
        </span>
      );
    }

    if (needsPlainAnchor(href)) {
      return (
        <a href={href} className={finalClassName} onClick={onClick} {...anchorProps}>
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={finalClassName} onClick={onClick} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={finalClassName} disabled={disabled} type={type} {...rest}>
      {children}
    </button>
  );
}
