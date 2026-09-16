import { SubscriptionTier } from "@prisma/client";

export type Tier = SubscriptionTier;

export interface OrgFeatures {
  tier: Tier;
  maxProperties: number;
  hasAdvancedAnalytics: boolean;
  hasTeamRoles: boolean;
  hasApiAccess: boolean;
}

const TIER_LIMITS: Record<Tier, number> = {
  STARTER: 3,
  PRO: 15,
  ENTERPRISE: Infinity,
};

const TIER_FEATURES: Record<Tier, Omit<OrgFeatures, "tier" | "maxProperties">> = {
  STARTER: {
    hasAdvancedAnalytics: false,
    hasTeamRoles: false,
    hasApiAccess: false,
  },
  PRO: {
    hasAdvancedAnalytics: true,
    hasTeamRoles: true,
    hasApiAccess: true,
  },
  ENTERPRISE: {
    hasAdvancedAnalytics: true,
    hasTeamRoles: true,
    hasApiAccess: true,
  },
};

export function getOrgFeatures(tier: Tier, maxPropertiesOverride?: number | null): OrgFeatures {
  return {
    tier,
    maxProperties: maxPropertiesOverride ?? TIER_LIMITS[tier],
    ...TIER_FEATURES[tier],
  };
}

export function getTierBadgeColor(tier: Tier): string {
  switch (tier) {
    case "STARTER":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "PRO":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "ENTERPRISE":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  }
}

export function getTierLabel(tier: Tier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}