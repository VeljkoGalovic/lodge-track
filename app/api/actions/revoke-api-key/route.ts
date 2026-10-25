import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { guardApiRateLimit } from "@/lib/api-guard"

/**
 * POST /api/actions/revoke-api-key
 * Revokes (soft deletes) an API key.
 * Only the owner or creator can revoke.
 */
export async function POST(req: NextRequest) {
  const rateLimited = await guardApiRateLimit(req)
  if (rateLimited) return rateLimited

  const session = await auth()

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: true,
    },
  })

  if (!user?.organization) {
    return NextResponse.json({ ok: false, error: "organization not found" }, { status: 404 })
  }

  // Parse request body
  const body = await req.json()
  const { keyId } = body

  if (!keyId || typeof keyId !== "string") {
    return NextResponse.json({ ok: false, error: "keyId is required" }, { status: 400 })
  }

  // Find the API key and verify ownership
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: keyId },
    select: { orgId: true, createdById: true },
  })

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "API key not found" }, { status: 404 })
  }

  if (apiKey.orgId !== user.orgId) {
    return NextResponse.json({ ok: false, error: "not permitted" }, { status: 403 })
  }

  // Soft delete by setting revokedAt
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}