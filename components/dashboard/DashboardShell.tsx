"use client"

import * as React from "react"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { OrgFeatures } from "@/lib/subscriptions"
import { clsx } from "clsx"

interface DashboardShellProps {
  children: React.ReactNode
  orgName: string
  features: OrgFeatures
  userName?: string
  userEmail?: string
  /** Items in the member's activity feed, shown on the header bell. */
  attentionCount: number
}

export function DashboardShell({ children, orgName, features, userName, userEmail, attentionCount }: DashboardShellProps) {
  // The mobile drawer starts closed so it never covers the page on first paint.
  const [mobileOpen, setMobileOpen] = React.useState(false)
  // Desktop icon-only state.
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="relative flex h-svh w-full overflow-hidden bg-[#07090E]">
      {/* Ambient atmosphere — decorative, sits behind all content. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ambient-orb -left-40 -top-40 h-[32rem] w-[32rem] bg-[#36BFAE]/10 blur-[120px]" />
        <div className="ambient-orb -bottom-52 -right-40 h-[36rem] w-[36rem] bg-[#BA87FF]/10 blur-[130px]" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar — a drawer below md, a collapsible rail at md and up. */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-[#0A0D13]/80 backdrop-blur-xl transition-[width,transform] duration-300 ease-in-out",
          "md:relative md:translate-x-0",
          collapsed ? "md:w-[4.5rem]" : "md:w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <DashboardSidebar
          features={features}
          orgName={orgName}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main column */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <DashboardHeader
          orgName={orgName}
          features={features}
          userName={userName}
          userEmail={userEmail}
          attentionCount={attentionCount}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
