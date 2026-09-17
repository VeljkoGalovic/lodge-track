"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Calendar,
  CalendarDays,
  Receipt,
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
import { useI18n } from "@/components/i18n/LocaleProvider"
import type { Dictionary } from "@/lib/i18n/dictionaries"
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
  /**
   * A key into the `nav` block rather than the label itself, so the list of
   * destinations is language-independent data and only its rendering is
   * translated. Holding English here would put the strings back out of reach of
   * the dictionary.
   */
  labelKey: keyof Dictionary["nav"]
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiresFeature?: keyof OrgFeatures
}

const navigation: NavItem[] = [
  { labelKey: "overview", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "properties", href: "/dashboard/properties", icon: Building2 },
  { labelKey: "bookings", href: "/dashboard/bookings", icon: Calendar },
  { labelKey: "calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { labelKey: "expenses", href: "/dashboard/expenses", icon: Receipt },
  { labelKey: "analytics", href: "/dashboard/analytics", icon: BarChart3, requiresFeature: "hasAdvancedAnalytics" },
  { labelKey: "team", href: "/dashboard/team", icon: Users, requiresFeature: "hasTeamRoles" },
  { labelKey: "billing", href: "/dashboard/billing", icon: CreditCard },
]

export function DashboardSidebar({
  features,
  orgName,
  collapsed,
  onToggleCollapse,
  onCloseMobile,
}: DashboardSidebarProps) {
  const { t } = useI18n()
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
              <span className="truncate text-base font-semibold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
                Lodge<span className="text-primary">Track</span>
              </span>
            </Link>
            <SidebarTrigger
              onClick={onCloseMobile}
              className="ml-auto md:hidden"
              aria-label={t.nav.closeNavigation}
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t.nav.groupLabel}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const label = t.nav[item.labelKey]
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  const isLocked = item.requiresFeature && !features[item.requiresFeature]

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        title={collapsed ? label : undefined}
                        className={clsx(
                          isActive &&
                            "bg-primary/10 text-primary ring-1 ring-ring/20 hover:bg-primary/15 hover:text-primary",
                          isLocked && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <Link
                          href={item.href}
                          onClick={onCloseMobile}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                          {isLocked && (
                            <Lock className="ml-auto h-3.5 w-3.5 text-subtle-foreground group-data-[collapsible=icon]:hidden" />
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
            <span className="truncate text-xs text-subtle-foreground group-data-[collapsible=icon]:hidden">
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
