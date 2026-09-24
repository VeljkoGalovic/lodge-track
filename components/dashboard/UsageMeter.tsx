"use client"

import { useI18n } from "@/components/i18n/LocaleProvider"
import * as React from "react"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { clsx } from "clsx"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/Button"
import { format } from "@/lib/i18n/dictionaries"

interface UsageMeterProps {
  /** Current usage count */
  used: number
  /** Maximum allowed (Infinity for unlimited) */
  max: number
  /** Label for the metric (e.g., "Properties") */
  label: string
  /** Optional action when at limit */
  action?: { label: string; href: string }
  /** Compact mode for sidebar */
  compact?: boolean
  /** Show percentage text */
  showPercentage?: boolean
}

export function UsageMeter({
  used,
  max,
  label,
  action,
  compact = false,
  showPercentage = true,
}: UsageMeterProps) {
  const { t } = useI18n()

  const isUnlimited = max === Infinity
  const isAtLimit = !isUnlimited && used >= max
  const isNearLimit = !isUnlimited && used >= max * 0.8
  const percentage = isUnlimited ? 0 : Math.min(100, (used / max) * 100)

  // Status color based on usage
  const getProgressColor = () => {
    if (isAtLimit) return "bg-destructive"
    if (isNearLimit) return "bg-warning"
    return "bg-primary"
  }

  const getStatusText = () => {
    if (isAtLimit) return t.pages.dashboard.metrics.atLimit
    if (isNearLimit) return t.pages.dashboard.metrics.nearLimit
    return t.pages.dashboard.metrics.usage
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-subtle-foreground">{label}</span>
          <span className={clsx("font-mono font-medium", isAtLimit ? "text-destructive" : "text-muted-foreground")}>
            {isUnlimited
              ? format(t.pages.dashboard.metrics.unlimitedUsage, { used: String(used) })
              : format(t.pages.dashboard.metrics.ofLimit, { used: String(used), limit: String(max) })}
          </span>
        </div>
        <Progress
          value={isUnlimited ? 0 : percentage}
          className={clsx("h-1.5", getProgressColor())}
        />
        {isAtLimit && action && (
          <Button variant="ghost" size="sm" href={action.href} className="w-full justify-start gap-1 text-xs p-1 text-destructive hover:bg-destructive/10">
            <AlertTriangle className="h-3 w-3" />
            {action.label}
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-subtle-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {isUnlimited
              ? format(t.pages.dashboard.metrics.unlimitedUsage, { used: String(used) })
              : format(t.pages.dashboard.metrics.ofLimit, { used: String(used), limit: String(max) })}
          </p>
        </div>
        <span
          className={clsx(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isAtLimit ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}
        >
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-1.5">
        <Progress
          value={isUnlimited ? 0 : percentage}
          className={clsx("h-3", getProgressColor())}
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-subtle-foreground">
            {showPercentage && !isUnlimited && `${Math.round(percentage)}%`}
          </span>
          <span className="text-muted-foreground">
            {isUnlimited
              ? t.pages.dashboard.metrics.unlimited
              : isAtLimit
                ? t.pages.dashboard.metrics.atLimit
                : isNearLimit
                  ? t.pages.dashboard.metrics.nearLimit
                  : t.pages.dashboard.metrics.usage}
          </span>
        </div>
      </div>

      {isAtLimit && action && (
        <Button variant="outline" size="sm" href={action.href} className="w-full">
          <AlertTriangle className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  )
}