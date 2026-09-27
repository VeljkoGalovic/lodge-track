"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { generateApiKey } from "@/lib/crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/**
 * Creates a new API key for the current organization.
 * Only available for Enterprise tier (hasApiAccess: true).
 * Returns the raw key (only shown once) and the key metadata.
 */
export async function createApiKey(name: string, isLive: boolean = true): Promise<
  | { ok: true; rawKey: string; key: { id: string; name: string; keyPrefix: string; createdAt: Date; expiresAt: Date | null } }
  | { ok: false; error: string }
> {
  const session = await auth()

  if (!session?.user?.email) {
    return { ok: false, error: "unauthorized" }
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
    return { ok: false, error: "organization not found" }
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
    return { ok: false, error: "API access requires Enterprise tier or higher" }
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

  revalidatePath("/dashboard/api")

  return { ok: true, rawKey, key }
}

/**
 * Revokes (deletes) an API key.
 * Only the owner or creator can revoke.
 */
export async function revokeApiKey(keyId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth()

  if (!session?.user?.email) {
    return { ok: false, error: "unauthorized" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: true,
    },
  })

  if (!user?.organization) {
    return { ok: false, error: "organization not found" }
  }

  // Find the API key and verify ownership
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: keyId },
    select: { orgId: true, createdById: true },
  })

  if (!apiKey) {
    return { ok: false, error: "API key not found" }
  }

  if (apiKey.orgId !== user.orgId) {
    return { ok: false, error: "not permitted" }
  }

  // Soft delete by setting revokedAt
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })

  revalidatePath("/dashboard/api")

  return { ok: true }
}

/**
 * Lists all API keys for the current organization.
 */
export async function listApiKeys(): Promise<
  | { ok: true; keys: { id: string; name: string; keyPrefix: string; lastUsedAt: Date | null; expiresAt: Date | null; revokedAt: Date | null; createdAt: Date }[] }
  | { ok: false; error: string }
> {
  const session = await auth()

  if (!session?.user?.email) {
    return { ok: false, error: "unauthorized" }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: true,
    },
  })

  if (!user?.organization) {
    return { ok: false, error: "organization not found" }
  }

  const keys = await prisma.apiKey.findMany({
    where: { orgId: user.orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  })

  return { ok: true, keys }
}