"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, Bell, ChevronDown, LogOut, User, Settings, CreditCard } from "lucide-react"
import { clsx } from "clsx"
import { Button } from "@/components/ui/Button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { OrgFeatures } from "@/lib/subscriptions"

interface DashboardHeaderProps {
  orgName: string;
  features: OrgFeatures;
  userName?: string;
  userEmail?: string;
  onMenuClick: () => void;
}

export function DashboardHeader({ orgName, features, userName, userEmail, onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center gap-4 px-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold truncate">{orgName}</h1>
            <Badge variant="secondary" className={getTierBadgeClass(features.tier)}>
              {features.tier}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-teal to-brand-purple flex items-center justify-center">
                    {userName?.charAt(0).toUpperCase() || "U"}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userEmail || "email@example.com"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <User className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

function getTierBadgeClass(tier: OrgFeatures["tier"]): string {
  switch (tier) {
    case "STARTER":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    case "PRO":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "ENTERPRISE":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
  }
}