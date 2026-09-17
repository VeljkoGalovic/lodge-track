"use client"

import * as React from "react"
import type { BookingStatus } from "@prisma/client"
import { Building2, Calendar, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { BookingStatusBadge } from "@/components/dashboard/BookingStatusBadge"

import { useI18n } from "@/components/i18n/LocaleProvider"

export interface RecentProperty {
  id: string
  name: string
  bookingCount: number

  /** True when a booking currently covers this property. */
  occupied: boolean
}

export interface RecentBooking {
  id: string
  guestName: string
  propertyName: string
  /** Pre-formatted date range. */
  dates: string
  status: BookingStatus
  /** Pre-formatted amount, or null when no amount is recorded. */
  amount: string | null
}

interface BaseProps {
  emptyMessage?: string
  viewAllHref: string
  viewAllLabel: string
}

type RecentActivityTableProps =
  | (BaseProps & { type: "properties"; items: RecentProperty[] })
  | (BaseProps & { type: "bookings"; items: RecentBooking[] })

export function RecentActivityTable(props: RecentActivityTableProps) {
  const { t } = useI18n()
  const { emptyMessage, viewAllHref, viewAllLabel } = props
  const isProperties = props.type === "properties"
  const Icon = isProperties ? Building2 : Calendar
  const title = isProperties ? t.pages.dashboard.recent.recentProperties : t.pages.dashboard.recent.recentBookings

  if (props.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-10 text-center">
            <p className="text-sm text-subtle-foreground">{emptyMessage || (isProperties ? t.pages.dashboard.recent.noPropertiesYet : t.pages.dashboard.recent.noBookingsYet)}</p>
            <Button variant="glass" size="sm" href={viewAllHref} className="mt-4">
              {viewAllLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <Button variant="ghost" size="sm" href={viewAllHref}>
          {viewAllLabel} <TrendingUp className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            {isProperties ? (
              <TableRow>
                <TableHead>{t.pages.dashboard.recent.property}</TableHead>
                <TableHead>{t.pages.dashboard.recent.status}</TableHead>
                <TableHead className="text-right">{t.pages.dashboard.recent.bookings}</TableHead>
              </TableRow>
            ) : (
              <TableRow>
                <TableHead>{t.pages.dashboard.recent.guest}</TableHead>
                <TableHead>{t.pages.dashboard.recent.property}</TableHead>
                <TableHead>{t.pages.dashboard.recent.dates}</TableHead>
                <TableHead>{t.pages.dashboard.recent.status}</TableHead>
                <TableHead className="text-right">{t.pages.dashboard.recent.amount}</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {isProperties
              ? (props.items as RecentProperty[]).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                    <TableCell>
                      {item.occupied ? (
                        <Badge variant="success">{t.pages.dashboard.recent.occupied}</Badge>
                      ) : (
                        <Badge variant="secondary">{t.pages.dashboard.recent.available}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.bookingCount}</TableCell>
                  </TableRow>
                ))
              : (props.items as RecentBooking[]).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-foreground">{item.guestName}</TableCell>
                    <TableCell>{item.propertyName}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-subtle-foreground">
                      {item.dates}
                    </TableCell>
                    <TableCell>
                      <BookingStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.amount ?? "—"}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
