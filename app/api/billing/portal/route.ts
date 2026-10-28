import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canAdminister } from "@/lib/authorization"
import { createCustomerPortalUrl } from "@/lib/billing"
import { absoluteUrl } from "@/lib/origin"
import { guardApiRateLimit } from "@/lib/api-guard"

export async function GET(request: Request) {
  const rateLimited = await guardApiRateLimit(request)
  if (rateLimited) return rateLimited

  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.redirect((await absoluteUrl("/signin")))
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  })
  if (!user) {
    return NextResponse.redirect((await absoluteUrl("/signin")))
  }

  if (!canAdminister(user.role)) {
    return NextResponse.redirect((await absoluteUrl("/dashboard/billing?error=not_owner")))
  }

  const portalUrl = await createCustomerPortalUrl(user.orgId)
  if (!portalUrl) {
    return NextResponse.redirect((await absoluteUrl("/dashboard/billing?error=portal_unavailable")))
  }

  return NextResponse.redirect(portalUrl)
}