import { prisma } from "@/lib/prisma"
import type { BusyInterval } from "@/lib/availability"

/**
 * Every unit in the organization, flat, each naming its own property.
 *
 * Flat rather than nested so the booking form can filter to whichever property
 * is currently selected in the browser. Deliberately *not* a `"use server"`
 * module: this takes an `orgId` argument, which as a server action would be a
 * client-callable endpoint trusting the caller to name the tenant. It is a
 * server-only helper, imported by server components that already resolved the
 * organization from the session.
 */
export async function unitsForOrganization(orgId: string) {
  return prisma.propertyUnit.findMany({
    where: { orgId },
    orderBy: [{ name: "asc" }],
    select: { id: true, propertyId: true, name: true, kind: true },
  })
}

/**
 * The stays that occupy something, reduced to which unit and when.
 *
 * Scoped by `orgId` through the property relation, so one organization's
 * calendar can never make another's units look busy. Cancelled bookings are
 * excluded for the same reason `findConflicts` ignores them: a cancelled stay
 * releases its slot.
 *
 * Only three columns are selected, and no guest name. The picker's question is
 * "is this unit free on these dates", which is answerable from the dates alone —
 * shipping names to the browser would put other guests' details in a payload
 * nothing on the page displays.
 *
 * `excludeBookingId` drops the booking currently being edited. Without it the
 * unit that booking already holds would be marked unavailable on its own edit
 * form, which is both wrong and impossible to work around.
 */
export async function unitBusyIntervals(
  orgId: string,
  excludeBookingId?: string
): Promise<BusyInterval[]> {
  return prisma.booking.findMany({
    where: {
      property: { orgId },
      status: { not: "CANCELLED" },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
    },
    select: { unitId: true, startDate: true, endDate: true },
  })
}
