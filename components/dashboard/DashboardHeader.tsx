"use client"

import * as React from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { Menu, Bell, LogOut, User, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/components/i18n/LocaleProvider"
import { format } from "@/lib/i18n/dictionaries"
import { OrgFeatures, getTierBadgeColor } from "@/lib/subscriptions"
import { ThemeMenu } from "@/components/theme/ThemeMenu"
import { LanguageMenu } from "@/components/i18n/LanguageMenu"

interface DashboardHeaderProps {
  orgName: string;
  features: OrgFeatures;
  userName?: string;
  userEmail?: string;
  /** Activity-feed items awaiting attention; 0 hides the dot. */
  attentionCount: number;
  onMenuClick: () => void;
}

export function DashboardHeader({ orgName, features, userName, userEmail, attentionCount, onMenuClick }: DashboardHeaderProps) {
  const { t } = useI18n()

  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="md:hidden"
        aria-label={t.header.openNavigation}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{orgName}</h1>
          <Badge variant="secondary" className={getTierBadgeColor(features.tier)}>
            {features.tier}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <ThemeMenu />
          <LanguageMenu />

          <Button
            variant="ghost"
            size="icon"
            href="/dashboard/notifications"
            aria-label={
              attentionCount > 0
                ? format(t.header.notificationsWithCount, { count: attentionCount })
                : t.header.notifications
            }
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {attentionCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground"
              >
                {attentionCount > 9 ? "9+" : attentionCount}
              </span>
            ) : null}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t.header.account}
                className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-input transition-all hover:ring-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-brand-purple text-sm font-semibold text-[#07090E]">
                  {userName?.charAt(0).toUpperCase() || "U"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="truncate text-sm font-medium leading-none text-foreground">{userName || t.header.fallbackName}</p>
                  <p className="truncate text-xs leading-none text-subtle-foreground">{userEmail || "email@example.com"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <User className="mr-2 h-4 w-4" />
                  {t.header.settings}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t.nav.billing}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => signOut({ callbackUrl: "/signin" })}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t.header.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
