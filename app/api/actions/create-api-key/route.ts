import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { generateApiKey } from "@/lib/crypto"
import { guardApiRateLimit } from "@/lib/api-guard"

/**
 * POST /api/actions/create-api-key
 * Creates a new API key for the current organization.
 * Only available for Business tier (hasApiAccess: true).
 * Returns the raw key (only shown once) and the key metadata.
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
      organization: {
        include: {
          subscription: true,
        },
      },
    },
  })

  if (!user?.organization) {
    return NextResponse.json({ ok: false, error: "organization not found" }, { status: 404 })
  }

  const org = user.organization
  const subscription = org.subscription

  // Check API access
  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride ?? undefined
  )

  if (!features.hasApiAccess) {
    return NextResponse.json(
      { ok: false, error: "API access requires Business tier or higher" },
      { status: 403 }
    )
  }

  // Parse request body
  const body = await req.json()
  const { name, isLive = true } = body

  if (!name || typeof name !== "string") {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 })
  }

  // Generate the API key
  const { rawKey, keyHash, keyPrefix } = generateApiKey(isLive)

  // Create the API key record
  const key = await prisma.apiKey.create({
    data: {
      name,
      keyHash,
      keyPrefix,
      orgId: org.id,
      createdById: user.id,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  return NextResponse.json({ ok: true, rawKey, key })
}