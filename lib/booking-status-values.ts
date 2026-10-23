// lib/booking-status-values.ts
import type { BookingStatus } from "@prisma/client"

/**
 * The booking statuses as plain string values, safe to import from client
 * components. Importing the enum itself from "@prisma/client" would pull the
 * whole generated Prisma runtime into the browser bundle — which does not even
 * exist on builds that have not run `prisma generate` first (the deploy error
 * `Can't resolve '.prisma/client/index-browser'` was exactly that).
 *
 * The list mirrors `enum BookingStatus` in prisma/schema.prisma. The guard
 * below turns any drift between the schema enum and this list into a
 * compile-time error in either direction.
 */
export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
] as const

export type BookingStatusValue = (typeof BOOKING_STATUSES)[number]

/** True only when the list above exactly equals the schema enum, both ways. */
type MirrorsSchemaEnum =
  BookingStatus extends BookingStatusValue
    ? BookingStatusValue extends BookingStatus
      ? true
      : never
    : never

export const BOOKING_STATUSES_MIRROR_SCHEMA: MirrorsSchemaEnum = true
