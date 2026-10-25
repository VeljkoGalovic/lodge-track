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
    return NextResponse.redirect(absoluteUrl("/signin", request))
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  })
  if (!user) {
    return NextResponse.redirect(absoluteUrl("/signin", request))
  }

  if (!canAdminister(user.role)) {
    return NextResponse.redirect(absoluteUrl("/dashboard/billing?error=not_owner", request))
  }

  const portalUrl = await createCustomerPortalUrl(user.orgId)
  if (!portalUrl) {
    return NextResponse.redirect(absoluteUrl("/dashboard/billing?error=portal_unavailable", request))
  }

  return NextResponse.redirect(portalUrl)
}