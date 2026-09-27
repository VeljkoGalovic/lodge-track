import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { verifyApiKey } from "@/lib/crypto"

/**
 * Verifies that the organization has API access (Business tier).
 * Returns the membership object if valid, or a NextResponse with 403 if not.
 * Note: Internal tier is "BUSINESS" but user-facing is "Business".
 */
export async function verifyApiAccess(req: NextRequest): Promise<
  | { ok: true; membership: { user: { id: string; orgId: string }; organization: { id: string; subscription: { tier: string } | null } } }
  | { ok: false; response: NextResponse }
> {
  const session = await auth()

  if (!session?.user?.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
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
    return {
      ok: false,
      response: NextResponse.json({ error: "organization not found" }, { status: 404 })
    }
  }

  const org = user.organization
  const subscription = org.subscription

  // Get organization features to check API access
  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride ?? undefined
  )

  if (!features.hasApiAccess) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "forbidden",
          message: "API access requires Business tier or higher",
          requiredTier: "BUSINESS",
          currentTier: features.tier
        },
        { status: 403 }
      )
    }
  }

  return {
    ok: true,
    membership: {
      user: { id: user.id, orgId: user.orgId },
      organization: { id: org.id, subscription: subscription ? { tier: subscription.tier } : null }
    }
  }
}

/**
 * Verifies an API key from the Authorization header (Bearer token).
 * Returns the organization if valid, or a NextResponse with 401/403 if not.
 * Note: Internal tier is "BUSINESS" but user-facing is "Business".
 */
export async function verifyApiKeyAuth(req: NextRequest): Promise<
  | { ok: true; organization: { id: string; subscription: { tier: string } | null } }
  | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "Missing or invalid Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      )
    }
  }

  const rawKey = authHeader.slice(7) // Remove "Bearer "
  const keyPrefix = rawKey.slice(0, 16)

  // Find the API key by prefix
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyPrefix },
    include: {
      organization: {
        include: {
          subscription: true,
        },
      },
    },
  })

  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "Invalid API key" },
        { status: 401 }
      )
    }
  }

  // Check if key is revoked
  if (apiKey.revokedAt) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "API key has been revoked" },
        { status: 401 }
      )
    }
  }

  // Check if key is expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "API key has expired" },
        { status: 401 }
      )
    }
  }

  // Verify the key hash
  if (!verifyApiKey(rawKey, apiKey.keyHash)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "unauthorized", message: "Invalid API key" },
        { status: 401 }
      )
    }
  }

  // Check organization has API access
  const subscription = apiKey.organization.subscription
  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined,
    subscription?.hasApiAccessOverride ?? undefined
  )

  if (!features.hasApiAccess) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "forbidden",
          message: "API access requires Business tier or higher",
          requiredTier: "BUSINESS",
          currentTier: features.tier
        },
        { status: 403 }
      )
    }
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return {
    ok: true,
    organization: { id: apiKey.organization.id, subscription: subscription ? { tier: subscription.tier } : null }
  }
}

/**
 * Unified verification that accepts either session auth or API key auth.
 * Use this for endpoints that should work with both authentication methods.
 * Note: Internal tier is "BUSINESS" but user-facing is "Business".
 */
export async function verifyAnyAuth(req: NextRequest): Promise<
  | { ok: true; membership: { user?: { id: string; orgId: string }; organization: { id: string; subscription: { tier: string } | null } } }
  | { ok: false; response: NextResponse }
> {
  // Try API key auth first
  const apiKeyResult = await verifyApiKeyAuth(req)
  if (apiKeyResult.ok) {
    return {
      ok: true,
      membership: {
        organization: apiKeyResult.organization
      }
    }
  }

  // Fall back to session auth
  return verifyApiAccess(req)
}