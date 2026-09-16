import type { BookingStatus } from "@prisma/client"

/**
 * Single source of truth for how a booking status is presented.
 *
 * Keys are the real `BookingStatus` enum members coming out of Prisma. Earlier
 * implementations keyed on ad-hoc lowercase/hyphenated strings ("checked-out",
 * "active", "draft") which never matched the enum, so every lookup fell through
 * to the same fallback and every booking rendered as "Pending".
 */
export interface BookingStatusStyle {
  /** Human-readable label. */
  label: string
  /** Complete border/background/text class set — no other colour class should
   *  be applied alongside these, to avoid Tailwind property conflicts. */
  badge: string
}

export const BOOKING_STATUS_STYLES: Record<BookingStatus, BookingStatusStyle> = {
  PENDING: {
    label: "Pending",
    badge: "border-amber-400/25 bg-amber-400/10 text-amber-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge: "border-[#36BFAE]/25 bg-[#36BFAE]/10 text-[#36BFAE]",
  },
  CHECKED_IN: {
    label: "Checked in",
    badge: "border-[#BA87FF]/25 bg-[#BA87FF]/10 text-[#BA87FF]",
  },
  CHECKED_OUT: {
    label: "Checked out",
    badge: "border-slate-500/25 bg-slate-500/10 text-slate-400",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "border-red-500/25 bg-red-500/10 text-red-400",
  },
}

const UNKNOWN: BookingStatusStyle = {
  label: "Unknown",
  badge: "border-white/10 bg-white/5 text-slate-300",
}

export function getBookingStatusStyle(status: BookingStatus): BookingStatusStyle {
  return BOOKING_STATUS_STYLES[status] ?? UNKNOWN
}
