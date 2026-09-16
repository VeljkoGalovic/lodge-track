"use client"

import * as React from "react"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { SidebarInset } from "@/components/ui/sidebar"
import { OrgFeatures } from "@/lib/subscriptions"
import { clsx } from "clsx"

interface DashboardShellProps {
  children: React.ReactNode
  orgName: string
  features: OrgFeatures
  userName?: string
  userEmail?: string
}

export function DashboardShell({ children, orgName, features, userName, userEmail }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <DashboardSidebar
          features={features}
          orgName={orgName}
          onToggleSidebar={() => setSidebarOpen(false)}
          sidebarOpen={sidebarOpen}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          orgName={orgName}
          features={features}
          userName={userName}
          userEmail={userEmail}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}