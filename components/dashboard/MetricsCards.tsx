"use client"

import * as React from "react"
import { Building2, Calendar, DollarSign, TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react"
import { clsx } from "clsx"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

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
    <Card className={clsx("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}

        {progress && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{progress.label}</span>
              <span className="font-medium">
                {progress.current} / {progress.max === Infinity ? "∞" : progress.max}
              </span>
            </div>
            <Progress value={progress.max === Infinity ? 0 : Math.min(100, (progress.current / progress.max) * 100)} className="h-2" />
            {isAtLimit && (
              <div className="flex items-center gap-2 text-xs text-orange-500">
                <AlertCircle className="h-3 w-3" />
                <span>Limit reached</span>
              </div>
            )}
          </div>
        )}

        {trend && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <TrendingUp className={clsx("h-4 w-4", trend.value >= 0 ? "text-green-500" : "text-red-500")} />
            <span className={clsx("font-medium", trend.value >= 0 ? "text-green-500" : "text-red-500")}>
              {trend.value >= 0 ? "+" : ""}{trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}

        {action && isAtLimit && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" asChild className="w-full">
              <a href={action.href}>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                {action.label}
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  )
}