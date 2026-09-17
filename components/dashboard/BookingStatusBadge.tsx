"use client"

import { type ComponentType } from "react"
import type { BookingStatus } from "@prisma/client"
import { clsx } from "clsx"
import { CheckCircle, Clock, LogIn, LogOut, XCircle } from "lucide-react"
import { getBookingStatusStyle } from "@/lib/booking-status"
import { useI18n } from "@/components/i18n/LocaleProvider"

const STATUS_ICONS: Record<BookingStatus, ComponentType<{ className?: string }>> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  CHECKED_IN: LogIn,
  CHECKED_OUT: LogOut,
  CANCELLED: XCircle,
}

interface BookingStatusBadgeProps {
  status: BookingStatus
  showIcon?: boolean
  className?: string
}

export function BookingStatusBadge({ status, showIcon = true, className }: BookingStatusBadgeProps) {
  const { t } = useI18n()
  const { badge } = getBookingStatusStyle(status)
  const Icon = STATUS_ICONS[status]

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
        badge,
        className
      )}
    >
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {t.pages.bookings.statuses[status]}
    </span>
  )
}
