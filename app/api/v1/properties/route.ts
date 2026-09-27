import { NextResponse } from "next/server"
import { verifyApiAccess } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/v1/properties
 * Returns a list of properties for the organization.
 * Requires Enterprise tier (hasApiAccess: true).
 */
export async function GET(req: Request) {
  const verification = await verifyApiAccess(req as any)

  if (!verification.ok) {
    return verification.response
  }

  const { membership } = verification
  const orgId = membership.user.orgId

  const properties = await prisma.property.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      address: true,
      currency: true,
      allowSharedBookings: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          units: true,
          bookings: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return NextResponse.json({ properties })
}