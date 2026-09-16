"use client"

import * as React from "react"
import { Building2, Calendar, CheckCircle, Clock, XCircle, TrendingUp, DollarSign } from "lucide-react"
import { clsx } from "clsx"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"

interface RecentActivityTableProps {
  type: "properties" | "bookings"
  items: Array<{
    id: string
    name: string
    status: string
    date?: string
    value?: string
    propertyName?: string
  }>
  emptyMessage?: string
}

const statusStyles: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "checked-out": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "checked-in": "bg-slate-500/20 text-slate-400 border-slate-500/30",
  maintenance: "bg-red-500/20 text-red-400 border-red-500/30",
  draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
}

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle className="h-3 w-3" />,
  confirmed: <CheckCircle className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  "checked-out": <CheckCircle className="h-3 w-3" />,
  maintenance: <XCircle className="h-3 w-3" />,
  draft: <Clock className="h-3 w-3" />,
}

export function RecentActivityTable({ type, items, emptyMessage }: RecentActivityTableProps) {
  const isProperties = type === "properties"

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{emptyMessage || `No ${type} found`}</p>
          <Button 
            variant="outline" 
            href={isProperties ? "/dashboard/properties" : "/dashboard/bookings"} 
            className="mt-4">
            View all {type}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {isProperties ? <Building2 className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
          Recent {isProperties ? "Properties" : "Bookings"}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <a href={isProperties ? "/dashboard/properties" : "/dashboard/bookings"}>
            View all <TrendingUp className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Name</TableHead>
              {isProperties ? (
                <>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Property</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {isProperties ? (
                  <>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[item.status.toLowerCase()] || statusStyles.draft}>
                        {statusIcons[item.status.toLowerCase()] || statusIcons.draft}
                        <span className="ml-1 capitalize">{item.status.replace("-", " ")}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/dashboard/properties/${item.id}`}>Edit</a>
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{item.propertyName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[item.status.toLowerCase()] || statusStyles.pending}>
                        {statusIcons[item.status.toLowerCase()] || statusIcons.pending}
                        <span className="ml-1 capitalize">{item.status.replace("-", " ")}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.value ? <span className="flex items-center gap-1 justify-end"><DollarSign className="h-3 w-3" />{item.value}</span> : "—"}
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}