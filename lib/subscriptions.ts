import { prisma } from "./prisma";
import { SubscriptionTier } from "@prisma/client";

const TIER_PROPERTY_LIMITS: Record<SubscriptionTier, number> = {
  STARTER: 3,
  PRO: 15,
  ENTERPRISE: Infinity,
};

export async function canAddProperty(orgId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      subscription: true,
      _count: { select: { properties: true } },
    },
  });

  if (!org) return false;

  const sub = org.subscription;
  if (sub?.isLifetimeFree) return true;

  const maxAllowed =
    sub?.maxPropertiesOverride ??
    (sub ? TIER_PROPERTY_LIMITS[sub.tier] : TIER_PROPERTY_LIMITS.STARTER);

  return org._count.properties < maxAllowed;
}