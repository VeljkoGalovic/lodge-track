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

export function getOrgFeatures(
  tier: Tier,
  maxPropertiesOverride?: number | null,
  hasApiAccessOverride?: boolean | null
): OrgFeatures {
  const features = TIER_FEATURES[tier];
  return {
    tier,
    maxProperties: maxPropertiesOverride ?? TIER_LIMITS[tier],
    ...features,
    /**
     * The override wins in both directions: a beta user granted API access on
     * STARTER gets it, and a negotiation that withholds it on PRO keeps it off.
     * An explicit `false` is a decision rather than an absence, so `??` is the
     * right operator here — `||` would let a deliberate `false` fall through.
     */
    hasApiAccess: hasApiAccessOverride ?? features.hasApiAccess,
  };
}

/**
 * Badge classes for a tier, tuned to the dashboard's dark palette. Callers apply
 * these over a `Badge`, whose `className` wins through `cn`'s conflict merging.
 */
const TIER_BADGE_COLORS: Record<Tier, string> = {
  STARTER: "border-white/10 bg-white/5 text-slate-300",
  PRO: "border-[#36BFAE]/25 bg-[#36BFAE]/10 text-[#36BFAE]",
  ENTERPRISE: "border-[#BA87FF]/25 bg-[#BA87FF]/10 text-[#BA87FF]",
};

export function getTierBadgeColor(tier: Tier): string {
  return TIER_BADGE_COLORS[tier];
}

export function getTierLabel(tier: Tier): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}