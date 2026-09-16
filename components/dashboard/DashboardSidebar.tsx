"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Calendar,
  BarChart3,
  Users,
  CreditCard,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { clsx } from "clsx"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarTrigger, SidebarInset, SidebarHeader, SidebarFooter, SidebarRail, SidebarSeparator } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { OrgFeatures } from "@/lib/subscriptions"

interface DashboardSidebarProps {
  features: OrgFeatures;
  orgName: string;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
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

export function DashboardSidebar({ features, orgName, onToggleSidebar, sidebarOpen }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between h-12 px-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-foreground">
              <Building2 className="h-5 w-5 text-brand-teal" />
              <span className="truncate">LodgeTracker</span>
            </Link>
            <SidebarTrigger onClick={onToggleSidebar} className="md:hidden" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  const isLocked = item.requiresFeature && !features[item.requiresFeature]

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        className={clsx(
                          "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                          isLocked && "opacity-50 cursor-not-allowed"
                        )}
                        asChild
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                          {isLocked && <Lock className="ml-auto h-4 w-4 text-muted-foreground" />}
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
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <span className="truncate">{orgName}</span>
            <Badge variant="secondary" className="ml-auto">
              {features.tier}
            </Badge>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarRail />
    </>
  )
}