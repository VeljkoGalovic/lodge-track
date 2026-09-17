"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx } from "clsx"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center gap-2 overflow-hidden rounded-xl p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding,background-color,color] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-sidebar-foreground",
        outline: "bg-muted ring-1 ring-input",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2",
        lg: "h-12 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean
}

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={clsx(sidebarMenuButtonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => {
  return (
    <a
      ref={ref}
      className={clsx(
        "flex w-full items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-xs text-sidebar-foreground outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const sidebarMenuBadgeVariants = cva(
  "absolute right-3 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-medium",
  {
    variants: {
      variant: {
        default: "bg-sidebar-primary text-sidebar-primary-foreground",
        secondary: "bg-sidebar-secondary text-sidebar-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface SidebarMenuBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarMenuBadgeVariants> {}

function SidebarMenuBadge({ className, variant, ...props }: SidebarMenuBadgeProps) {
  return <div className={clsx(sidebarMenuBadgeVariants({ variant, className }))} {...props} />
}

interface SidebarMenuSkeletonProps {
  className?: string
  showIcon?: boolean
}

function SidebarMenuSkeleton({ className, showIcon = false }: SidebarMenuSkeletonProps) {
  return (
    <div
      className={clsx(
        "h-10 w-full animate-pulse rounded-xl bg-sidebar-accent",
        showIcon && "pl-10",
        className
      )}
    />
  )
}

const SidebarMenuSubItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={clsx("mx-2", className)} {...props} />
))
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={clsx("mx-2 my-1.5 space-y-1 overflow-hidden text-sidebar-foreground", className)}
      {...props}
    />
  )
)
SidebarMenuSub.displayName = "SidebarMenuSub"

type SidebarGroupProps = React.HTMLAttributes<HTMLDivElement>

function SidebarGroup({ className, ...props }: SidebarGroupProps) {
  return <div className={clsx("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />
}

type SidebarGroupLabelProps = React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, SidebarGroupLabelProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return (
      <Comp
        ref={ref}
        className={clsx(
          "flex h-8 shrink-0 items-center rounded-lg px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground outline-none ring-sidebar-ring transition-[margin,opacity] hover:text-sidebar-foreground group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

type SidebarGroupContentProps = React.HTMLAttributes<HTMLDivElement>

function SidebarGroupContent({ className, ...props }: SidebarGroupContentProps) {
  return <div className={clsx("w-full space-y-1", className)} {...props} />
}

type SidebarMenuItemProps = React.HTMLAttributes<HTMLDivElement>

const SidebarMenuItem = React.forwardRef<HTMLDivElement, SidebarMenuItemProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("flex w-full min-w-0", className)} {...props} />
  )
)
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={clsx("flex w-full min-w-0 flex-col space-y-1", className)} {...props} />
  )
)
SidebarMenu.displayName = "SidebarMenu"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Desktop icon-only state. Exposes `data-collapsible="icon"` so descendants
   *  can adapt via `group-data-[collapsible=icon]:` variants. */
  collapsed?: boolean
}

const Sidebar = ({ children, className, collapsed = false, ...props }: SidebarProps) => {
  return (
    <div
      data-collapsible={collapsed ? "icon" : "expanded"}
      className={clsx("group flex h-full w-full flex-col", className)}
      {...props}
    >
      {children}
    </div>
  )
}
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("flex flex-col gap-2 border-b border-border p-3", className)}
      {...props}
    />
  )
)
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("flex flex-col gap-2 border-t border-border p-3", className)}
      {...props}
    />
  )
)
SidebarFooter.displayName = "SidebarFooter"

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx("flex flex-1 overflow-y-auto overflow-x-hidden p-2 group-data-[collapsible=icon]:overflow-hidden", className)}
      {...props}
    />
  )
)
SidebarContent.displayName = "SidebarContent"

/** Mobile-only drawer dismiss control. */
const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-subtle-foreground transition-colors hover:bg-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        className
      )}
      {...props}
    >
      {children ?? <X className="h-4 w-4" />}
      <span className="sr-only">Close sidebar</span>
    </button>
  )
)
SidebarTrigger.displayName = "SidebarTrigger"

interface SidebarRailProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  collapsed?: boolean
}

/** Desktop collapse toggle, pinned to the sidebar's outer edge. */
const SidebarRail = React.forwardRef<HTMLButtonElement, SidebarRailProps>(
  ({ className, collapsed = false, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={clsx(
        "absolute top-20 z-30 hidden h-7 w-7 items-center justify-center rounded-full border border-border bg-popover text-subtle-foreground shadow-lg transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:flex",
        "-right-3.5",
        className
      )}
      {...props}
    >
      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
    </button>
  )
)
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("relative flex min-h-svh flex-1 flex-col", className)} {...props} />
  )
)
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "flex h-10 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors placeholder:text-subtle-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
SidebarInput.displayName = "SidebarInput"

const SidebarSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("mx-2 h-px w-auto bg-sidebar-border", className)} {...props} />
  )
)
SidebarSeparator.displayName = "SidebarSeparator"

export {
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
  SidebarInput,
  SidebarSeparator,
}
