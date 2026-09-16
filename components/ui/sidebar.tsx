"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { clsx } from "clsx"
import { X } from "lucide-react"

const sidebarMenuButtonVariants = cva(
  "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-sidebar-foreground",
        outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))]",
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
        "flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 text-xs text-sidebar-foreground outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
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
        "rounded-md h-10 w-full animate-pulse bg-sidebar-accent",
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
    <ul ref={ref} className={clsx("mx-2 my-1.5 space-y-1 overflow-hidden text-sidebar-foreground", className)} {...props} />
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
          "flex h-8 shrink-0 items-center px-4 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-colors hover:text-sidebar-foreground",
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

const Sidebar = ({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={clsx("group h-screen w-[--sidebar-width] flex flex-col", className)}>{children}</div>
}
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("flex flex-col gap-2 border-b p-3", className)} {...props} />
  )
)
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("flex flex-col gap-2 border-t p-3", className)} {...props} />
  )
)
SidebarFooter.displayName = "SidebarFooter"

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("flex flex-1 overflow-y-auto group-data-[collapsible=icon]:overflow-hidden p-3", className)} {...props} />
  )
)
SidebarContent.displayName = "SidebarContent"

const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, ...props }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      className={clsx("flex h-9 w-9 items-center justify-center rounded-md bg-sidebar text-sidebar-foreground shadow transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
)
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "absolute z-20 hidden h-full w-[calc(var(--sidebar-width)_+_0.5rem)] items-center justify-center bg-transparent px-1 transition-opacity hover:bg-sidebar group-data-[collapsible=off]:flex",
        className
      )}
      {...props}
    >
      <span
        className={clsx(
          "h-[calc(100%_-_2rem)] w-px rounded-full bg-sidebar-border transition-[width,height,margin] group-data-[collapsible=icon]:h-[calc(100%_-_8rem)] group-data-[collapsible=icon]:w-[3px] group-has-[[data-variant=inset]]:h-[calc(100%_-_2.5rem)]",
          className
        )}
      />
    </button>
  )
)
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("relative flex min-h-screen flex-1 flex-col bg-background", className)} {...props} />
  )
)
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
      {...props}
    />
  )
)
SidebarInput.displayName = "SidebarInput"

const SidebarSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx("mx-2 w-auto h-px bg-sidebar-border", className)} {...props} />
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