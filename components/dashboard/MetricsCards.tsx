"use client"

import * as React from "react"
import { TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react"
import { clsx } from "clsx"
import { Button } from "@/components/ui/Button"
import { Progress } from "@/components/ui/progress"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; label: string }
  progress?: { current: number; max: number; label: string }
  isAtLimit?: boolean
  action?: { label: string; href: string }
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  progress,
  isAtLimit,
  action,
  className
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-6 backdrop-blur-xl transition-all duration-300 hover:border-border hover:bg-accent",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-subtle-foreground">{title}</p>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-subtle-foreground">{subtitle}</p>}

      {progress && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-subtle-foreground">{progress.label}</span>
            <span className="font-medium text-muted-foreground">
              {progress.current} / {progress.max === Infinity ? "∞" : progress.max}
            </span>
          </div>
          <Progress
            value={progress.max === Infinity ? 0 : Math.min(100, (progress.current / progress.max) * 100)}
            className="h-2"
          />
          {isAtLimit && (
            <div className="flex items-center gap-2 text-xs text-warning">
              <AlertCircle className="h-3 w-3" />
              <span>Property limit reached</span>
            </div>
          )}
        </div>
      )}

      {trend && (
        <div className="mt-5 flex items-center gap-2 text-sm">
          <TrendingUp className={clsx("h-4 w-4", trend.value >= 0 ? "text-primary" : "text-destructive")} />
          <span className={clsx("font-medium", trend.value >= 0 ? "text-primary" : "text-destructive")}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-subtle-foreground">{trend.label}</span>
        </div>
      )}

      {action && isAtLimit && (
        <div className="mt-5 border-t border-border pt-5">
          <Button variant="outline" size="sm" href={action.href} className="w-full">
            <ArrowUpRight className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}

interface MetricsGridProps {
  metrics: Array<{
    title: string
    value: string | number
    subtitle?: string
    icon: React.ReactNode
    trend?: { value: number; label: string }
    progress?: { current: number; max: number; label: string }
    isAtLimit?: boolean
    action?: { label: string; href: string }
  }>
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  )
}
