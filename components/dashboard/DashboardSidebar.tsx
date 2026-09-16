"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Calendar,
  BarChart3,
  Users,
  CreditCard,
  Lock,
} from "lucide-react"
import { clsx } from "clsx"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { OrgFeatures } from "@/lib/subscriptions"

interface DashboardSidebarProps {
  features: OrgFeatures;
  orgName: string;
  /** Desktop icon-only state. */
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Dismiss the mobile drawer after navigating. */
  onCloseMobile: () => void;
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiresFeature?: keyof OrgFeatures
}

const navigation: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Properties", href: "/dashboard/properties", icon: Building2 },
  { name: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { name: "Financial Analytics", href: "/dashboard/analytics", icon: BarChart3, requiresFeature: "hasAdvancedAnalytics" },
  { name: "Team & Roles", href: "/dashboard/team", icon: Users, requiresFeature: "hasTeamRoles" },
  { name: "Billing & Subscription", href: "/dashboard/billing", icon: CreditCard },
]

export function DashboardSidebar({
  features,
  orgName,
  collapsed,
  onToggleCollapse,
  onCloseMobile,
}: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      <Sidebar collapsed={collapsed}>
        <SidebarHeader>
          <div className="flex h-10 items-center gap-2 px-1">
            <Link
              href="/dashboard"
              onClick={onCloseMobile}
              className="flex min-w-0 items-center gap-2.5"
            >
              <Image
                src="/images/logo/LogoNoBG.png"
                alt="LodgeTrack logo"
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 object-contain"
              />
              <span className="truncate text-base font-semibold tracking-tight text-white group-data-[collapsible=icon]:hidden">
                Lodge<span className="text-[#36BFAE]">Track</span>
              </span>
            </Link>
            <SidebarTrigger
              onClick={onCloseMobile}
              className="ml-auto md:hidden"
              aria-label="Close navigation"
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  const isLocked = item.requiresFeature && !features[item.requiresFeature]

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        title={collapsed ? item.name : undefined}
                        className={clsx(
                          isActive &&
                            "bg-[#36BFAE]/10 text-[#36BFAE] ring-1 ring-[#36BFAE]/20 hover:bg-[#36BFAE]/15 hover:text-[#36BFAE]",
                          isLocked && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <Link
                          href={item.href}
                          onClick={onCloseMobile}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="group-data-[collapsible=icon]:hidden">{item.name}</span>
                          {isLocked && (
                            <Lock className="ml-auto h-3.5 w-3.5 text-slate-500 group-data-[collapsible=icon]:hidden" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
            <span className="truncate text-xs text-slate-400 group-data-[collapsible=icon]:hidden">
              {orgName}
            </span>
            <Badge variant="secondary" className="ml-auto group-data-[collapsible=icon]:hidden">
              {features.tier}
            </Badge>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarRail collapsed={collapsed} onClick={onToggleCollapse} />
    </>
  )
}
